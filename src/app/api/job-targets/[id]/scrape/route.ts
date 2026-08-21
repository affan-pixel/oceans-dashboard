import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJobTargetDTO, toScrapedJobDTO } from '@/lib/mappers'
import { scrapeJobsForIcp, categorizeJob } from '@/lib/ai'
import { isConnected, getApiKey, markSynced } from '@/lib/integrations/db'
import { scrapeJobsWithApify } from '@/lib/integrations/apify'
import { scrapeJobsWithAgentReach } from '@/lib/integrations/agent-reach'
import { env } from '@/lib/env'
import { computeLeadScore, jobMatchKey } from '@/lib/agent1'

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

// POST /api/job-targets/[id]/scrape
// Agent 1 / Step 1: scrape LinkedIn / Indeed / Wellfound for jobs matching this ICP.
// Uses REAL Apify scraping when the Apify integration is connected; falls back to
// LLM-simulated scraping when not.
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const icp = await db.jobTarget.findUnique({ where: { id } })
    if (!icp) {
      return NextResponse.json({ error: 'ICP not found' }, { status: 404 })
    }

    // Mark as running
    await db.jobTarget.update({
      where: { id },
      data: { scrapeStatus: 'running' },
    })

    const icpInput = {
      name: icp.name,
      description: icp.description,
      roleTypes: parseArray(icp.roleTypes),
      industries: parseArray(icp.industries),
      regions: parseArray(icp.regions),
      salaryMinUsd: icp.salaryMinUsd,
      remoteOnly: icp.remoteOnly,
      signals: parseArray(icp.signals),
      keywords: parseArray(icp.keywords),
    }

    // Multi-source fallback chain:
    //   1. Agent Reach (crawl4ai → RemoteOK API → Jina Reader → job boards via crawl4ai)
    //   2. Apify (if connected)
    //   3. LLM-simulated (last resort)
    let jobs: Awaited<ReturnType<typeof scrapeJobsForIcp>> = []
    let source = 'simulated'

    // Resolve an Apify key: env var (APIFY_API_KEY) takes precedence, else the
    // Integrations DB value if the user connected it in the UI.
    const apifyKey = env.apifyApiKey ?? (await isConnected('apify') ? await getApiKey('apify') : null)

    // 1. Apify FIRST when a key is present — real LinkedIn Jobs + Indeed + Wellfound.
    //    This is the preferred path (you have a key and want LinkedIn specifically).
    if (apifyKey) {
      console.log('[scrape] Apify key present — running LinkedIn/Indeed/Wellfound actors')
      try {
        jobs = await scrapeJobsWithApify(apifyKey, icpInput)
        console.log('[scrape] Apify returned', jobs.length, 'jobs')
        if (jobs.length > 0) source = 'apify'
        if (await isConnected('apify')) await markSynced('apify', null)
      } catch (err) {
        console.error('[scrape] Apify failed:', err instanceof Error ? err.message : err)
        if (await isConnected('apify')) {
          await markSynced('apify', err instanceof Error ? err.message : 'Apify scrape failed')
        }
      }
    } else {
      console.log('[scrape] No Apify key — falling back to RemoteOK/curated lists')
    }

    // 2. If Apify returned nothing (or no key), try Agent Reach (RemoteOK API →
    //    curated lists → crawl4ai → Jina Reader).
    if (jobs.length === 0) {
      try {
        const result = await scrapeJobsWithAgentReach(icpInput)
        jobs = result.jobs
        source = result.source
      } catch (err) {
        console.error('[scrape] Agent Reach failed:', err)
      }
    }

    // 3. Final fallback: LLM-simulated postings (clearly labeled).
    if (jobs.length === 0) {
      jobs = await scrapeJobsForIcp(icpInput)
      source = 'simulated'
    }

    // Persist scraped jobs with DEDUPE + AGE TRACKING:
    //   - A job we've seen before (same company+title) updates lastSeenAt/timesSeen
    //     instead of duplicating — that's how we know it's STILL open after 1w/1m/3m.
    //   - Brand-new jobs get categorized (step 2) + lead-scored, then inserted.
    let newCount = 0
    let updatedCount = 0
    if (jobs.length > 0) {
      // Load this ICP's live jobs for dedupe matching.
      const existing = await db.scrapedJob.findMany({
        where: { jobTargetId: id, stillLive: true },
        select: { id: true, company: true, title: true, timesSeen: true },
      })
      const existingByKey = new Map(existing.map((e) => [jobMatchKey(e.company, e.title), e]))

      for (const j of jobs.slice(0, 8)) {
        const key = jobMatchKey(j.company, j.title)
        const prior = existingByKey.get(key)

        if (prior) {
          // Seen again → still open. Bump tracking; keep original firstSeenAt/age.
          const timesSeen = (prior.timesSeen ?? 1) + 1
          await db.scrapedJob.update({
            where: { id: prior.id },
            data: { lastSeenAt: new Date(), timesSeen },
          })
          updatedCount++
          continue
        }

        // Brand-new job → categorize + score, then insert.
        const cat = await categorizeJob(j.title, j.snippet)
        // Classify the poster from their title (founder/ceo = hot signal).
        const pt = (j.postedByTitle ?? '').toLowerCase()
        const postedByKind = !j.postedByName ? null
          : /(founder|co-founder)/.test(pt) ? 'founder'
          : /(ceo|cto|coo|cfo|chief)/.test(pt) ? 'ceo'
          : /(recruiter|talent)/.test(pt) ? 'recruiter'
          : /(hr|people)/.test(pt) ? 'hr'
          : 'other'
        const { score, signals } = computeLeadScore({
          ageBand: 'fresh',
          stillLive: true,
          remoteOnly: icp.remoteOnly,
          sourcePlatform: j.sourcePlatform,
          seniority: cat.seniority,
          postedByKind,
        })
        await db.scrapedJob.create({
          data: {
            jobTargetId: id,
            title: j.title,
            company: j.company,
            location: j.location,
            region: j.region,
            salaryText: j.salaryText,
            sourcePlatform: j.sourcePlatform,
            sourceUrl: j.sourceUrl,
            snippet: j.snippet,
            fitReason: j.fitReason,
            postedAt: j.postedAt,
            scrapeSource: source,
            seniority: cat.seniority,
            skillsRequired: JSON.stringify(cat.skills),
            timezone: cat.timezone,
            status: 'new',
            leadScore: score,
            leadSignals: JSON.stringify(signals),
          },
        })
        newCount++
      }
    }

    await db.jobTarget.update({
      where: { id },
      data: { scrapeStatus: 'done', lastScrapedAt: new Date() },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'jobs_scraped',
        message: `Scrape for ICP "${icp.name}" via ${source}: ${newCount} new, ${updatedCount} confirmed still open.`,
      },
    })

    // Return the updated ICP + the new jobs
    const updated = await db.jobTarget.findUnique({
      where: { id },
      include: {
        _count: { select: { scrapedJobs: { where: { status: 'new' } } } },
      },
    })
    const newJobs = await db.scrapedJob.findMany({
      where: { jobTargetId: id, status: 'new' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      icp: updated ? { ...toJobTargetDTO(updated), scrapedJobsCount: updated._count.scrapedJobs } : null,
      jobs: newJobs.map(toScrapedJobDTO),
    })
  } catch (err) {
    console.error('[scrape POST] error', err)
    const { id } = await params
    await db.jobTarget
      .update({ where: { id }, data: { scrapeStatus: 'failed' } })
      .catch(() => {})
    return NextResponse.json({ error: 'Failed to scrape jobs' }, { status: 500 })
  }
}
