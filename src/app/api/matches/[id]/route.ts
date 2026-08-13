import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toMatchDTO, toMatchResultDTO, toExternalProspectDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const match = await db.match.findUnique({
      where: { id },
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
    if (!match) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(
      toMatchDTO({
        ...match,
        results: match.results.map(toMatchResultDTO),
        externalProspects: match.externalProspects.map(toExternalProspectDTO),
      })
    )
  } catch (err) {
    console.error('[match GET] error', err)
    return NextResponse.json({ error: 'Failed to load match' }, { status: 500 })
  }
}
