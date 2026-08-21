// Agent 1 — batch persistence check.
//
// This is the engine behind the whole aging model: a remote role that STAYS
// posted for weeks is a company that cannot fill it, and that is Oceans'
// strongest buying signal. The signal only exists if something re-visits each
// posting on a schedule — see src/app/api/cron/recheck/route.ts.
//
// Shared by the in-app "Recheck" button and the scheduled cron so there is one
// implementation of the age/lead-score update, not two that drift.

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

export interface RecheckSummary {
  checked: number
  live: number
  closed: number
  unknown: number
  bandChanges: string[]
}

export const RECHECK_MAX_BATCH = 40

export async function runRecheck(limitInput: unknown = 20): Promise<RecheckSummary> {
  const limit = Math.max(1, Math.min(RECHECK_MAX_BATCH, Number(limitInput ?? 20) || 20))

  // Least-recently-CHECKED first (never-checked rows first). The previous
  // ordering was firstSeenAt asc — but firstSeenAt never changes, so every run
  // re-scanned the same oldest N rows and the rest of the table was never
  // visited. lastCheckedAt advances on every attempt, so this round-robins.
  const jobs = await db.scrapedJob.findMany({
    where: { stillLive: true, status: { not: 'dismissed' } },
    orderBy: [{ lastCheckedAt: { sort: 'asc', nulls: 'first' } }, { firstSeenAt: 'asc' }],
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

    // Only a successful fetch can prove a posting dead. An unreachable page is
    // "unknown", never "closed".
    const stillLive = fetchOk ? !DEAD_PATTERNS.some((p) => p.test(pageText)) : true
    if (!fetchOk) unknown++

    const now = new Date()
    const firstSeen = job.firstSeenAt ?? job.createdAt
    const newBand = stillLive ? computeAgeBand(firstSeen, now) : job.ageBand
    if (newBand !== job.ageBand) {
      bandChanges.push(`${job.title} @ ${job.company}: ${job.ageBand} → ${newBand}`)
    }

    const { score, signals } = computeLeadScore({
      ageBand: newBand,
      stillLive,
      postedByKind: job.postedByKind,
      isOnCompanyPage: job.isOnCompanyPage,
      dmName: job.dmName,
      sourcePlatform: job.sourcePlatform,
      seniority: job.seniority,
    })

    // lastCheckedAt always advances (that's what round-robins the batch).
    // lastSeenAt / timesSeen only advance on a CONFIRMED-live fetch — otherwise
    // an unreachable posting would look repeatedly verified and inflate the
    // persistence signal that the whole lead score rests on.
    const confirmedLive = fetchOk && stillLive
    await db.scrapedJob.update({
      where: { id },
      data: {
        stillLive,
        lastCheckedAt: now,
        lastSeenAt: confirmedLive ? now : job.lastSeenAt,
        timesSeen: confirmedLive ? (job.timesSeen ?? 1) + 1 : job.timesSeen,
        ageBand: newBand,
        leadScore: score,
        leadSignals: JSON.stringify(signals),
      },
    })

    if (stillLive) live++
    else closed++
  }

  return { checked: jobs.length, live, closed, unknown, bandChanges }
}

export async function logRecheck(summary: RecheckSummary, source: 'manual' | 'cron') {
  const { checked, live, closed, unknown, bandChanges } = summary
  await db.activity.create({
    data: {
      agent: 'customer_finder',
      type: 'batch_recheck',
      message:
        `Rechecked ${checked} jobs (${source}): ${live} still open, ${closed} closed, ${unknown} unreachable.` +
        (bandChanges.length ? ' Age changes: ' + bandChanges.slice(0, 3).join('; ') : ''),
    },
  })
}
