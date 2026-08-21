import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toScrapedJobDTO } from '@/lib/mappers'
import { computeAgeBand, computeLeadScore } from '@/lib/agent1'
import { findJobPoster } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

const JINA_READER_BASE = 'https://r.jina.ai/'

// Heuristics for a dead posting when the LLM isn't available.
const DEAD_PATTERNS = [
  /no longer accepting applications/i,
  /no longer accepting/i,
  /position has been filled/i,
  /job is (no longer|closed)/i,
  /this job is (expired|unavailable)/i,
  /page not found/i,
  /404/i,
]

/**
 * POST /api/scraped-jobs/[id]/recheck
 * Agent 1 persistence check: is this job STILL posted?
 * - Fetches the posting URL (Jina Reader).
 * - Dead page / dead-language → stillLive=false (lead goes cold).
 * - Still up → lastSeenAt=now, timesSeen++, ageBand recomputed
 *   (fresh → week → month → quarter → stuck). Stuck = 3+ months = hot lead.
 * - Optionally detects who posted the role (HR/founder/CEO) if not known.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!job.stillLive) {
      return NextResponse.json({ error: 'Job already marked as no longer live' }, { status: 400 })
    }

    // 1) Fetch the posting.
    let pageText = ''
    let fetchOk = false
    if (job.sourceUrl) {
      try {
        const res = await fetch(`${JINA_READER_BASE}${job.sourceUrl}`, {
          headers: { 'X-Return-Format': 'markdown', Accept: 'text/markdown' },
          signal: AbortSignal.timeout(25_000),
        })
        if (res.ok) {
          pageText = (await res.text()).slice(0, 8000)
          fetchOk = true
        }
      } catch {
        fetchOk = false
      }
    }

    // 2) Decide live vs dead. Unfetchable → inconclusive: keep live, note it.
    let stillLive = true
    let note = 'Rechecked — page unreachable (LinkedIn auth wall is common); kept as live.'
    if (fetchOk) {
      const deadMatch = DEAD_PATTERNS.some((p) => p.test(pageText))
      if (deadMatch) {
        stillLive = false
        note = 'Rechecked — posting appears closed.'
      } else if (pageText.length < 300) {
        note = 'Rechecked — page nearly empty; kept as live (inconclusive).'
      } else {
        note = 'Rechecked — posting is still up.'
      }
    }

    // 3) Update age tracking for survivors.
    const now = new Date()
    const firstSeen = job.firstSeenAt ?? job.createdAt
    const ageBand = stillLive ? computeAgeBand(firstSeen, now) : job.ageBand
    const timesSeen = stillLive ? (job.timesSeen ?? 1) + 1 : job.timesSeen

    // 4) Poster detection (once): who at the company posted this role?
    let posterData: Partial<{ postedByName: string; postedByTitle: string; postedByUrl: string; postedByKind: string }> = {}
    if (stillLive && !job.postedByName && fetchOk && pageText.length > 300) {
      try {
        const poster = await findJobPoster({ company: job.company, roleTitle: job.title, pageText })
        if (poster.name) posterData = poster
      } catch {
        // LLM unavailable — skip poster detection silently.
      }
    }

    // 5) Recompute lead score with the new age.
    const { score, signals } = computeLeadScore({
      ageBand,
      stillLive,
      postedByKind: posterData.postedByKind ?? job.postedByKind,
      isOnCompanyPage: job.isOnCompanyPage,
      dmName: job.dmName,
      sourcePlatform: job.sourcePlatform,
      seniority: job.seniority,
    })

    const updated = await db.scrapedJob.update({
      where: { id },
      data: {
        stillLive,
        lastSeenAt: now,
        timesSeen,
        ageBand,
        leadScore: score,
        leadSignals: JSON.stringify(signals),
        ...posterData,
      },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: stillLive ? 'job_rechecked_live' : 'job_closed',
        message: `${job.title} @ ${job.company}: ${note} Age: ${ageBand}.${stillLive ? '' : ' Marked no-longer-live.'}`,
      },
    })

    return NextResponse.json({ ...toScrapedJobDTO(updated), recheckNote: note })
  } catch (err) {
    console.error('[recheck] error', err)
    return NextResponse.json({ error: 'Failed to recheck job' }, { status: 500 })
  }
}
