import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toMatchDTO, toMatchResultDTO, toExternalProspectDTO } from '@/lib/mappers'
import { matchCandidates, computeMatchType, computePriceRange, type CandidateForMatch } from '@/lib/ai'
import type { StructuredJD } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

// Quick title-based seniority inference for pricing (the LLM categorizeJob is
// more accurate but runs on scraped jobs, not JD titles).
function inferSeniority(title: string): string {
  const t = title.toLowerCase()
  if (/(vp|chief|cto|ceo|coo|cfo|head of|director)/.test(t)) return 'exec'
  if (/(lead|principal|staff)/.test(t)) return 'lead'
  if (/(senior|sr\.?)/.test(t)) return 'senior'
  if (/(junior|jr\.?|intern|entry)/.test(t)) return 'junior'
  return 'mid'
}

function parseArray(v: unknown): string[] {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : []
  } catch {
    return []
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const jd = await db.jobDescription.findUnique({ where: { id } })
    if (!jd) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Load all active candidates
    const candidates = await db.candidate.findMany({
      where: { status: 'active' },
    })

    // Build the structured JD expected by the AI matcher
    const structuredJD: StructuredJD = {
      title: jd.title,
      outcomes: parseArray(jd.outcomes),
      mandatorySkills: parseArray(jd.mandatorySkills),
      niceToHave: parseArray(jd.niceToHave),
      context: jd.context,
      signals: parseArray(jd.signals),
      searchBlob: jd.searchBlob,
    }

    // Build CandidateForMatch objects
    const candidatesForMatch: CandidateForMatch[] = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      headline: c.headline,
      location: c.location,
      outcomes: parseArray(c.outcomes),
      skills: parseArray(c.skills),
      tools: parseArray(c.tools),
      companyStages: parseArray(c.companyStages),
      rolesFit: parseArray(c.rolesFit),
      workContext: c.workContext,
    }))

    // Run matching
    const result = await matchCandidates(structuredJD, candidatesForMatch)

    // Determine internal match strength:
    //   strong   — top candidate scored >= 80
    //   moderate — top candidate scored 60-79
    //   weak     — top candidate scored < 60 (or no candidates ranked)
    const topScore = result.ranked.length > 0 ? result.ranked[0].score : 0
    const internalStrength: 'strong' | 'moderate' | 'weak' =
      topScore >= 80 ? 'strong' : topScore >= 60 ? 'moderate' : 'weak'

    // Build candidate lookup (skip candidates not in our DB — they shouldn't be, but defensive)
    const candidateById = new Map(candidates.map((c) => [c.id, c]))

    // Create Match record + MatchResults in a transaction
    const match = await db.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          jobDescriptionId: jd.id,
          status: 'done',
          summary: result.summary,
          internalStrength,
          externalScrapeStatus: 'none',
        },
      })

      const validRanked = result.ranked.filter((r) => candidateById.has(r.candidateId))

      if (validRanked.length > 0) {
        await tx.matchResult.createMany({
          data: validRanked.map((r, idx) => {
            const cand = candidateById.get(r.candidateId)!
            const matchType = computeMatchType({ candidatePool: cand.pool })
            const priceRangeUsd = computePriceRange({
              seniority: inferSeniority(jd.title),
              matchType,
            })
            return {
              matchId: created.id,
              candidateId: r.candidateId,
              score: r.score,
              reasoning: r.reasoning,
              strengths: JSON.stringify(r.strengths),
              gaps: JSON.stringify(r.gaps),
              rank: idx + 1,
              matchType,
              priceRangeUsd,
              fitStatus: 'pending',
            }
          }),
        })
      }

      // Update JD status to 'matched'
      await tx.jobDescription.update({
        where: { id: jd.id },
        data: { status: 'matched' },
      })

      // Activity
      await tx.activity.create({
        data: {
          agent: 'talent_matcher',
          type: 'match_completed',
          message: `Internal match for "${jd.title}": ${validRanked.length} ranked · strength ${internalStrength}.`,
        },
      })

      return created
    })

    // Reload with relations for response
    const fullMatch = await db.match.findUnique({
      where: { id: match.id },
      include: {
        jobDescription: { select: { title: true, company: true } },
        results: {
          include: {
            candidate: { select: { name: true, headline: true, location: true, pool: true, redactedProfile: true } },
          },
          orderBy: { rank: 'asc' },
        },
        externalProspects: { orderBy: { score: 'desc' } },
      },
    })

    if (!fullMatch) {
      return NextResponse.json({ error: 'Match not found after creation' }, { status: 500 })
    }

    const matchDTO = toMatchDTO({
      ...fullMatch,
      results: fullMatch.results.map(toMatchResultDTO),
      externalProspects: fullMatch.externalProspects.map(toExternalProspectDTO),
    })

    return NextResponse.json(matchDTO, { status: 201 })
  } catch (err) {
    console.error('[jd match] error', err)
    return NextResponse.json({ error: 'Failed to run match' }, { status: 500 })
  }
}
