import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

// GET /api/job-targets/[id]/jobs — list scraped jobs for an ICP
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const jobs = await db.scrapedJob.findMany({
      where: { jobTargetId: id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(jobs.map(toScrapedJobDTO))
  } catch (err) {
    console.error('[icp jobs GET] error', err)
    return NextResponse.json({ error: 'Failed to load scraped jobs' }, { status: 500 })
  }
}
