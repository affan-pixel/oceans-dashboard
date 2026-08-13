import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'
import { draftOutreachEmail } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? 'draft').toLowerCase()

    if (action === 'draft') {
      const email = await draftOutreachEmail({
        companyName: job.company,
        industry: null,
        stage: null,
        signal: `Posted: ${job.title}`,
        role: job.title,
      })
      const updated = await db.scrapedJob.update({
        where: { id },
        data: { outreachContent: email, outreachStatus: 'drafted' },
      })
      return NextResponse.json(toScrapedJobDTO(updated))
    }

    if (action === 'send') {
      const updated = await db.scrapedJob.update({
        where: { id },
        data: {
          outreachStatus: 'sent',
          outreachSentAt: new Date(),
          status: job.status === 'dm_found' ? 'outreach_sent' : job.status,
        },
      })
      await db.activity.create({
        data: {
          agent: 'customer_finder',
          type: 'outreach_sent',
          message: `Outreach sent to ${job.dmTitle || 'decision maker'} at ${job.company} for ${job.title}.`,
        },
      })
      return NextResponse.json(toScrapedJobDTO(updated))
    }

    if (action === 'reply') {
      const updated = await db.scrapedJob.update({
        where: { id },
        data: { outreachStatus: 'replied', status: 'replied' },
      })
      return NextResponse.json(toScrapedJobDTO(updated))
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[outreach] error', err)
    return NextResponse.json({ error: 'Failed to process outreach' }, { status: 500 })
  }
}
