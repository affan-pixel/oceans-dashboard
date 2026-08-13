// Multi-source scraping pipeline with fallback chain.
//
// The user's requirement: "find something, if you don't, go to the next. If you don't
// find the next, somehow find this."
//
// Fallback chain (tries each source in order until one returns real jobs):
//   1. crawl4ai service (port 3031) — best quality, handles JS rendering, clean markdown
//   2. RemoteOK JSON API — structured data, no scraping needed
//   3. Jina Reader — free web-to-markdown fallback
//   4. LLM-simulated — last resort (clearly labeled as simulated)
//
// Each source is tried in order. If a source returns 0 jobs, we try the next.
// The scrapeSource field on each scraped job records which source found it.

import type { ScrapedJobInput, ScrapedJobOutput } from '@/lib/ai'
import ZAI from 'z-ai-web-dev-sdk'

const CRAWL4AI_URL = 'http://localhost:3031/crawl'
const JINA_READER_BASE = 'https://r.jina.ai/'
const REMOTEOK_API = 'https://remoteok.com/api'

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

function extractJson(text: string): unknown {
  if (!text) throw new Error('Empty AI response')
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const firstObj = t.indexOf('{')
  const firstArr = t.indexOf('[')
  let start = -1
  if (firstObj === -1) start = firstArr
  else if (firstArr === -1) start = firstObj
  else start = Math.min(firstObj, firstArr)
  if (start === -1) throw new Error('No JSON found in AI response')
  const last = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'))
  return JSON.parse(t.slice(start, last + 1))
}

// Map ICP role types → RemoteOK tags
const ROLE_TAG_MAP: Array<{ keys: string[]; tag: string }> = [
  { keys: ['executive assistant', 'ea+', 'chief of staff', 'operations coordinator'], tag: 'exec' },
  { keys: ['marketing', 'growth', 'content', 'seo', 'social media'], tag: 'marketing' },
  { keys: ['finance', 'fp&a', 'bookkeeper', 'accounting'], tag: 'finance' },
  { keys: ['operations', 'revops', 'bizops', 'ops manager'], tag: 'ops' },
  { keys: ['customer success', 'cs lead', 'onboarding', 'support'], tag: 'customer support' },
  { keys: ['gtm', 'sales', 'sdr', 'ae', 'revenue'], tag: 'sales' },
  { keys: ['design', 'designer', 'ux', 'ui'], tag: 'design' },
  { keys: ['developer', 'engineer', 'frontend', 'backend', 'fullstack'], tag: 'dev' },
  { keys: ['data', 'analyst', 'analytics'], tag: 'data' },
]

function pickTag(icp: ScrapedJobInput): string | null {
  const roleType = (icp.roleTypes[0] || '').toLowerCase()
  const keywordStr = icp.keywords.join(' ').toLowerCase()
  for (const { keys, tag } of ROLE_TAG_MAP) {
    if (keys.some((k) => roleType.includes(k) || keywordStr.includes(k))) {
      return tag
    }
  }
  return null
}

function inferRegion(location: string): 'USA' | 'Europe' | 'Australia' | 'Global' {
  const l = location.toLowerCase()
  if (l.includes('united states') || l.includes('usa') || l.includes('🇺🇸')) return 'USA'
  if (l.includes('europe') || l.includes('united kingdom') || l.includes('🇬🇧') || l.includes('london') || l.includes('germany') || l.includes('berlin') || l.includes('netherlands') || l.includes('amsterdam') || l.includes('paris') || l.includes('🇫🇷')) return 'Europe'
  if (l.includes('australia') || l.includes('🇦🇺') || l.includes('sydney') || l.includes('melbourne')) return 'Australia'
  return 'Global'
}

// ==================== SOURCE 1: crawl4ai ====================

interface RemoteOkJob {
  slug?: string
  id?: string
  position?: string
  company?: string
  location?: string
  tags?: string[]
  description?: string
  salary_min?: number
  salary_max?: number
  url?: string
}

async function fetchWithCrawl4ai(url: string): Promise<string> {
  const res = await fetch(CRAWL4AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`crawl4ai HTTP ${res.status}`)
  const data = (await res.json()) as { success: boolean; markdown?: string; error?: string }
  if (!data.success || !data.markdown) throw new Error(data.error || 'crawl4ai returned no markdown')
  return data.markdown
}

// ==================== SOURCE 2: RemoteOK JSON API ====================

async function scrapeWithRemoteOkApi(icp: ScrapedJobInput): Promise<ScrapedJobOutput[]> {
  const tag = pickTag(icp)
  const res = await fetch(REMOTEOK_API, {
    headers: { 'User-Agent': 'Oceans-Talent/1.0 (headhunting platform)', Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`RemoteOK API HTTP ${res.status}`)
  const data = (await res.json()) as RemoteOkJob[]

  let jobs = data.filter(
    (j): j is RemoteOkJob =>
      typeof j === 'object' && j !== null && typeof j.position === 'string' && typeof j.company === 'string'
  )

  if (tag) {
    const tagged = jobs.filter((j) => (j.tags ?? []).map((t) => t.toLowerCase()).includes(tag))
    if (tagged.length > 0) jobs = tagged
  }

  const icpKeywords = icp.keywords.filter((k) => k.length > 3).map((k) => k.toLowerCase())
  if (icpKeywords.length > 0 && jobs.length > 6) {
    const keywordFiltered = jobs.filter((j) => {
      const blob = `${j.position} ${(j.tags ?? []).join(' ')} ${j.description ?? ''}`.toLowerCase()
      return icpKeywords.some((k) => blob.includes(k))
    })
    if (keywordFiltered.length >= 3) jobs = keywordFiltered
  }

  jobs = jobs.slice(0, 10)

  return jobs.map((j) => {
    const salaryMin = j.salary_min ?? 0
    const salaryMax = j.salary_max ?? 0
    const salaryText = salaryMin > 0 && salaryMax > 0 ? `$${Math.round(salaryMin / 1000)}k - $${Math.round(salaryMax / 1000)}k` : ''
    const snippet = (j.description ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 200)
    return {
      title: String(j.position).slice(0, 200),
      company: String(j.company).slice(0, 200),
      location: String(j.location ?? '').trim().slice(0, 200),
      region: inferRegion(j.location ?? ''),
      salaryText,
      sourcePlatform: 'remoteok' as const,
      sourceUrl: j.url || (j.id ? `https://remoteok.com/l/${j.id}` : 'https://remoteok.com'),
      snippet,
      fitReason: `Matches ICP "${icp.name}"${tag ? ` (tag: ${tag})` : ''}`,
      postedAt: '',
    }
  })
}

// ==================== SOURCE 3: crawl4ai + LLM parse (for other job boards) ====================

const JOB_BOARD_URLS: Array<{ name: string; build: (icp: ScrapedJobInput) => string }> = [
  {
    name: 'remoteok-category',
    build: (icp) => {
      const roleType = (icp.roleTypes[0] || '').toLowerCase()
      const categoryMap: Record<string, string> = {
        'executive assistant': 'remote-exec-jobs',
        'marketing': 'remote-marketing-jobs',
        'finance': 'remote-finance-jobs',
        'operations': 'remote-ops-jobs',
        'customer success': 'remote-customer-support-jobs',
        'gtm': 'remote-sales-jobs',
        'sales': 'remote-sales-jobs',
      }
      for (const [key, slug] of Object.entries(categoryMap)) {
        if (roleType.includes(key)) return `https://remoteok.com/${slug}`
      }
      return `https://remoteok.com/remote-${roleType.replace(/\s+/g, '-')}-jobs`
    },
  },
  {
    name: 'weworkremotely',
    build: (icp) => {
      const kw = encodeURIComponent(icp.roleTypes[0] || icp.keywords[0] || icp.name)
      return `https://weworkremotely.com/remote-jobs/search?term=${kw}`
    },
  },
  {
    name: 'remoteok-search',
    build: (icp) => {
      const kw = encodeURIComponent(icp.roleTypes[0] || icp.keywords[0] || icp.name)
      return `https://remoteok.com/remote-${kw.toLowerCase().replace(/\s+/g, '-')}-jobs`
    },
  },
]

const PARSE_PROMPT = `You are a job-posting parser for Oceans, a headhunting firm. You receive raw markdown from a job board page (fetched via crawl4ai or Jina Reader). Extract the REAL job postings.

Look for job titles, company names, locations, and salaries in the markdown. For each posting:
- title: the job title as posted
- company: the REAL hiring company name (NOT invented)
- location: location string as posted
- region: USA | Europe | Australia | Global
- salaryText: salary if mentioned, else empty string
- sourcePlatform: "remoteok" | "weworkremotely" | "other"
- sourceUrl: the job URL if visible, else the board URL
- snippet: 1-2 sentence description
- fitReason: why this matches the ICP
- postedAt: posting time if visible

Only include REAL postings visible in the markdown. Do NOT invent. If 0 found, return {"jobs": []}.

Return STRICT JSON: {"jobs": [{...}]}`

async function scrapeWithCrawl4aiAndLlm(
  icp: ScrapedJobInput,
  source: { name: string; build: (icp: ScrapedJobInput) => string }
): Promise<ScrapedJobOutput[]> {
  const url = source.build(icp)
  let markdown = ''

  // Try crawl4ai first, then Jina Reader
  try {
    markdown = await fetchWithCrawl4ai(url)
  } catch {
    // Fallback to Jina Reader
    try {
      const jinaRes = await fetch(`${JINA_READER_BASE}${url}`, {
        headers: { 'X-Return-Format': 'markdown', Accept: 'text/markdown' },
        signal: AbortSignal.timeout(20_000),
      })
      if (jinaRes.ok) markdown = await jinaRes.text()
    } catch {
      // Both failed
    }
  }

  if (!markdown || markdown.length < 500) return []

  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: PARSE_PROMPT },
      {
        role: 'user',
        content: `ICP: "${icp.name}" (roles: ${icp.roleTypes.join(', ')}, region: ${icp.regions[0] || 'Global'})\nSource: ${source.name}\n\n--- MARKDOWN ---\n${markdown.slice(0, 15000)}\n--- END ---\n\nExtract REAL job postings as strict JSON.`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as { jobs?: ScrapedJobOutput[] }
  if (!Array.isArray(parsed.jobs)) return []

  const platform = source.name.includes('weworkremotely') ? 'weworkremotely' : 'remoteok'
  return parsed.jobs
    .filter((j) => j && typeof j.title === 'string' && typeof j.company === 'string')
    .slice(0, 10)
    .map((j) => ({
      title: String(j.title).slice(0, 200),
      company: String(j.company).slice(0, 200),
      location: String(j.location ?? '').slice(0, 200),
      region: (['USA', 'Europe', 'Australia', 'Global'].includes(j.region as string) ? j.region : 'Global') as string,
      salaryText: String(j.salaryText ?? '').slice(0, 100),
      sourcePlatform: platform as 'remoteok' | 'weworkremotely',
      sourceUrl: String(j.sourceUrl ?? url),
      snippet: String(j.snippet ?? '').slice(0, 500),
      fitReason: String(j.fitReason ?? `Matches ICP "${icp.name}"`).slice(0, 500),
      postedAt: String(j.postedAt ?? '').slice(0, 50),
    }))
}

// ==================== SOURCE 2b: curated lead lists ====================
// The priority sources Oceans uses to find companies actively hiring in US startups:
//   - Ramp monthly vendor reports, Harmonic Hot 25, Founders You Should Know,
//     Next Play / Early Days / a16z Build newsletters, HN "Who's Hiring"
//   - VC portfolio job boards: Sequoia, a16z, Index, Greylock, YC
// Each list names hiring companies; the LLM extracts the REAL ones matching the ICP
// (role type, industry, remote). We fetch via Jina Reader (free, no key) and record
// the source list URL on each job so it's always traceable.

const CURATED_LISTS: Array<{
  name: string
  sourcePlatform: string // stored on the job
  url: string
  kind: 'company-list' | 'job-board'
}> = [
  // --- VC portfolio job boards (structured, best targets) ---
  { name: 'Sequoia portfolio jobs', sourcePlatform: 'vc-portfolio', url: 'https://jobs.sequoiacap.com', kind: 'job-board' },
  { name: 'a16z portfolio jobs', sourcePlatform: 'vc-portfolio', url: 'https://portfolio-jobs.a16z.com', kind: 'job-board' },
  { name: 'Index Ventures jobs', sourcePlatform: 'vc-portfolio', url: 'https://jobs.indexventures.com', kind: 'job-board' },
  { name: 'Greylock jobs', sourcePlatform: 'vc-portfolio', url: 'https://jobs.greylock.com', kind: 'job-board' },
  { name: 'YC jobs directory', sourcePlatform: 'yc', url: 'https://www.ycombinator.com/jobs', kind: 'job-board' },
  // --- Curated lists / directories (name hiring companies) ---
  { name: 'Harmonic Hot 25', sourcePlatform: 'harmonic', url: 'https://harmonic.ai/hot-25-startups', kind: 'company-list' },
  { name: 'Founders You Should Know', sourcePlatform: 'newsletter', url: 'https://foundersysk.com', kind: 'company-list' },
  { name: 'Ramp vendor report', sourcePlatform: 'ramp', url: 'https://ramp.com/data', kind: 'company-list' },
  { name: 'Next Play newsletter', sourcePlatform: 'newsletter', url: 'https://nextplay.substack.com', kind: 'company-list' },
  { name: 'Early Days newsletter', sourcePlatform: 'newsletter', url: 'https://earlydaysbymerlin.substack.com', kind: 'company-list' },
  { name: 'a16z Build newsletter', sourcePlatform: 'newsletter', url: 'https://a16zbuild.substack.com', kind: 'company-list' },
  { name: 'HN Who's Hiring', sourcePlatform: 'newsletter', url: 'https://news.ycombinator.com/jobs', kind: 'job-board' },
]

const CURATED_PARSE_PROMPT = `You are a sourcing analyst for Oceans, a headhunting firm placing Sri Lankan talent with US startups. You receive raw markdown fetched from a list of companies / a job board (Ramp, Harmonic Hot 25, Sequoia/a16z/Index/Greylock portfolio jobs, YC, Founders You Should Know, etc.).

Extract the REAL open roles or hiring companies visible in the markdown that match the given ICP (role type + industries + remote). For each, capture the actual company name and role as written. Do NOT invent. Prefer roles that are remote and match the ICP's role types.

For each role/company found, return:
- title: the role title as posted (should relate to the ICP role types)
- company: the REAL hiring company name (NOT invented)
- location: location string as posted, or "Remote" if the list is remote-first
- region: USA | Europe | Australia | Global
- salaryText: salary if mentioned, else empty string
- snippet: 1-2 sentence summary from the listing
- fitReason: one sentence why this matches the ICP
- postedAt: posting date if visible, else empty string

If nothing relevant is found, return {"jobs": []}.

Return STRICT JSON only: {"jobs": [{...}]}`

async function fetchMarkdown(url: string): Promise<string> {
  // Try crawl4ai first (better JS rendering), fall back to Jina Reader.
  try {
    const md = await fetchWithCrawl4ai(url)
    if (md && md.length > 500) return md
  } catch {
    // fall through to Jina
  }
  const res = await fetch(`${JINA_READER_BASE}${url}`, {
    headers: { 'X-Return-Format': 'markdown', Accept: 'text/markdown' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`fetch ${url} HTTP ${res.status}`)
  return (await res.text()).slice(0, 16000)
}

async function scrapeWithCuratedLists(
  icp: ScrapedJobInput
): Promise<ScrapedJobOutput[]> {
  const zai = await getZai()
  const icpBlock = `ICP "${icp.name}" — role types: ${icp.roleTypes.join(', ') || 'any'}; industries: ${icp.industries.join(', ') || 'any'}; regions: ${icp.regions.join(', ') || 'any'}; remote only: ${icp.remoteOnly ? 'yes' : 'no'}`

  const allJobs: ScrapedJobOutput[] = []

  // Fetch up to 3 lists in sequence (keep latency reasonable). Stop early once we
  // have enough matching jobs.
  for (const list of CURATED_LISTS) {
    if (allJobs.length >= 8) break
    try {
      const markdown = await fetchMarkdown(list.url)
      if (!markdown || markdown.length < 500) continue

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: CURATED_PARSE_PROMPT },
          {
            role: 'user',
            content: `${icpBlock}\nSource list: ${list.name} (${list.url})\n\n--- MARKDOWN ---\n${markdown.slice(0, 13000)}\n--- END ---\n\nExtract REAL matching roles as strict JSON.`,
          },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content ?? ''
      const parsed = extractJson(content) as { jobs?: ScrapedJobOutput[] }
      if (!Array.isArray(parsed.jobs)) continue

      for (const j of parsed.jobs) {
        if (!j || typeof j.title !== 'string' || typeof j.company !== 'string') continue
        if (allJobs.length >= 8) break
        allJobs.push({
          title: String(j.title).slice(0, 200),
          company: String(j.company).slice(0, 200),
          location: String(j.location ?? 'Remote').slice(0, 200),
          region: (['USA', 'Europe', 'Australia', 'Global'].includes(j.region as string)
            ? j.region
            : 'Global') as string,
          salaryText: String(j.salaryText ?? '').slice(0, 100),
          sourcePlatform: list.sourcePlatform as ScrapedJobOutput['sourcePlatform'],
          sourceUrl: list.url, // traceable back to the list that surfaced it
          snippet: String(j.snippet ?? '').slice(0, 500),
          fitReason: String(j.fitReason ?? `Surfaced via ${list.name}`).slice(0, 500),
          postedAt: String(j.postedAt ?? '').slice(0, 50),
        })
      }
    } catch {
      // this list failed; try the next
    }
  }

  return allJobs
}

// ==================== MAIN: multi-source fallback chain ====================

export async function scrapeJobsWithAgentReach(
  icp: ScrapedJobInput
): Promise<{ jobs: ScrapedJobOutput[]; source: string }> {
  const errors: string[] = []

  // Source 1: RemoteOK JSON API (fastest, structured data)
  try {
    const jobs = await scrapeWithRemoteOkApi(icp)
    if (jobs.length > 0) {
      return { jobs, source: 'remoteok-api' }
    }
    errors.push('remoteok-api: 0 jobs')
  } catch (e) {
    errors.push(`remoteok-api: ${e instanceof Error ? e.message : 'failed'}`)
  }

  // Source 2: curated lead lists (Ramp, Harmonic Hot 25, VC portfolio boards,
  // FYSK, YC, newsletters, HN Who's Hiring). These name companies actively hiring;
  // the LLM extracts real ones matching the ICP.
  try {
    const jobs = await scrapeWithCuratedLists(icp)
    if (jobs.length > 0) {
      return { jobs, source: 'curated-lists' }
    }
    errors.push('curated-lists: 0 jobs')
  } catch (e) {
    errors.push(`curated-lists: ${e instanceof Error ? e.message : 'failed'}`)
  }

  // Source 3-5: crawl4ai + LLM on multiple job boards (fallback chain)
  for (const boardSource of JOB_BOARD_URLS) {
    try {
      const jobs = await scrapeWithCrawl4aiAndLlm(icp, boardSource)
      if (jobs.length > 0) {
        return { jobs, source: `crawl4ai:${boardSource.name}` }
      }
      errors.push(`${boardSource.name}: 0 jobs`)
    } catch (e) {
      errors.push(`${boardSource.name}: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }

  // All sources failed — return empty (the route will fall back to LLM-simulated)
  console.error('[agent-reach] all sources failed:', errors.join('; '))
  return { jobs: [], source: 'failed' }
}
