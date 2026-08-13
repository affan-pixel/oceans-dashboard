import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toMatchDTO, toMatchResultDTO, toExternalProspectDTO } from '@/lib/mappers'

export async function GET() {
  try {
    const matches = await db.match.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        jobDescription: { select: { title: true, company: true } },
        results: {
          include: {
            candidate: { select: { name: true, headline: true, location: true } },
          },
          orderBy: { rank: 'asc' },
        },
        externalProspects: { orderBy: { score: 'desc' } },
      },
    })

    return NextResponse.json(
      matches.map((m) =>
        toMatchDTO({
          ...m,
          results: m.results.map(toMatchResultDTO),
          externalProspects: m.externalProspects.map(toExternalProspectDTO),
        })
      )
    )
  } catch (err) {
    console.error('[matches GET] error', err)
    return NextResponse.json({ error: 'Failed to load matches' }, { status: 500 })
  }
}
