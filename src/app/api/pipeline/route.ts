import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const where = status && status !== 'all' ? { status } : { NOT: { status: 'dismissed' } }
    const jobs = await db.scrapedJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { jobTarget: { select: { name: true } } },
    })
    const dtos = jobs.map((j) => ({ ...toScrapedJobDTO(j), icpName: j.jobTarget.name }))
    return NextResponse.json(dtos)
  } catch (err) {
    console.error('[pipeline GET] error', err)
    return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })
  }
}
