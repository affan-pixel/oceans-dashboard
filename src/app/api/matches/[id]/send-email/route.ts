import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

type Params = { params: Promise<{ id: string }> }

// POST /api/matches/[id]/send-email
// Step 9: trigger email to the prospect (via HubSpot).
// Body: { to, subject, body }
// - If HUBSPOT_ACCESS_TOKEN is set: sends a real email via the HubSpot single-send API.
// - If not: returns the drafted email for the team to send manually.
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const to = String(body.to ?? '').trim()
    const subject = String(body.subject ?? '').trim()
    const emailBody = String(body.body ?? '').trim()

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
    }

    const match = await db.match.findUnique({
      where: { id },
      include: { jobDescription: { select: { title: true, company: true } } },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    // No HubSpot token → return the drafted email.
    if (!env.hubspotAccessToken) {
      await db.activity.create({
        data: {
          agent: 'customer_finder',
          type: 'email_draft',
          message: `Prospect email drafted (no HubSpot token) — ${subject} to ${to}.`,
        },
      })
      return NextResponse.json({
        ok: false,
        drafted: true,
        to,
        subject,
        body: emailBody,
        message: 'No HUBSPOT_ACCESS_TOKEN set — email drafted for manual send.',
      })
    }

    // Real HubSpot send via the transactional single-send email API.
    const res = await fetch('https://api.hubapi.com/marketing/v3/transactional/single-email/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.hubspotAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { to: to.includes('@') ? to : undefined, subject, html: `<pre>${emailBody}</pre>` },
        contactProperties: [{ name: 'email', value: to }],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({ error: `HubSpot send failed (HTTP ${res.status}): ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const data = (await res.json()) as { message?: { id?: string } }
    await db.activity.create({
      data: { agent: 'customer_finder', type: 'email_sent', message: `Prospect email sent via HubSpot — ${subject} to ${to}.` },
    })

    return NextResponse.json({ ok: true, messageId: data.message?.id })
  } catch (err) {
    console.error('[send-email] error', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
