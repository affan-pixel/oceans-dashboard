// Agent 1 helpers — job age tracking + lead scoring.
// The age model: when a remote job STAYS posted over weeks/months, the company
// is struggling to fill it — that's Oceans' strongest lead signal.

export type AgeBand = 'fresh' | 'week' | 'month' | 'quarter' | 'stuck'

const DAY = 24 * 60 * 60 * 1000

/** Compute the age band from when we first saw the job. */
export function computeAgeBand(firstSeenAt: Date, now: Date = new Date()): AgeBand {
  const days = (now.getTime() - firstSeenAt.getTime()) / DAY
  if (days < 1) return 'fresh'      // < 24 hours
  if (days < 7) return 'week'       // still there after ~a week
  if (days < 30) return 'month'     // still there after ~a month
  if (days < 90) return 'quarter'   // still there after ~3 months
  return 'stuck'                    // 3+ months — they can't fill it, hot lead
}

export const AGE_BAND_META: Record<AgeBand, { label: string; hint: string; cls: string }> = {
  fresh:  { label: 'New',      hint: 'Posted < 24h',                                  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  week:   { label: '1w+',      hint: 'Still open after a week',                       cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  month:  { label: '1m+',      hint: 'Still open after a month — warming up',         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  quarter:{ label: '3m+',      hint: 'Still open after 3 months — strong signal',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  stuck:  { label: 'STUCK',    hint: 'Open 3+ months — they cannot fill it. Call.',   cls: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' },
}

/**
 * Lead scoring — PLACEHOLDER heuristic.
 * Will be replaced with the user's scoring list when provided; the shape
 * (signals with points) is designed to map 1:1 onto a provided list.
 */
export interface LeadSignal {
  signal: string
  points: number
}

export function computeLeadScore(job: {
  ageBand?: string | null
  stillLive?: boolean
  remoteOnly?: boolean
  postedByKind?: string | null
  isOnCompanyPage?: boolean
  dmName?: string | null
  sourcePlatform?: string
  seniority?: string | null
}): { score: number; signals: LeadSignal[] } {
  const signals: LeadSignal[] = []

  // Age signals — the longer unfilled, the hotter.
  const agePoints: Record<string, number> = { fresh: 0, week: 15, month: 30, quarter: 45, stuck: 60 }
  const ap = agePoints[job.ageBand ?? 'fresh'] ?? 0
  if (ap > 0) signals.push({ signal: `Job open ${job.ageBand}`, points: ap })

  // Founder/CEO posted personally = fast decision path.
  if (job.postedByKind === 'founder' || job.postedByKind === 'ceo') {
    signals.push({ signal: `Posted personally by ${job.postedByKind}`, points: 20 })
  } else if (job.postedByKind === 'hr' || job.postedByKind === 'recruiter') {
    signals.push({ signal: 'Posted by HR/recruiter (process in place)', points: 5 })
  }

  // Also on the company page = real budgeted role, not a fishing post.
  if (job.isOnCompanyPage) signals.push({ signal: 'Also on company careers page', points: 10 })

  // LinkedIn source = higher intent than aggregators.
  if (job.sourcePlatform === 'linkedin') signals.push({ signal: 'Posted on LinkedIn directly', points: 5 })

  // Decision maker identified = actionable now.
  if (job.dmName) signals.push({ signal: 'Decision maker identified', points: 10 })

  // Senior roles = better Oceans pricing.
  if (job.seniority === 'senior' || job.seniority === 'lead' || job.seniority === 'exec') {
    signals.push({ signal: `Senior+ role (${job.seniority})`, points: 5 })
  }

  // No longer live = cold.
  if (job.stillLive === false) signals.push({ signal: 'Posting no longer live', points: -100 })

  const score = Math.max(0, Math.min(100, signals.reduce((s, x) => s + x.points, 0)))
  return { score, signals }
}

/** Normalize a job for dedupe matching across scrapes. */
export function jobMatchKey(company: string, title: string): string {
  return `${company.toLowerCase().trim()}::${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`
}
