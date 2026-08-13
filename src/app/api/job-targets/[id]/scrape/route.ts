import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJobTargetDTO, toScrapedJobDTO } from '@/lib/mappers'
import { scrapeJobsForIcp, categorizeJob } from '@/lib/ai'
import { isConnected, getApiKey, markSynced } from '@/lib/integrations/db'
import { scrapeJobsWithApify } from '@/lib/integrations/apify'
import { scrapeJobsWithAgentReach } from '@/lib/integrations/agent-reach'
import { env } from '@/lib/env'

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
      try {
        jobs = await scrapeJobsWithApify(apifyKey, icpInput)
        source = 'apify'
        if (await isConnected('apify')) await markSynced('apify', null)
      } catch (err) {
        console.error('[scrape] Apify failed:', err)
        if (await isConnected('apify')) {
          await markSynced('apify', err instanceof Error ? err.message : 'Apify scrape failed')
        }
      }
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

    // Persist scraped jobs (append — don't delete previous, so we keep history).
    // Categorize each (step 2: seniority / skills / timezone) before insert.
    if (jobs.length > 0) {
      const categorized = await Promise.all(
        jobs.slice(0, 8).map(async (j) => {
          const cat = await categorizeJob(j.title, j.snippet)
          return { ...j, ...cat }
        })
      )
      await db.scrapedJob.createMany({
        data: categorized.map((j) => ({
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
          seniority: j.seniority,
          skillsRequired: JSON.stringify(j.skills),
          timezone: j.timezone,
          status: 'new',
        })),
      })
    }

    await db.jobTarget.update({
      where: { id },
      data: { scrapeStatus: 'done', lastScrapedAt: new Date() },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'jobs_scraped',
        message: `Scraped ${jobs.length} jobs for ICP "${icp.name}" via ${source}.`,
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
