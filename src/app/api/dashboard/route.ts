import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toActivityDTO, toScrapedJobDTO } from '@/lib/mappers'
import type { DashboardStatsDTO } from '@/lib/types'

export async function GET() {
  try {
    const [
      leads,
      candidates,
      jds,
      activeJds,
      matches,
      totalJobTargets,
      totalBriefs,
      recentActivitiesRaw,
      latestScrapedJobsRaw,
    ] = await Promise.all([
      db.lead.findMany(),
      db.candidate.findMany(),
      db.jobDescription.count(),
      db.jobDescription.count({ where: { isActive: true } }),
      db.match.count(),
      db.jobTarget.count(),
      db.brief.count(),
      db.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      // Latest 8 scraped jobs (newest first) — surfaced on the dashboard.
      db.scrapedJob.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    const totalLeads = leads.length
    const highPriorityLeads = leads.filter((l) => l.priority === 'high').length
    const contactedLeads = leads.filter(
      (l) => l.status === 'contacted' || l.status === 'replied'
    ).length
    const qualifiedLeads = leads.filter((l) => l.status === 'qualified').length
    const wonLeads = leads.filter((l) => l.status === 'won').length

    const totalCandidates = candidates.length
    const activeCandidates = candidates.filter((c) => c.status === 'active').length
    const placedCandidates = candidates.filter((c) => c.status === 'placed').length

    // Group by region
    const regionMap = new Map<string, number>()
    for (const l of leads) {
      const r = l.region ?? 'Unknown'
      regionMap.set(r, (regionMap.get(r) ?? 0) + 1)
    }
    const leadsByRegion = Array.from(regionMap.entries()).map(([region, count]) => ({
      region,
      count,
    }))

    // Group by status
    const statusMap = new Map<string, number>()
    for (const l of leads) {
      const s = l.status ?? 'unknown'
      statusMap.set(s, (statusMap.get(s) ?? 0) + 1)
    }
    const leadsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }))

    // Group by source strategy
    const strategyMap = new Map<string, number>()
    for (const l of leads) {
      const s = l.sourceStrategy ?? 'Unknown'
      strategyMap.set(s, (strategyMap.get(s) ?? 0) + 1)
    }
    const leadsByStrategy = Array.from(strategyMap.entries()).map(([strategy, count]) => ({
      strategy,
      count,
    }))

    const stats: DashboardStatsDTO = {
      totalLeads,
      highPriorityLeads,
      contactedLeads,
      qualifiedLeads,
      wonLeads,
      totalCandidates,
      activeCandidates,
      placedCandidates,
      totalJds: jds,
      activeJds,
      totalMatches: matches,
      totalJobTargets,
      totalBriefs,
      recentActivities: recentActivitiesRaw.map(toActivityDTO),
      leadsByRegion,
      leadsByStatus,
      leadsByStrategy,
      latestScrapedJobs: latestScrapedJobsRaw.map(toScrapedJobDTO),
    }

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[dashboard] error', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
