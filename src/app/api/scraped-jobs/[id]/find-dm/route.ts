import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'
import { findDecisionMaker } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const suggestion = await findDecisionMaker({
      company: job.company,
      roleTitle: job.title,
      location: job.location,
    })

    const updated = await db.scrapedJob.update({
      where: { id },
      data: {
        dmTitle: suggestion.dmTitle,
        dmName: suggestion.dmName,
        dmLinkedinUrl: suggestion.dmLinkedinUrl,
        dmNotes: suggestion.dmNotes,
        dmIsSample: suggestion.isSample === true,
        status: job.status === 'new' ? 'dm_found' : job.status,
      },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'dm_found',
        message: suggestion.isSample
          ? `Decision maker (sample) for ${job.title} @ ${job.company}: ${suggestion.dmTitle}.`
          : `Decision maker found for ${job.title} @ ${job.company}: ${suggestion.dmTitle}.`,
      },
    })

    return NextResponse.json(toScrapedJobDTO(updated))
  } catch (err) {
    console.error('[find-dm] error', err)
    return NextResponse.json({ error: 'Failed to find decision maker' }, { status: 500 })
  }
}
