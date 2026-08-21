import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toActivityDTO, toScrapedJobDTO } from '@/lib/mappers'
import type { DashboardStatsDTO } from '@/lib/types'

// A lead IS a scraped job now. The old company-side Lead model (icpScore,
// sourceStrategy) was a parallel implementation of the same idea and is gone —
// every metric below reads off ScrapedJob, which is what the pipeline actually
// fills.
export async function GET() {
  try {
    const [
      jobs,
      candidates,
      jds,
      activeJds,
      matches,
      totalJobTargets,
      recentActivitiesRaw,
      latestScrapedJobsRaw,
    ] = await Promise.all([
      db.scrapedJob.findMany({
        where: { status: { not: 'dismissed' } },
        select: { region: true, status: true, ageBand: true, stillLive: true, leadScore: true },
      }),
      db.candidate.findMany({ select: { status: true } }),
      db.jobDescription.count(),
      db.jobDescription.count({ where: { isActive: true } }),
      db.match.count(),
      db.jobTarget.count(),
      db.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      // Latest 8 scraped jobs (newest first) — surfaced on the dashboard.
      db.scrapedJob.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    const totalLeads = jobs.length

    // "Hot" = still live and open 3+ months. That's the signal worth a call:
    // they cannot fill the role themselves.
    const hotLeads = jobs.filter(
      (j) => j.stillLive && (j.ageBand === 'quarter' || j.ageBand === 'stuck')
    ).length

    const contactedLeads = jobs.filter(
      (j) => j.status === 'outreach_sent' || j.status === 'replied'
    ).length
    const repliedLeads = jobs.filter((j) => j.status === 'replied').length
    const convertedLeads = jobs.filter((j) => j.status === 'converted').length

    const totalCandidates = candidates.length
    const activeCandidates = candidates.filter((c) => c.status === 'active').length
    const placedCandidates = candidates.filter((c) => c.status === 'placed').length

    const countBy = <T extends string>(key: (j: (typeof jobs)[number]) => T | null | undefined) => {
      const m = new Map<string, number>()
      for (const j of jobs) {
        const k = key(j) ?? 'Unknown'
        m.set(k, (m.get(k) ?? 0) + 1)
      }
      return m
    }

    const leadsByRegion = Array.from(countBy((j) => j.region).entries()).map(
      ([region, count]) => ({ region, count })
    )
    const leadsByStatus = Array.from(countBy((j) => j.status).entries()).map(
      ([status, count]) => ({ status, count })
    )
    // Replaces the old leadsByStrategy chart. Age band is the distribution that
    // actually tells you whether the pipeline is full of fresh noise or real
    // failed searches.
    const leadsByAgeBand = Array.from(countBy((j) => j.ageBand).entries()).map(
      ([ageBand, count]) => ({ ageBand, count })
    )

    const stats: DashboardStatsDTO = {
      totalLeads,
      hotLeads,
      contactedLeads,
      repliedLeads,
      convertedLeads,
      totalCandidates,
      activeCandidates,
      placedCandidates,
      totalJds: jds,
      activeJds,
      totalMatches: matches,
      totalJobTargets,
      recentActivities: recentActivitiesRaw.map(toActivityDTO),
      leadsByRegion,
      leadsByStatus,
      leadsByAgeBand,
      latestScrapedJobs: latestScrapedJobsRaw.map(toScrapedJobDTO),
    }

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[dashboard] error', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
