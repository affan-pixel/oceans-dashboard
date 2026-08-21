// Ocean Talent — Prisma record → DTO mappers
// SQLite cannot store arrays, so JSON string fields are parsed back into arrays here.
// All DTOs match the shapes exported from src/lib/types.ts.

import type {
  ActivityDTO,
  ApprovalRequestDTO,
  BriefDTO,
  CandidateDTO,
  ExternalProspectDTO,
  IcpConfigDTO,
  JobDescriptionDTO,
  JobTargetDTO,
  LeadDTO,
  MatchDTO,
  MatchResultDTO,
  OutreachStepDTO,
  ReferrerDTO,
  ScrapedJobDTO,
  SignalDTO,
} from './types'

// ---------------- helpers ----------------

function parseArray(v: unknown): string[] {
  if (typeof v !== 'string') return []
  if (!v) return []
  try {
    const parsed = JSON.parse(v)
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).filter((x) => x.length > 0)
    }
    return []
  } catch {
    return []
  }
}

// Parse the JSON-string referrers column into typed ReferrerDTO[].
function parseReferrers(v: unknown): ReferrerDTO[] {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed = JSON.parse(v)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r) => r && typeof r === 'object' && typeof r.name === 'string')
      .map((r) => ({
        name: String(r.name).slice(0, 120),
        title: String(r.title ?? '').slice(0, 200),
        linkedinUrl: String(r.linkedinUrl ?? '').slice(0, 500),
        relation: String(r.relation ?? '').slice(0, 200),
        reason: String(r.reason ?? '').slice(0, 500),
        isSample: r.isSample === true,
      }))
      .slice(0, 8)
  } catch {
    return []
  }
}

// ---------------- Agent 2: Talent Matcher ----------------

export function toCandidateDTO(c: {
  id: string
  name: string
  headline: string
  email: string | null
  phone: string | null
  location: string
  linkedinUrl: string | null
  githubUrl: string | null
  rawProfile: string
  outcomes: string
  skills: string
  tools: string
  companyStages: string
  rolesFit: string
  workContext: string
  searchBlob: string
  status: string
  tags: string
  pool: string
  redactedProfile: string | null
  createdAt: Date
  updatedAt: Date
}): CandidateDTO {
  return {
    id: c.id,
    name: c.name,
    headline: c.headline,
    email: c.email,
    phone: c.phone,
    location: c.location,
    linkedinUrl: c.linkedinUrl,
    githubUrl: c.githubUrl,
    rawProfile: c.rawProfile,
    outcomes: parseArray(c.outcomes),
    skills: parseArray(c.skills),
    tools: parseArray(c.tools),
    companyStages: parseArray(c.companyStages),
    rolesFit: parseArray(c.rolesFit),
    workContext: c.workContext,
    searchBlob: c.searchBlob,
    status: c.status,
    tags: parseArray(c.tags),
    pool: c.pool,
    redactedProfile: c.redactedProfile,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function toJdDTO(j: {
  id: string
  title: string
  company: string | null
  rawText: string
  outcomes: string
  mandatorySkills: string
  niceToHave: string
  context: string
  signals: string
  searchBlob: string
  status: string
  isActive: boolean
  priority: string
  notes: string | null
  targetId: string | null
  source: string
  createdAt: Date
  updatedAt: Date
}): JobDescriptionDTO {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    rawText: j.rawText,
    outcomes: parseArray(j.outcomes),
    mandatorySkills: parseArray(j.mandatorySkills),
    niceToHave: parseArray(j.niceToHave),
    context: j.context,
    signals: parseArray(j.signals),
    searchBlob: j.searchBlob,
    status: j.status,
    isActive: j.isActive,
    priority: j.priority,
    notes: j.notes,
    targetId: j.targetId,
    source: j.source,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  }
}

export function toJobTargetDTO(t: {
  id: string
  name: string
  description: string | null
  roleTypes: string
  stages: string
  industries: string
  regions: string
  salaryMinUsd: number | null
  remoteOnly: boolean
  signals: string
  keywords: string
  scrapeStatus: string
  lastScrapedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): JobTargetDTO {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    roleTypes: parseArray(t.roleTypes),
    stages: parseArray(t.stages),
    industries: parseArray(t.industries),
    regions: parseArray(t.regions),
    salaryMinUsd: t.salaryMinUsd,
    remoteOnly: t.remoteOnly,
    signals: parseArray(t.signals),
    keywords: parseArray(t.keywords),
    scrapeStatus: t.scrapeStatus,
    lastScrapedAt: t.lastScrapedAt ? t.lastScrapedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

export function toScrapedJobDTO(s: {
  id: string
  jobTargetId: string
  title: string
  company: string
  location: string | null
  region: string | null
  salaryText: string | null
  sourcePlatform: string
  sourceUrl: string | null
  snippet: string
  fitReason: string | null
  jdId: string | null
  status: string
  postedAt: string | null
  scrapeSource: string | null
  dmName: string | null
  dmTitle: string | null
  dmLinkedinUrl: string | null
  dmNotes: string | null
  dmIsSample: boolean
  referrers: string | null
  outreachStatus: string | null
  outreachContent: string | null
  outreachSentAt: Date | null
  seniority: string | null
  skillsRequired: string
  timezone: string | null
  firstSeenAt: Date
  lastSeenAt: Date
  timesSeen: number
  ageBand: string
  stillLive: boolean
  postedByName: string | null
  postedByTitle: string | null
  postedByUrl: string | null
  postedByKind: string | null
  isOnCompanyPage: boolean
  leadScore: number
  createdAt: Date
}): ScrapedJobDTO {
  return {
    id: s.id,
    jobTargetId: s.jobTargetId,
    title: s.title,
    company: s.company,
    location: s.location,
    region: s.region,
    salaryText: s.salaryText,
    sourcePlatform: s.sourcePlatform,
    sourceUrl: s.sourceUrl,
    snippet: s.snippet,
    fitReason: s.fitReason,
    jdId: s.jdId,
    status: s.status,
    postedAt: s.postedAt,
    scrapeSource: s.scrapeSource,
    dmName: s.dmName,
    dmTitle: s.dmTitle,
    dmLinkedinUrl: s.dmLinkedinUrl,
    dmNotes: s.dmNotes,
    dmIsSample: s.dmIsSample,
    referrers: parseReferrers(s.referrers),
    outreachStatus: s.outreachStatus,
    outreachContent: s.outreachContent,
    outreachSentAt: s.outreachSentAt ? s.outreachSentAt.toISOString() : null,
    seniority: s.seniority,
    skillsRequired: parseArray(s.skillsRequired),
    timezone: s.timezone,
    firstSeenAt: s.firstSeenAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    timesSeen: s.timesSeen,
    ageBand: s.ageBand,
    stillLive: s.stillLive,
    postedByName: s.postedByName,
    postedByTitle: s.postedByTitle,
    postedByUrl: s.postedByUrl,
    postedByKind: s.postedByKind,
    isOnCompanyPage: s.isOnCompanyPage,
    leadScore: s.leadScore,
    createdAt: s.createdAt.toISOString(),
  }
}

export function toBriefDTO(b: {
  id: string
  title: string
  content: string
  type: string
  linkedJdId: string | null
  createdAt: Date
  updatedAt: Date
}): BriefDTO {
  return {
    id: b.id,
    title: b.title,
    content: b.content,
    type: b.type,
    linkedJdId: b.linkedJdId,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

export function toMatchResultDTO(
  r: {
    id: string
    candidateId: string
    score: number
    reasoning: string
    strengths: string
    gaps: string
    rank: number
    matchType: string
    priceRangeUsd: string | null
    fitStatus: string
    candidate: {
      name: string
      headline: string
      location: string
      pool?: string
      redactedProfile?: string | null
    }
  }
): MatchResultDTO {
  return {
    id: r.id,
    candidateId: r.candidateId,
    candidateName: r.candidate.name,
    candidateHeadline: r.candidate.headline,
    candidateLocation: r.candidate.location,
    candidatePool: r.candidate.pool,
    score: r.score,
    rank: r.rank,
    reasoning: r.reasoning,
    strengths: parseArray(r.strengths),
    gaps: parseArray(r.gaps),
    matchType: r.matchType,
    priceRangeUsd: r.priceRangeUsd,
    fitStatus: r.fitStatus,
    candidateRedactedProfile: r.candidate.redactedProfile,
  }
}

export function toApprovalRequestDTO(a: {
  id: string
  matchId: string
  matchResultId: string | null
  candidateId: string | null
  stage: string
  channel: string
  slackChannel: string | null
  slackMessageTs: string | null
  status: string
  decidedBy: string | null
  decidedAt: Date | null
  note: string | null
  createdAt: Date
}): ApprovalRequestDTO {
  return {
    id: a.id,
    matchId: a.matchId,
    matchResultId: a.matchResultId,
    candidateId: a.candidateId,
    stage: a.stage,
    channel: a.channel,
    slackChannel: a.slackChannel,
    slackMessageTs: a.slackMessageTs,
    status: a.status,
    decidedBy: a.decidedBy,
    decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }
}

export function toExternalProspectDTO(p: {
  id: string
  matchId: string
  name: string
  headline: string
  location: string | null
  sourceUrl: string | null
  sourcePlatform: string
  snippet: string
  fitReason: string | null
  score: number
  status: string
  createdAt: Date
}): ExternalProspectDTO {
  return {
    id: p.id,
    matchId: p.matchId,
    name: p.name,
    headline: p.headline,
    location: p.location,
    sourceUrl: p.sourceUrl,
    sourcePlatform: p.sourcePlatform,
    snippet: p.snippet,
    fitReason: p.fitReason,
    score: p.score,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }
}

export function toMatchDTO(
  m: {
    id: string
    jobDescriptionId: string
    status: string
    summary: string | null
    internalStrength: string | null
    externalScrapeStatus: string
    createdAt: Date
    jobDescription: {
      title: string
      company: string | null
    }
    results: Array<ReturnType<typeof toMatchResultDTO>>
    externalProspects?: Array<ReturnType<typeof toExternalProspectDTO>>
  }
): MatchDTO {
  return {
    id: m.id,
    jobDescriptionId: m.jobDescriptionId,
    jobTitle: m.jobDescription.title,
    company: m.jobDescription.company,
    status: m.status,
    summary: m.summary,
    internalStrength: m.internalStrength,
    externalScrapeStatus: m.externalScrapeStatus,
    createdAt: m.createdAt.toISOString(),
    results: m.results,
    externalProspects: m.externalProspects ?? [],
  }
}

// ---------------- Agent 1: Customer Finder ----------------

export function toSignalDTO(s: {
  id: string
  leadId: string
  type: string
  title: string
  description: string
  source: string | null
  weight: number
  capturedAt: Date
}): SignalDTO {
  return {
    id: s.id,
    leadId: s.leadId,
    type: s.type,
    title: s.title,
    description: s.description,
    source: s.source,
    weight: s.weight,
    capturedAt: s.capturedAt.toISOString(),
  }
}

export function toOutreachDTO(o: {
  id: string
  leadId: string
  step: number
  channel: string
  action: string
  content: string | null
  status: string
  scheduledAt: Date | null
  sentAt: Date | null
  createdAt: Date
}): OutreachStepDTO {
  return {
    id: o.id,
    leadId: o.leadId,
    step: o.step,
    channel: o.channel,
    action: o.action,
    content: o.content,
    status: o.status,
    scheduledAt: o.scheduledAt ? o.scheduledAt.toISOString() : null,
    sentAt: o.sentAt ? o.sentAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
  }
}

export function toLeadDTO(l: {
  id: string
  companyName: string
  domain: string | null
  website: string | null
  industry: string | null
  stage: string | null
  sizeMin: number | null
  sizeMax: number | null
  location: string | null
  region: string | null
  icpScore: number
  priority: string
  status: string
  sourceStrategy: string | null
  mirroredFromClientId: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  signals?: Array<Parameters<typeof toSignalDTO>[0]>
  outreachSteps?: Array<Parameters<typeof toOutreachDTO>[0]>
}): LeadDTO {
  return {
    id: l.id,
    companyName: l.companyName,
    domain: l.domain,
    website: l.website,
    industry: l.industry,
    stage: l.stage,
    sizeMin: l.sizeMin,
    sizeMax: l.sizeMax,
    location: l.location,
    region: l.region,
    icpScore: l.icpScore,
    priority: l.priority,
    status: l.status,
    sourceStrategy: l.sourceStrategy,
    mirroredFromClientId: l.mirroredFromClientId,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    signals: (l.signals ?? []).map(toSignalDTO),
    outreachSteps: (l.outreachSteps ?? []).map(toOutreachDTO),
  }
}

// ---------------- ICP + Activity ----------------

export function toIcpDTO(i: {
  id: string
  sizeMin: number
  sizeMax: number
  stages: string
  locations: string
  industries: string
  hiringPattern: string
  budgetMinUsd: number
  pain: string
}): IcpConfigDTO {
  return {
    id: i.id,
    sizeMin: i.sizeMin,
    sizeMax: i.sizeMax,
    stages: parseArray(i.stages),
    locations: parseArray(i.locations),
    industries: parseArray(i.industries),
    hiringPattern: i.hiringPattern,
    budgetMinUsd: i.budgetMinUsd,
    pain: i.pain,
  }
}

export function toActivityDTO(a: {
  id: string
  agent: string
  type: string
  message: string
  meta: string | null
  createdAt: Date
}): ActivityDTO {
  return {
    id: a.id,
    agent: a.agent,
    type: a.type,
    message: a.message,
    meta: a.meta,
    createdAt: a.createdAt.toISOString(),
  }
}
