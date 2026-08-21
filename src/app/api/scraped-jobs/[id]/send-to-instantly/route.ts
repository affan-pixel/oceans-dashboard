import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'
import { env } from '@/lib/env'
import { listInstantlyCampaigns, addLeadToInstantlyCampaign } from '@/lib/integrations/instantly'

type Params = { params: Promise<{ id: string }> }

function resolveInstantlyKey(): string | null {
  return env.instantlyApiKey ?? null
}

// GET — list Instantly campaigns (for the UI picker). Returns empty when no key.
export async function GET() {
  const key = resolveInstantlyKey()
  if (!key) return NextResponse.json({ campaigns: [], configured: false })
  try {
    const campaigns = await listInstantlyCampaigns(key)
    return NextResponse.json({ campaigns, configured: true })
  } catch (err) {
    return NextResponse.json(
      { campaigns: [], configured: true, error: err instanceof Error ? err.message : 'Instantly unreachable' },
      { status: 200 }
    )
  }
}

// POST /api/scraped-jobs/[id]/send-to-instantly
// Agent 1 outreach: push this job's decision maker into an Instantly email sequence.
// Body: { email, campaignId?, firstName?, lastName? }
// - No key → returns the drafted lead payload for manual add.
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? '').trim()
    const campaignId = String(body.campaignId ?? env.instantlyCampaignId ?? '').trim()

    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!email) return NextResponse.json({ error: 'email is required (the decision maker\'s address)' }, { status: 400 })

    // Personalization variables the Instantly sequence can use: {{company}} {{role}} {{signal}}
    const personalization: Record<string, string> = {
      company: job.company,
      role: job.title,
      signal: job.ageBand === 'stuck' || job.ageBand === 'quarter'
        ? `this role has been open for months`
        : `the open ${job.title} role`,
      link: job.sourceUrl ?? '',
      seniority: job.seniority ?? '',
    }

    const key = resolveInstantlyKey()
    if (!key || !campaignId) {
      await db.activity.create({
        data: {
          agent: 'customer_finder',
          type: 'instantly_draft',
          message: `Instantly lead drafted (no key/campaign) — ${job.dmName ?? email} re: ${job.title} @ ${job.company}.`,
        },
      })
      return NextResponse.json({
        ok: false,
        drafted: true,
        email,
        personalization,
        message: !key
          ? 'No INSTANTLY_API_KEY set — lead drafted. Add the key + INSTANTLY_CAMPAIGN_ID to send for real.'
          : 'No campaign selected — set INSTANTLY_CAMPAIGN_ID or pass campaignId.',
      })
    }

    const dmName = job.dmName ?? ''
    const result = await addLeadToInstantlyCampaign({
      apiKey: key,
      campaignId,
      email,
      firstName: String(body.firstName ?? dmName.split(' ')[0] ?? ''),
      lastName: String(body.lastName ?? dmName.split(' ').slice(1).join(' ') ?? ''),
      company: job.company,
      personalization,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 502 })
    }

    const updated = await db.scrapedJob.update({
      where: { id },
      data: { status: 'outreach_sent', outreachStatus: 'sent', outreachSentAt: new Date() },
    })
    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'instantly_sent',
        message: `Lead pushed to Instantly — ${dmName || email} re: ${job.title} @ ${job.company}.`,
      },
    })

    return NextResponse.json({ ok: true, ...result, job: toScrapedJobDTO(updated) })
  } catch (err) {
    console.error('[send-to-instantly] error', err)
    return NextResponse.json({ error: 'Failed to send to Instantly' }, { status: 500 })
  }
}
