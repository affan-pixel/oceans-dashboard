import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeAgeBand, computeLeadScore } from '@/lib/agent1'

const JINA_READER_BASE = 'https://r.jina.ai/'
const DEAD_PATTERNS = [
  /no longer accepting applications/i,
  /no longer accepting/i,
  /position has been filled/i,
  /job is (no longer|closed)/i,
  /this job is (expired|unavailable)/i,
  /page not found/i,
]

// POST /api/pipeline/recheck — Agent 1 batch persistence check.
// Rechecks live jobs (oldest first — those closest to a band change), updates
// age bands (week → month → quarter → stuck) and marks closed postings dead.
// Body: { limit?: number } (default 20, max 40)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const limit = Math.max(1, Math.min(40, Number(body.limit ?? 20)))

    const jobs = await db.scrapedJob.findMany({
      where: { stillLive: true, status: { not: 'dismissed' } },
      orderBy: { firstSeenAt: 'asc' }, // oldest first — most likely to cross a band
      take: limit,
      select: { id: true },
    })

    let live = 0
    let closed = 0
    let unknown = 0
    const bandChanges: string[] = []

    for (const { id } of jobs) {
      const job = await db.scrapedJob.findUnique({ where: { id } })
      if (!job || !job.stillLive) continue

      let pageText = ''
      let fetchOk = false
      if (job.sourceUrl) {
        try {
          const res = await fetch(`${JINA_READER_BASE}${job.sourceUrl}`, {
            headers: { 'X-Return-Format': 'markdown', Accept: 'text/markdown' },
            signal: AbortSignal.timeout(20_000),
          })
          if (res.ok) {
            pageText = (await res.text()).slice(0, 8000)
            fetchOk = true
          }
        } catch {
          fetchOk = false
        }
      }

      let stillLive = true
      if (fetchOk) {
        if (DEAD_PATTERNS.some((p) => p.test(pageText))) stillLive = false
      } else {
        unknown++
      }

      const now = new Date()
      const firstSeen = job.firstSeenAt ?? job.createdAt
      const newBand = stillLive ? computeAgeBand(firstSeen, now) : job.ageBand
      if (newBand !== job.ageBand) bandChanges.push(`${job.title} @ ${job.company}: ${job.ageBand} → ${newBand}`)

      const { score, signals } = computeLeadScore({
        ageBand: newBand,
        stillLive,
        postedByKind: job.postedByKind,
        isOnCompanyPage: job.isOnCompanyPage,
        dmName: job.dmName,
        sourcePlatform: job.sourcePlatform,
        seniority: job.seniority,
      })

      await db.scrapedJob.update({
        where: { id },
        data: {
          stillLive,
          lastSeenAt: stillLive ? now : job.lastSeenAt,
          timesSeen: stillLive ? (job.timesSeen ?? 1) + 1 : job.timesSeen,
          ageBand: newBand,
          leadScore: score,
          leadSignals: JSON.stringify(signals),
        },
      })
      if (stillLive) live++
      else closed++
    }

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'batch_recheck',
        message: `Rechecked ${jobs.length} jobs: ${live} still open, ${closed} closed, ${unknown} unreachable.${bandChanges.length ? ' Age changes: ' + bandChanges.slice(0, 3).join('; ') : ''}`,
      },
    })

    return NextResponse.json({ checked: jobs.length, live, closed, unknown, bandChanges })
  } catch (err) {
    console.error('[batch recheck] error', err)
    return NextResponse.json({ error: 'Failed to batch recheck' }, { status: 500 })
  }
}
