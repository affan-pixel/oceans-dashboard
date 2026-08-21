// Apify adapter — real LinkedIn + Indeed job scraping via the Apify marketplace.
// https://docs.apify.com/api/v2
//
// When connected, the ICP job scrape calls real Apify actors. Falls back to the
// RemoteOK / curated-lists chain when Apify returns nothing.
//
// Verified actor IDs + input schemas (Aug 2026):
//   - canadesk/indeed-linkedin : inputs { title, city, country, engines, jobtype, remote, max }
//   - canadesk/google-jobs     : broad fallback via Google Jobs
//   - canadesk/career-scraper-plus : ATS boards (Greenhouse/Lever/Workable/etc.)

import type { ScrapedJobInput, ScrapedJobOutput } from '@/lib/ai'

const ACTORS = {
  // Primary: LinkedIn Jobs Scraper (curious_coder) — pay-per-result, NO rental.
  // Works on Apify's free $5/mo tier. Inputs: keywords, location, datePosted, limitPerSource.
  linkedinJobs: 'curious_coder~linkedin-jobs-scraper',
  // Secondary: aggregates Indeed + LinkedIn (canadesk). Requires rental after free trial.
  indeedLinkedin: 'canadesk~indeed-linkedin',
  // Broad fallback: pulls jobs indexed by Google (covers LinkedIn + Indeed + others).
  googleJobs: 'canadesk~google-jobs',
}

// Dataset items are heterogeneous across actors — collect every field we might see.
interface ApifyDatasetItem {
  title?: string
  jobTitle?: string
  position?: string
  company?: string
  companyName?: string
  location?: string
  city?: string
  country?: string
  salaryText?: string
  salary?: string
  description?: string
  jobDescription?: string
  snippet?: string
  url?: string
  link?: string
  jobUrl?: string
  postedAt?: string
  date?: string
  dateText?: string
  engine?: string
  source?: string
  // job poster fields (curious_coder actor)
  jobPoster?: string
  jobPosterUrl?: string
  jobPosterTitle?: string
  recruiter?: string
  recruiterUrl?: string
}

/** Run an Apify actor synchronously and return its dataset items. */
async function runActor<T>(
  apiKey: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<T[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=120`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(130_000),
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } | string; message?: string }
    const msg = typeof errBody.error === 'string' ? errBody.error : errBody.error?.message ?? errBody.message
    throw new Error(msg || `Apify actor ${actorId} failed (HTTP ${res.status})`)
  }
  const data = (await res.json()) as T[]
  return Array.isArray(data) ? data : []
}

function firstString(...vals: (string | undefined | null)[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return ''
}

function mapRegionToCountry(region: string): string {
  switch (region) {
    case 'USA':
      return 'United States'
    case 'Europe':
      return 'United Kingdom'
    case 'Australia':
      return 'Australia'
    default:
      return 'United States'
  }
}

/**
 * Scrape real jobs for an ICP via Apify. Uses canadesk/indeed-linkedin (Indeed +
 * LinkedIn) as the primary, canadesk/google-jobs as a broad fallback.
 */
export async function scrapeJobsWithApify(
  apiKey: string,
  icp: ScrapedJobInput
): Promise<ScrapedJobOutput[]> {
  const keywords = icp.roleTypes[0] || icp.keywords[0] || icp.name
  const region = icp.regions[0] || 'USA'
  const country = mapRegionToCountry(region)
  const results: ScrapedJobOutput[] = []

  // --- Primary: curious_coder/linkedin-jobs-scraper (pay-per-result, no rental) ---
  try {
    const items = await runActor<ApifyDatasetItem>(apiKey, ACTORS.linkedinJobs, {
      keywords,
      location: country,
      datePosted: 'pastWeek',
      limitPerSource: 8,
      scrapeCompany: false,
    })
    for (const item of items) {
      const title = firstString(item.title, item.jobTitle, item.position)
      const company = firstString(item.company, item.companyName)
      if (!title || !company) continue
      const posterName = firstString(item.jobPoster, item.recruiter)
      const posterUrl = firstString(item.jobPosterUrl, item.recruiterUrl)
      results.push({
        title: title.slice(0, 200),
        company: company.slice(0, 200),
        location: firstString(item.location, item.city).slice(0, 200) || 'Remote',
        region,
        salaryText: firstString(item.salaryText, item.salary).slice(0, 100),
        sourcePlatform: 'linkedin' as ScrapedJobOutput['sourcePlatform'],
        sourceUrl: firstString(item.url, item.link, item.jobUrl).slice(0, 500),
        snippet: firstString(item.description, item.jobDescription, item.snippet).replace(/<[^>]*>/g, '').slice(0, 500),
        fitReason: posterName
          ? `Matches ICP "${icp.name}" · posted by ${posterName}`
          : `Matches ICP "${icp.name}" (${icp.roleTypes.slice(0, 2).join(', ')})`,
        postedAt: firstString(item.postedAt, item.date, item.dateText).slice(0, 50),
        postedByName: posterName.slice(0, 120),
        postedByTitle: firstString(item.jobPosterTitle).slice(0, 200),
        postedByUrl: posterUrl.slice(0, 500),
      })
      if (results.length >= 8) break
    }
  } catch (err) {
    console.error('[apify] linkedin-jobs-scraper failed:', err instanceof Error ? err.message : err)
  }

  // --- Secondary: canadesk/indeed-linkedin (Indeed + LinkedIn engines) ---
  try {
    const items = await runActor<ApifyDatasetItem>(apiKey, ACTORS.indeedLinkedin, {
      title: keywords,
      country,
      city: '',
      engines: 'indeed,linkedin', // both engines
      jobtype: icp.remoteOnly ? 'remote' : '',
      remote: icp.remoteOnly ? 'true' : 'false',
      max: 8,
      last: '14', // last 14 days
      distance: '',
      delay: 500,
      proxy: { useApifyProxy: true },
    })
    for (const item of items) {
      const title = firstString(item.title, item.jobTitle, item.position)
      const company = firstString(item.company, item.companyName)
      if (!title || !company) continue
      const platform = /linkedin/i.test(firstString(item.engine, item.source)) ? 'linkedin' : 'indeed'
      results.push({
        title: title.slice(0, 200),
        company: company.slice(0, 200),
        location: firstString(item.location, item.city).slice(0, 200) || 'Remote',
        region,
        salaryText: firstString(item.salaryText, item.salary).slice(0, 100),
        sourcePlatform: platform as ScrapedJobOutput['sourcePlatform'],
        sourceUrl: firstString(item.url, item.link, item.jobUrl).slice(0, 500),
        snippet: firstString(item.description, item.jobDescription, item.snippet).replace(/<[^>]*>/g, '').slice(0, 500),
        fitReason: `Matches ICP "${icp.name}" (${icp.roleTypes.slice(0, 2).join(', ')})`,
        postedAt: firstString(item.postedAt, item.date, item.dateText).slice(0, 50),
      })
      if (results.length >= 8) break
    }
  } catch (err) {
    console.error('[apify] indeed-linkedin actor failed:', err instanceof Error ? err.message : err)
  }

  // --- Fallback: canadesk/google-jobs (only if primary returned < 4) ---
  if (results.length < 4) {
    try {
      const items = await runActor<ApifyDatasetItem>(apiKey, ACTORS.googleJobs, {
        query: `${keywords} remote ${country}`,
        maxResults: 6,
      })
      for (const item of items) {
        const title = firstString(item.title, item.jobTitle)
        const company = firstString(item.company, item.companyName)
        if (!title || !company) continue
        if (results.some((r) => r.title === title.slice(0, 200) && r.company === company.slice(0, 200))) continue
        results.push({
          title: title.slice(0, 200),
          company: company.slice(0, 200),
          location: firstString(item.location).slice(0, 200) || 'Remote',
          region,
          salaryText: firstString(item.salaryText, item.salary).slice(0, 100),
          sourcePlatform: 'other' as ScrapedJobOutput['sourcePlatform'],
          sourceUrl: firstString(item.url, item.link, item.jobUrl).slice(0, 500),
          snippet: firstString(item.description, item.snippet).replace(/<[^>]*>/g, '').slice(0, 500),
          fitReason: `Matches ICP "${icp.name}" (via Google Jobs)`,
          postedAt: firstString(item.postedAt, item.date).slice(0, 50),
        })
        if (results.length >= 8) break
      }
    } catch (err) {
      console.error('[apify] google-jobs actor failed:', err instanceof Error ? err.message : err)
    }
  }

  return results
}
