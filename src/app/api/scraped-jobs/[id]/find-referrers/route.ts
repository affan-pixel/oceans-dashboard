import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'
import { findReferrers } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

// Finds people who can recommend Oceans to this company for a warm intro —
// investors, advisors, accelerator partners, prior colleagues of the decision maker.
// Runs independently of find-dm so either can be triggered on its own.
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const referrers = await findReferrers({
      company: job.company,
      dmName: job.dmName,
      dmTitle: job.dmTitle,
    })

    const updated = await db.scrapedJob.update({
      where: { id },
      data: {
        referrers: JSON.stringify(referrers),
      },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'referrers_found',
        message:
          referrers.length > 0
            ? `${referrers.length} warm-intro referrer${referrers.length === 1 ? '' : 's'} found for ${job.company}.`
            : `No referrers found for ${job.company}.`,
      },
    })

    return NextResponse.json(toScrapedJobDTO(updated))
  } catch (err) {
    console.error('[find-referrers] error', err)
    return NextResponse.json({ error: 'Failed to find referrers' }, { status: 500 })
  }
}
