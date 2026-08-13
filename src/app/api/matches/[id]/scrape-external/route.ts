import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toMatchDTO, toMatchResultDTO, toExternalProspectDTO } from '@/lib/mappers'
import { scrapeExternalProspects } from '@/lib/ai'
import type { StructuredJD } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

function parseArray(v: unknown): string[] {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : []
  } catch {
    return []
  }
}

// POST /api/matches/[id]/scrape-external
// Step 4 (supplement) of the Talent Matcher flow: when internal match is weak/moderate,
// simulate scraping LinkedIn / Indeed / Wellfound for external prospects.
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const match = await db.match.findUnique({
      where: { id },
      include: { jobDescription: true },
    })
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const strength = (match.internalStrength ?? 'weak') as 'weak' | 'moderate'
    if (strength === 'strong') {
      return NextResponse.json(
        { error: 'Internal match is already strong — external scrape not needed.' },
        { status: 400 }
      )
    }

    await db.match.update({
      where: { id },
      data: { externalScrapeStatus: 'requested' },
    })

    const jd = match.jobDescription
    const structuredJD: StructuredJD = {
      title: jd.title,
      outcomes: parseArray(jd.outcomes),
      mandatorySkills: parseArray(jd.mandatorySkills),
      niceToHave: parseArray(jd.niceToHave),
      context: jd.context,
      signals: parseArray(jd.signals),
      searchBlob: jd.searchBlob,
    }

    const prospects = await scrapeExternalProspects(structuredJD, strength)

    await db.externalProspect.deleteMany({ where: { matchId: id } })
    if (prospects.length > 0) {
      await db.externalProspect.createMany({
        data: prospects.map((p) => ({
          matchId: id,
          name: p.name,
          headline: p.headline,
          location: p.location,
          sourceUrl: p.sourceUrl,
          sourcePlatform: p.sourcePlatform,
          snippet: p.snippet,
          fitReason: p.fitReason,
          score: p.score,
          status: 'new',
        })),
      })
    }

    await db.match.update({
      where: { id },
      data: { externalScrapeStatus: 'done' },
    })

    await db.activity.create({
      data: {
        agent: 'talent_matcher',
        type: 'external_scrape',
        message: `External scrape for "${jd.title}": ${prospects.length} prospects surfaced.`,
      },
    })

    const fullMatch = await db.match.findUnique({
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
    if (!fullMatch) {
      return NextResponse.json({ error: 'Match not found after scrape' }, { status: 500 })
    }

    return NextResponse.json(
      toMatchDTO({
        ...fullMatch,
        results: fullMatch.results.map(toMatchResultDTO),
        externalProspects: fullMatch.externalProspects.map(toExternalProspectDTO),
      })
    )
  } catch (err) {
    console.error('[scrape-external] error', err)
    return NextResponse.json({ error: 'Failed to scrape external prospects' }, { status: 500 })
  }
}
