// Apify adapter — real LinkedIn Jobs + Indeed scraping via the Apify marketplace.
// https://docs.apify.com/api/v2
//
// When connected, the ICP job scrape calls a real Apify actor instead of the
// LLM-simulated scrape. Falls back gracefully when not connected.

import type { ScrapedJobInput, ScrapedJobOutput } from '@/lib/ai'

// Popular Apify actors for job scraping. These are public actor IDs on the Apify Store.
// We try LinkedIn Jobs first, then Indeed, then Wellfound.
const ACTORS = {
  linkedinJobs: 'canadesk/linkedin-jobs', // public actor
  indeedJobs: 'curious_coder/indeed-scraper', // public actor
  wellfoundJobs: 'canadesk/wellfound-jobs', // public actor
}

interface ApifyDatasetItem {
  title?: string
  company?: string
  location?: string
  salaryText?: string
  description?: string
  url?: string
  postedAt?: string
  dateText?: string
}

interface ApifyRunResponse {
  error?: string
  message?: string
  // dataset items come back directly from run-sync-get-dataset-items
}

/** Run an Apify actor synchronously and return its dataset items. */
async function runActor<T>(
  apiKey: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<T[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=60`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as ApifyRunResponse
    throw new Error(errBody.error || errBody.message || `Apify actor ${actorId} failed (HTTP ${res.status})`)
  }
  const data = (await res.json()) as T[]
  return Array.isArray(data) ? data : []
}

function mapRegionToLocation(region: string): string {
  switch (region) {
    case 'USA':
      return 'United States'
    case 'Europe':
      return 'Europe'
    case 'Australia':
      return 'Australia'
    default:
      return 'Worldwide'
  }
}

/**
 * Scrape real jobs for an ICP via Apify. Mixes LinkedIn + Indeed + Wellfound
 * based on the ICP's role types and regions.
 */
export async function scrapeJobsWithApify(
  apiKey: string,
  icp: ScrapedJobInput
): Promise<ScrapedJobOutput[]> {
  const keywords = icp.roleTypes[0] || icp.keywords[0] || icp.name
  const region = icp.regions[0] || 'USA'
  const location = mapRegionToLocation(region)
  const maxPerSource = Math.ceil(6 / 3) // 2 per source, 6 total

  const results: ScrapedJobOutput[] = []

  // Run all 3 sources in parallel
  const [linkedinItems, indeedItems, wellfoundItems] = await Promise.allSettled([
    runActor<ApifyDatasetItem>(apiKey, ACTORS.linkedinJobs, {
      keywords,
      location,
      maxJobs: maxPerSource,
    }),
    runActor<ApifyDatasetItem>(apiKey, ACTORS.indeedJobs, {
      keyword: keywords,
      location,
      maxItems: maxPerSource,
    }),
    runActor<ApifyDatasetItem>(apiKey, ACTORS.wellfoundJobs, {
      keyword: keywords,
      location,
      limit: maxPerSource,
    }),
  ])

  const platformMap: Array<{
    settled: PromiseSettledResult<ApifyDatasetItem[]>
    platform: 'linkedin' | 'indeed' | 'wellfound'
  }> = [
    { settled: linkedinItems, platform: 'linkedin' },
    { settled: indeedItems, platform: 'indeed' },
    { settled: wellfoundItems, platform: 'wellfound' },
  ]

  for (const { settled, platform } of platformMap) {
    if (settled.status !== 'fulfilled') continue
    for (const item of settled.value) {
      if (!item.title || !item.company) continue
      results.push({
        title: String(item.title).slice(0, 200),
        company: String(item.company).slice(0, 200),
        location: String(item.location ?? '').slice(0, 200),
        region,
        salaryText: String(item.salaryText ?? '').slice(0, 100),
        sourcePlatform: platform,
        sourceUrl: String(item.url ?? ''),
        snippet: String(item.description ?? '').slice(0, 500),
        fitReason: `Matches ICP "${icp.name}" (${icp.roleTypes.slice(0, 2).join(', ')})`,
        postedAt: String(item.postedAt ?? item.dateText ?? '').slice(0, 50),
      })
      if (results.length >= 6) break
    }
    if (results.length >= 6) break
  }

  return results
}
