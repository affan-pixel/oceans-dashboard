// Ocean Talent — AI library (server-only)
// Uses z-ai-web-dev-sdk to power the Talent Matcher agent:
//   - parseJD: extract structured outcomes/skills/context/signals from raw JD text
//   - structureCandidate: structure a raw CV into outcome-based format
//   - matchCandidates: rank candidates against a JD with explanation per candidate
//
// CRITICAL: z-ai-web-dev-sdk MUST run on the server. Never import this from a client component.

import ZAI from 'z-ai-web-dev-sdk'
import type {
  StructuredJD,
  StructuredCandidate,
  MatchResultDTO,
  ReferrerDTO,
} from './types'

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

// The z-ai-web-dev-sdk reads config from a .z-ai-config file. For Railway / any
// host where keys come in as env vars, we materialize that file from ZAI_API_KEY
// + ZAI_BASE_URL on first use. If a .z-ai-config already exists (local dev), it
// takes precedence and we don't overwrite.
async function ensureZaiConfig() {
  const zaiKey = (process.env.ZAI_API_KEY ?? '').trim()
  if (!zaiKey) return // nothing to do; the SDK will throw its usual config error
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const configPath = path.join(process.cwd(), '.z-ai-config')
  try {
    await fs.access(configPath)
    return // file already exists — respect it
  } catch {
    // file missing — write one from env
  }
  const baseUrl = (process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/paas/v4').trim()
  await fs.writeFile(
    configPath,
    JSON.stringify({ baseUrl, apiKey: zaiKey }),
    { mode: 0o600 }
  )
}

async function getZai() {
  if (!_zai) {
    await ensureZaiConfig()
    _zai = await ZAI.create()
  }
  return _zai
}

// Robust JSON extraction — the model occasionally wraps JSON in markdown fences.
function extractJson(text: string): unknown {
  if (!text) throw new Error('Empty AI response')
  let t = text.trim()
  // strip ```json ... ``` fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  // find first { or [ and last } or ]
  const firstObj = t.indexOf('{')
  const firstArr = t.indexOf('[')
  let start = -1
  if (firstObj === -1) start = firstArr
  else if (firstArr === -1) start = firstObj
  else start = Math.min(firstObj, firstArr)
  if (start === -1) throw new Error('No JSON found in AI response')
  const last = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'))
  const slice = t.slice(start, last + 1)
  return JSON.parse(slice)
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean)
    } catch {
      /* ignore */
    }
    return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

// ---------------- Agent 2 / Step 1: JD Parsing ----------------

const JD_SYSTEM_PROMPT = `You are the JD parser for Ocean Talent, a headhunting firm placing Sri Lankan talent with companies in the USA, Europe, and Australia.

Your job: read a job description and extract what the company ACTUALLY NEEDS — not the words they used. Most companies write JDs that miss the real requirements. You surface the underlying outcomes, mandatory vs nice-to-have skills, the company context, and hidden signals.

Hidden signals are phrases like "scrappy", "zero to one", "no playbook", "wear many hats", "founder mindset", "self-directed", "builder" — they tell us about the environment the person will work in, not the skills.

Return STRICT JSON only, no prose, with this exact shape:
{
  "title": "string — the role title as written",
  "outcomes": ["string — each outcome the company needs, phrased as a deliverable e.g. 'own the outbound pipeline end-to-end'"],
  "mandatorySkills": ["string"],
  "niceToHave": ["string"],
  "context": "string — stage of company, team size, budget signals inferred from the JD",
  "signals": ["string — hidden signals detected, e.g. 'scrappy', 'zero-to-one', 'generalist-builder'"]
}`

export async function parseJD(rawText: string): Promise<StructuredJD> {
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: JD_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse this job description into structured outcomes:\n\n---\n${rawText}\n---`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as Partial<StructuredJD>

  const outcomes = asStringArray(parsed.outcomes)
  const mandatorySkills = asStringArray(parsed.mandatorySkills)
  const niceToHave = asStringArray(parsed.niceToHave)
  const signals = asStringArray(parsed.signals)
  const title = (parsed.title ?? 'Untitled Role').toString().slice(0, 200)
  const context = (parsed.context ?? '').toString()

  const searchBlob = [
    title,
    outcomes.join('. '),
    mandatorySkills.join(', '),
    niceToHave.join(', '),
    context,
    signals.join(', '),
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()

  return {
    title,
    outcomes,
    mandatorySkills,
    niceToHave,
    context,
    signals,
    searchBlob,
  }
}

// ---------------- Agent 2 / Step 2: Candidate Profile Structuring ----------------

const CANDIDATE_SYSTEM_PROMPT = `You are the candidate profile structurer for Ocean Talent, a headhunting firm placing Sri Lankan talent with companies in the USA, Europe, and Australia.

Your job: read a raw candidate profile / CV / LinkedIn export and convert it into an OUTCOME-BASED structured profile. Most CVs list duties. You surface what the person has ACTUALLY BUILT or DELIVERED, the tools they used, the stage of companies they worked in, and the roles they could fill — even if they have never had that exact title.

This is critical: a "Growth Lead" might be the best "GTM Engineer" if they built outbound pipelines from scratch. You surface the underlying capability.

Return STRICT JSON only, no prose, with this exact shape:
{
  "outcomes": ["string — each deliverable/accomplishment, phrased as an outcome e.g. 'built outbound cold-email pipeline from zero to 10k sends/month'"],
  "skills": ["string — capabilities e.g. 'outbound prospecting', 'SQL', 'copywriting'"],
  "tools": ["string — specific tools e.g. 'Apollo', 'Clay', 'HubSpot', 'React', 'Postgres'"],
  "companyStages": ["string — one of: early (pre-seed/seed), growth (Series A-B), scaled (Series C+ or public)"],
  "rolesFit": ["string — roles this person could fill even without the title e.g. 'GTM Engineer', 'RevOps Manager', 'Founding AE'"],
  "workContext": "string — one sentence: what environment they work best in (e.g. 'Thrives in early-stage, scrappy, builder-heavy teams with no playbook.')"
}`

export async function structureCandidate(rawProfile: string): Promise<StructuredCandidate> {
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: CANDIDATE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Structure this candidate profile into outcome-based format:\n\n---\n${rawProfile}\n---`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as Partial<StructuredCandidate>

  const outcomes = asStringArray(parsed.outcomes)
  const skills = asStringArray(parsed.skills)
  const tools = asStringArray(parsed.tools)
  const companyStages = asStringArray(parsed.companyStages)
  const rolesFit = asStringArray(parsed.rolesFit)
  const workContext = (parsed.workContext ?? '').toString()

  const searchBlob = [
    outcomes.join('. '),
    skills.join(', '),
    tools.join(', '),
    rolesFit.join(', '),
    workContext,
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()

  return { outcomes, skills, tools, companyStages, rolesFit, workContext, searchBlob }
}

// ---------------- Agent 2 / Step 3: Semantic Matching ----------------

export interface CandidateForMatch {
  id: string
  name: string
  headline: string
  location: string
  outcomes: string[]
  skills: string[]
  tools: string[]
  companyStages: string[]
  rolesFit: string[]
  workContext: string
}

const MATCH_SYSTEM_PROMPT = `You are the semantic match ranker for Ocean Talent, a headhunting firm placing Sri Lankan talent with companies in the USA, Europe, and Australia.

You receive a STRUCTURED job description (outcomes the company needs) and a list of STRUCTURED candidate profiles (outcomes they have delivered). Your job is to rank the candidates by SEMANTIC FIT — meaning how well what they have DONE matches what the company NEEDS. This is NOT keyword matching. "built outbound pipeline" should match "created cold email sequences from scratch" because they mean the same thing.

For each candidate, produce:
- score: integer 0-100 (semantic fit, not keyword overlap)
- reasoning: ONE paragraph (3-5 sentences) explaining WHY they match — reference specific outcomes from both sides
- strengths: 2-4 bullet strings
- gaps: 0-3 bullet strings (what's missing vs the JD)

Then return a ranked list (best first). Return AT MOST the top 5. Only include candidates with score >= 35.

Return STRICT JSON only, no prose, with this exact shape:
{
  "summary": "string — one sentence overall summary of the shortlist",
  "ranked": [
    {
      "candidateId": "string",
      "score": 0,
      "reasoning": "string",
      "strengths": ["string"],
      "gaps": ["string"]
    }
  ]
}`

export async function matchCandidates(
  jd: StructuredJD,
  candidates: CandidateForMatch[]
): Promise<{ summary: string; ranked: Omit<MatchResultDTO, 'id' | 'candidateName' | 'candidateHeadline' | 'candidateLocation' | 'rank'>[] }> {
  if (candidates.length === 0) {
    return { summary: 'No candidates to match against.', ranked: [] }
  }

  const zai = await getZai()
  const jdBlock = JSON.stringify(
    {
      title: jd.title,
      outcomes: jd.outcomes,
      mandatorySkills: jd.mandatorySkills,
      niceToHave: jd.niceToHave,
      context: jd.context,
      signals: jd.signals,
    },
    null,
    2
  )
  const candBlock = JSON.stringify(
    candidates.map((c) => ({
      id: c.id,
      name: c.name,
      headline: c.headline,
      location: c.location,
      outcomes: c.outcomes,
      skills: c.skills,
      tools: c.tools,
      companyStages: c.companyStages,
      rolesFit: c.rolesFit,
      workContext: c.workContext,
    })),
    null,
    2
  )

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: MATCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `JOB DESCRIPTION (structured):\n${jdBlock}\n\nCANDIDATES (structured):\n${candBlock}\n\nRank the candidates by semantic fit. Return the top 5 with score, reasoning, strengths, and gaps.`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as {
    summary?: string
    ranked?: Array<{
      candidateId?: string
      score?: number
      reasoning?: string
      strengths?: unknown
      gaps?: unknown
    }>
  }

  const summary = (parsed.summary ?? 'Shortlist generated.').toString()
  const ranked = Array.isArray(parsed.ranked)
    ? parsed.ranked
        .filter((r) => r && typeof r.candidateId === 'string')
        .map((r) => ({
          candidateId: String(r.candidateId),
          score: Math.max(0, Math.min(100, Math.round(Number(r.score ?? 0)))),
          reasoning: (r.reasoning ?? '').toString(),
          strengths: asStringArray(r.strengths),
          gaps: asStringArray(r.gaps),
        }))
    : []

  return { summary, ranked }
}

// ---------------- Outreach message drafter (Agent 1 support) ----------------

export async function draftOutreachEmail(opts: {
  companyName: string
  industry: string | null
  stage: string | null
  signal: string
  role: string
}): Promise<string> {
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: `You write concise, personalised cold outreach emails for Oceans, a headhunting firm placing Sri Lankan talent with companies in the USA, Europe, and Australia. Emails are 90-130 words, no fluff, one clear CTA (a 15-min intro call). Never use the word "revolutionary" or "game-changing". Sound like a human, not a template.`,
      },
      {
        role: 'user',
        content: `Draft a first-touch outreach email to ${opts.companyName} (${opts.industry ?? 'SaaS'}, ${opts.stage ?? 'Series A'}). 

Trigger signal: ${opts.signal}
Role they likely need: ${opts.role}

Reference the signal in the first sentence. Connect it to Oceans' track record of placing Sri Lankan talent at remote-first companies. End with a soft ask for a 15-minute call. Sign off as "Affan, Oceans".`,
      },
    ],
    thinking: { type: 'disabled' },
  })
  return (completion.choices[0]?.message?.content ?? '').trim()
}

// ---------------- Agent 2 / Step 4 (supplement): External Prospect Scraping ----------------
// When internal matching is weak, this simulates scraping LinkedIn / Indeed / Wellfound for
// external candidates who match the JD. In production this would hit real sourcing APIs;
// here the LLM generates realistic prospect cards based on the JD so the flow is demonstrable.
// Each prospect is clearly a SIMULATED external profile, not a real person.

export interface ScrapedProspect {
  name: string
  headline: string
  location: string
  sourcePlatform: 'linkedin' | 'indeed' | 'wellfound' | 'github' | 'other'
  sourceUrl: string
  snippet: string
  fitReason: string
  score: number
}

const SCRAPE_SYSTEM_PROMPT = `You are the external prospect scraper for Oceans, a headhunting firm placing Sri Lankan talent with companies in the USA, Europe, and Australia.

Context: the Talent Matcher has already ranked Oceans' INTERNAL candidate pool against a job description. The internal match was WEAK or only partially covered the role. Your job is to SIMULATE scraping external sources (LinkedIn, Indeed, Wellfound, GitHub) for 3-5 additional prospects who could fit this JD.

IMPORTANT: These are SIMULATED prospect profiles for demonstration of the sourcing flow. Generate realistic but clearly fictional profiles — do NOT impersonate real people. Use plausible South-Asian/Sri-Lankan names and realistic headlines. Each prospect must have a different platform and a short snippet that reads like a LinkedIn/Indeed summary.

For each prospect, provide:
- name: a realistic full name (NOT a real public figure)
- headline: their current/most recent role title
- location: a city (preferably Sri Lankan or South Asian, or remote)
- sourcePlatform: one of linkedin | indeed | wellfound | github | other (vary across prospects)
- sourceUrl: a plausible-looking URL on that platform (fake but well-formed)
- snippet: 1-2 sentence bio summary as it would appear on the platform
- fitReason: one sentence on why this prospect fits THIS specific JD (reference the outcomes)
- score: integer 0-100 estimated fit

Return STRICT JSON only, no prose:
{
  "prospects": [
    { "name": "...", "headline": "...", "location": "...", "sourcePlatform": "linkedin", "sourceUrl": "https://linkedin.com/in/...", "snippet": "...", "fitReason": "...", "score": 0 }
  ]
}`

export async function scrapeExternalProspects(
  jd: StructuredJD,
  internalStrength: 'weak' | 'moderate'
): Promise<ScrapedProspect[]> {
  const zai = await getZai()
  const jdBlock = JSON.stringify(
    {
      title: jd.title,
      outcomes: jd.outcomes,
      mandatorySkills: jd.mandatorySkills,
      niceToHave: jd.niceToHave,
      context: jd.context,
      signals: jd.signals,
    },
    null,
    2
  )

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: SCRAPE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Internal match was ${internalStrength.toUpperCase()}. The internal pool did not fully cover this role. Simulate scraping external sources for 3-5 additional prospects who fit this JD:\n\n${jdBlock}\n\nReturn the prospects as strict JSON.`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as { prospects?: ScrapedProspect[] }
  if (!Array.isArray(parsed.prospects)) return []
  return parsed.prospects
    .filter((p) => p && typeof p.name === 'string')
    .slice(0, 5)
    .map((p) => ({
      name: String(p.name).slice(0, 120),
      headline: String(p.headline ?? '').slice(0, 200),
      location: String(p.location ?? ''),
      sourcePlatform: (['linkedin', 'indeed', 'wellfound', 'github', 'other'].includes(
        p.sourcePlatform as string
      )
        ? p.sourcePlatform
        : 'other') as ScrapedProspect['sourcePlatform'],
      sourceUrl: String(p.sourceUrl ?? ''),
      snippet: String(p.snippet ?? '').slice(0, 500),
      fitReason: String(p.fitReason ?? '').slice(0, 500),
      score: Math.max(0, Math.min(100, Math.round(Number(p.score ?? 0)))),
    }))
}

// ---------------- Agent 1 / Step 1: Job scraping per ICP ----------------
// Each role-side ICP (EA, Marketing, Finance, Ops, CS, GTM) drives its own scrape.
// In production this would hit LinkedIn Jobs / Indeed / Wellfound APIs.
// Here the LLM simulates realistic job postings matching the ICP's criteria so the flow is demonstrable.
// All generated postings are FICTIONAL but realistic — no real companies impersonated.

export interface ScrapedJobInput {
  name: string
  description: string | null
  roleTypes: string[]
  industries: string[]
  regions: string[]
  salaryMinUsd: number | null
  remoteOnly: boolean
  signals: string[]
  keywords: string[]
}

export interface ScrapedJobOutput {
  title: string
  company: string
  location: string
  region: string
  salaryText: string
  sourcePlatform:
    | 'linkedin'
    | 'indeed'
    | 'wellfound'
    | 'github'
    | 'remoteok'
    | 'weworkremotely'
    | 'vc-portfolio'
    | 'yc'
    | 'harmonic'
    | 'ramp'
    | 'newsletter'
    | 'other'
  sourceUrl: string
  snippet: string
  fitReason: string
  postedAt: string
}

const SCRAPE_JOBS_SYSTEM_PROMPT = `You are the job-scraper agent for Oceans, a headhunting firm placing Sri Lankan talent (Divers) with companies in the USA, Europe, and Australia.

Context: Oceans has multiple role-side ICPs (Ideal Customer Profiles for roles): Executive Assistants (EA+), Marketing, Finance, Operations, Customer Success, GTM/Sales. Each ICP has its own criteria (role types, industries, regions, signals, keywords). Your job is to SIMULATE scraping LinkedIn Jobs, Indeed, and Wellfound for 4-6 open job postings that match a SPECIFIC ICP's criteria.

IMPORTANT: These are SIMULATED job postings for demonstration. Generate realistic but clearly FICTIONAL postings — do NOT use real company names (use plausible invented startup names). Vary the platforms across postings (LinkedIn, Indeed, Wellfound). Each posting should clearly match the ICP's role types and keywords.

For each posting, provide:
- title: the role title as posted (should match one of the ICP's roleTypes)
- company: a fictional but plausible startup name (NOT a real company)
- location: a city or "Remote — <region>"
- region: one of USA | Europe | Australia | Global
- salaryText: a raw salary string e.g. "$90k-$120k" or "£60k-£80k" or "A$100k-A$130k"
- sourcePlatform: one of linkedin | indeed | wellfound (vary across postings)
- sourceUrl: a plausible-looking URL on that platform (fake but well-formed)
- snippet: 1-2 sentence job description summary
- fitReason: one sentence on why this posting matches the ICP
- postedAt: an ISO date string for when it was posted (within the last 14 days)

Return STRICT JSON only, no prose:
{
  "jobs": [
    { "title": "...", "company": "...", "location": "...", "region": "...", "salaryText": "...", "sourcePlatform": "linkedin", "sourceUrl": "...", "snippet": "...", "fitReason": "...", "postedAt": "..." }
  ]
}`

export async function scrapeJobsForIcp(icp: ScrapedJobInput): Promise<ScrapedJobOutput[]> {
  const zai = await getZai()
  const icpBlock = JSON.stringify(
    {
      name: icp.name,
      description: icp.description,
      roleTypes: icp.roleTypes,
      industries: icp.industries,
      regions: icp.regions,
      salaryMinUsd: icp.salaryMinUsd,
      remoteOnly: icp.remoteOnly,
      signals: icp.signals,
      keywords: icp.keywords,
    },
    null,
    2
  )

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: SCRAPE_JOBS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Simulate scraping job boards for 4-6 open postings matching this ICP:\n\n${icpBlock}\n\nReturn the jobs as strict JSON.`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = extractJson(content) as { jobs?: ScrapedJobOutput[] }
  if (!Array.isArray(parsed.jobs)) return []
  return parsed.jobs
    .filter((j) => j && typeof j.title === 'string' && typeof j.company === 'string')
    .slice(0, 6)
    .map((j) => ({
      title: String(j.title).slice(0, 200),
      company: String(j.company).slice(0, 200),
      location: String(j.location ?? '').slice(0, 200),
      region: (['USA', 'Europe', 'Australia', 'Global'].includes(j.region as string) ? j.region : 'Global') as string,
      salaryText: String(j.salaryText ?? '').slice(0, 100),
      sourcePlatform: (['linkedin', 'indeed', 'wellfound', 'github', 'other'].includes(
        j.sourcePlatform as string
      )
        ? j.sourcePlatform
        : 'other') as ScrapedJobOutput['sourcePlatform'],
      sourceUrl: String(j.sourceUrl ?? ''),
      snippet: String(j.snippet ?? '').slice(0, 500),
      fitReason: String(j.fitReason ?? '').slice(0, 500),
      postedAt: String(j.postedAt ?? '').slice(0, 50),
    }))
}

// ---------------- Agent 1 / Step 2: Find the decision maker ----------------
// Searches the public web (DuckDuckGo via Jina Reader) for the person who owns
// the hire at a company, then extracts their real name, title, and LinkedIn URL.
// Falls back to regex scanning for linkedin.com/in/ patterns if the LLM misses it.

const JINA_READER_BASE = 'https://r.jina.ai/'

async function searchWeb(query: string): Promise<string> {
  // Jina Reader can fetch a DuckDuckGo HTML search results page as markdown.
  const url = `${JINA_READER_BASE}https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'X-Return-Format': 'markdown', Accept: 'text/markdown' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`search HTTP ${res.status}`)
  return (await res.text()).slice(0, 12000)
}

function extractFirstLinkedinUrl(text: string): string | null {
  const m = text.match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_\-%]+\/?/i)
  return m ? m[0] : null
}

export interface DecisionMakerSuggestion {
  dmName: string
  dmTitle: string
  dmLinkedinUrl: string
  dmNotes: string
  isSample?: boolean // true when this is labeled sample data (real lookup unavailable)
}

// ---- Labeled sample data ----
// When the real lookup can't run (no LLM key, search empty, etc.), we return
// clearly-labeled SAMPLE data so the dashboard always shows the shape of the
// opportunity and the demo flow is never broken. These are NOT real people —
// the isSample flag lets the UI mark them as samples.

function sampleDecisionMaker(company: string, roleTitle: string): DecisionMakerSuggestion {
  return {
    dmName: 'Alex Chen',
    dmTitle: 'Co-founder & CEO',
    dmLinkedinUrl: 'https://www.linkedin.com/in/sample-decision-maker',
    dmNotes: `Likely owner of the ${roleTitle} hire at ${company}. Co-founder — typically the right first contact for an early-stage role. (Sample — run with an LLM key to find the real person.)`,
    isSample: true,
  }
}

function sampleReferrers(company: string): ReferrerDTO[] {
  return [
    {
      name: 'Jordan Patel',
      title: 'Partner at Sequoia Capital',
      linkedinUrl: 'https://www.linkedin.com/in/sample-referrer-1',
      relation: `Board member / investor at ${company}.`,
      reason: 'Investors regularly make talent intros to their portfolio CEOs — a warm path to the decision maker.',
      isSample: true,
    },
    {
      name: 'Sam Rivera',
      title: 'EIR at Y Combinator',
      linkedinUrl: 'https://www.linkedin.com/in/sample-referrer-2',
      relation: `Mentored ${company} through an accelerator batch.`,
      reason: 'YC partners know the founders well and can vouch for Oceans informally.',
      isSample: true,
    },
    {
      name: 'Taylor Kim',
      title: 'Founder, acquired by ' + company,
      linkedinUrl: 'https://www.linkedin.com/in/sample-referrer-3',
      relation: `Prior colleague of the ${company} founding team.`,
      reason: 'Worked closely with leadership — a credible second-degree warm intro.',
      isSample: true,
    },
  ]
}

const DM_SYSTEM_PROMPT = `You are the decision-maker finder for Oceans, a headhunting firm. You receive web search results (markdown) about a company that is hiring. Identify the SINGLE person most likely to own or influence this hire — typically a founder, CEO, COO, or the head of the relevant function (e.g. VP Marketing for a marketing role).

Extract their REAL details from the search results. Do NOT invent. If the results don't name a person, return empty strings.

Return STRICT JSON only:
{
  "dmName": "Full name, or empty string if unknown",
  "dmTitle": "Their title e.g. 'Co-founder & CEO', or empty string",
  "dmLinkedinUrl": "Their LinkedIn profile URL if visible, or empty string",
  "dmNotes": "One sentence on why this person is the right contact + any context from the results"
}`

export async function findDecisionMaker(opts: {
  company: string
  roleTitle: string
  location?: string | null
}): Promise<DecisionMakerSuggestion> {
  // Try three query variants in order — specific title, then founder, then CEO.
  const queries = [
    `"${opts.company}" "${opts.roleTitle}" hiring manager linkedin`,
    `"${opts.company}" founder linkedin`,
    `"${opts.company}" CEO linkedin`,
  ]

  let markdown = ''
  for (const q of queries) {
    try {
      markdown = await searchWeb(q)
      if (markdown && markdown.length > 400) break
    } catch {
      // try next variant
    }
  }

  // No search results → return labeled sample so the UI always shows a person.
  if (!markdown || markdown.length < 400) {
    return sampleDecisionMaker(opts.company, opts.roleTitle)
  }

  let parsed: Partial<DecisionMakerSuggestion>
  try {
    const zai = await getZai()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: DM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Company: ${opts.company}\nRole being hired: ${opts.roleTitle}\nLocation: ${opts.location ?? 'unknown'}\n\n--- SEARCH RESULTS ---\n${markdown}\n--- END ---\n\nIdentify the decision maker. Return strict JSON.`,
        },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content ?? ''
    parsed = extractJson(content) as Partial<DecisionMakerSuggestion>
  } catch {
    // LLM unavailable (no key) or errored → labeled sample.
    return sampleDecisionMaker(opts.company, opts.roleTitle)
  }

  const dmName = (parsed.dmName ?? '').toString().slice(0, 120)
  const dmTitle = (parsed.dmTitle ?? '').toString().slice(0, 200)
  let dmLinkedinUrl = (parsed.dmLinkedinUrl ?? '').toString().slice(0, 500)
  if (!dmLinkedinUrl) dmLinkedinUrl = extractFirstLinkedinUrl(markdown) ?? ''
  const dmNotes = (parsed.dmNotes ?? '').toString().slice(0, 500)

  // LLM returned blanks → labeled sample.
  if (!dmName && !dmTitle) {
    return sampleDecisionMaker(opts.company, opts.roleTitle)
  }

  return { dmName, dmTitle, dmLinkedinUrl, dmNotes }
}

// ---------------- Agent 1 / Step 2b: Find warm-intro referrers ----------------
// For a given company + decision maker, surface people who could recommend Oceans
// for an introduction — e.g. founders/investors/advisors connected to the company,
// or prior colleagues of the decision maker. These are the "who knows someone there"
// paths. Uses the same web-search → LLM-extract pattern.

const REFERRERS_SYSTEM_PROMPT = `You are the warm-intro researcher for Oceans, a headhunting firm placing Sri Lankan talent with US/EU/AU startups. You receive web search results about a hiring company (and optionally its decision maker).

Your job: identify 1-4 REAL people who could introduce Oceans to this company — e.g.:
- The company's investors / board members / advisors
- Accelerator partners (YC, etc.) if the company went through one
- Mutual connections or prior colleagues of the decision maker
- Well-known operators who have publicly mentored or spoken about the company

Only include people whose name + role you can see in the results. Do NOT invent. For each, explain the relation (how they connect to the company/DM) and why they could make an intro.

Return STRICT JSON only:
{
  "referrers": [
    { "name": "...", "title": "their role e.g. 'Partner at Sequoia'", "linkedinUrl": "LinkedIn URL if visible, else empty string", "relation": "how they connect to the company/DM", "reason": "why they could intro Oceans" }
  ]
}`

export async function findReferrers(opts: {
  company: string
  dmName?: string | null
  dmTitle?: string | null
}): Promise<ReferrerDTO[]> {
  const queries = [
    `"${opts.company}" investors board advisors`,
    `"${opts.company}" "${opts.dmName ?? 'founder'}" previous company colleague`,
    `"${opts.company}" Y Combinator Sequoia a16z funding`,
  ]

  let markdown = ''
  for (const q of queries) {
    try {
      const md = await searchWeb(q)
      if (md && md.length > 400) {
        markdown += `\n\n--- query: ${q} ---\n${md}`
        if (markdown.length > 20000) break
      }
    } catch {
      // try next
    }
  }

  // No search results → labeled samples so the warm-intro panel is never empty.
  if (markdown.length < 400) return sampleReferrers(opts.company)

  let parsed: { referrers?: Array<Record<string, unknown>> }
  try {
    const zai = await getZai()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: REFERRERS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Company: ${opts.company}\nDecision maker: ${opts.dmName ?? 'unknown'} (${opts.dmTitle ?? 'unknown'})\n\n--- SEARCH RESULTS ---\n${markdown.slice(0, 18000)}\n--- END ---\n\nIdentify 1-4 potential referrers. Return strict JSON.`,
        },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content ?? ''
    parsed = extractJson(content) as { referrers?: Array<Record<string, unknown>> }
  } catch {
    // LLM unavailable (no key) or errored → labeled samples.
    return sampleReferrers(opts.company)
  }

  if (!Array.isArray(parsed.referrers) || parsed.referrers.length === 0) {
    return sampleReferrers(opts.company)
  }

  return parsed.referrers
    .filter((r) => r && typeof r.name === 'string' && (r.name as string).length > 0)
    .slice(0, 4)
    .map((r) => {
      let linkedinUrl = String(r.linkedinUrl ?? '').slice(0, 500)
      if (!linkedinUrl) linkedinUrl = extractFirstLinkedinUrl(String(r.title ?? '') + ' ' + String(r.name ?? '')) ?? ''
      return {
        name: String(r.name).slice(0, 120),
        title: String(r.title ?? '').slice(0, 200),
        linkedinUrl,
        relation: String(r.relation ?? '').slice(0, 200),
        reason: String(r.reason ?? '').slice(0, 500),
      }
    })
}
