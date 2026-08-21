// Ocean Talent — shared types & API contract
// Used by both backend (API routes + AI lib) and frontend (components).

// ---------- Agent 2: Talent Matcher ----------

export interface StructuredJD {
  title: string;
  outcomes: string[];          // what the company actually needs (not the title)
  mandatorySkills: string[];
  niceToHave: string[];
  context: string;             // stage / team size / budget
  signals: string[];           // hidden signals: "scrappy", "zero to one", "no playbook"
  searchBlob: string;          // concatenated searchable text
}

export interface StructuredCandidate {
  outcomes: string[];          // what they have actually built/delivered
  skills: string[];
  tools: string[];
  companyStages: string[];     // early | growth | scaled
  rolesFit: string[];          // roles they could fill (even without the title)
  workContext: string;
  searchBlob: string;
}

export interface MatchResultDTO {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateHeadline: string;
  candidateLocation: string;
  candidatePool?: string;      // port | lagoon (from the candidate)
  score: number;               // 0-100
  rank: number;
  reasoning: string;           // one paragraph why they match
  strengths: string[];
  gaps: string[];
  matchType: string;           // port | lagoon | market (step 7)
  priceRangeUsd: string | null;
  fitStatus: string;           // pending | approved | rejected (step 5)
  candidateRedactedProfile?: string | null; // redacted markdown if generated
}

export interface MatchDTO {
  id: string;
  jobDescriptionId: string;
  jobTitle: string;
  company: string | null;
  status: string;
  summary: string | null;
  internalStrength: string | null;      // "strong" | "moderate" | "weak"
  externalScrapeStatus: string;         // none | requested | done | failed
  createdAt: string;
  results: MatchResultDTO[];
  externalProspects: ExternalProspectDTO[];
}

export interface CandidateDTO {
  id: string;
  name: string;
  headline: string;
  email: string | null;
  phone: string | null;
  location: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  rawProfile: string;
  outcomes: string[];
  skills: string[];
  tools: string[];
  companyStages: string[];
  rolesFit: string[];
  workContext: string;
  searchBlob: string;
  status: string;
  tags: string[];
  pool: string;              // port | lagoon
  redactedProfile: string | null; // Oceans-branded redacted markdown (step 6)
  createdAt: string;
  updatedAt: string;
}

export interface JobDescriptionDTO {
  id: string;
  title: string;
  company: string | null;
  rawText: string;
  outcomes: string[];
  mandatorySkills: string[];
  niceToHave: string[];
  context: string;
  signals: string[];
  searchBlob: string;
  status: string;
  isActive: boolean;             // is this an active search ("a job I'm looking for")?
  priority: string;              // high | medium | low
  notes: string | null;          // freeform notes about this search
  targetId: string | null;       // optional link to a JobTarget
  source: string;                // agent | sales_team | client — where the job came from
  createdAt: string;
  updatedAt: string;
}

export interface ExternalProspectDTO {
  id: string;
  matchId: string;
  name: string;
  headline: string;
  location: string | null;
  sourceUrl: string | null;
  sourcePlatform: string;        // linkedin | indeed | wellfound | github | other
  snippet: string;
  fitReason: string | null;
  score: number;                 // 0-100
  status: string;                // new | reviewed | promoted | rejected
  createdAt: string;
}

export interface JobTargetDTO {
  id: string;
  name: string;
  description: string | null;
  roleTypes: string[];           // e.g. ["Executive Assistant","EA+"]
  stages: string[];              // e.g. ["Series A","Seed"]
  industries: string[];          // e.g. ["SaaS","Fintech"]
  regions: string[];             // e.g. ["USA","Europe"]
  salaryMinUsd: number | null;
  remoteOnly: boolean;
  signals: string[];             // e.g. ["scrappy","zero-to-one"]
  keywords: string[];            // freeform keywords to watch
  scrapeStatus: string;          // idle | running | done | failed
  lastScrapedAt: string | null;
  scrapedJobsCount?: number;     // optional — count of new scraped jobs
  createdAt: string;
  updatedAt: string;
}

export interface ReferrerDTO {
  name: string;
  title: string;
  linkedinUrl: string;
  relation: string;   // how they connect to the company / decision maker
  reason: string;     // why they could intro Oceans
  isSample?: boolean; // true when this is labeled sample data (real lookup unavailable)
}

// ---- Steps 5 + 8: Approval requests (Oceans team fit-check + leadership sign-off) ----
export interface ApprovalRequestDTO {
  id: string;
  matchId: string;
  matchResultId: string | null;
  candidateId: string | null;
  stage: string;        // profile_review | leadership
  channel: string;      // in_app | slack
  slackChannel: string | null;
  slackMessageTs: string | null;
  status: string;       // pending | approved | rejected
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface ScrapedJobDTO {
  id: string;
  jobTargetId: string;
  title: string;
  company: string;
  location: string | null;
  region: string | null;
  salaryText: string | null;
  sourcePlatform: string;        // linkedin | indeed | wellfound | remoteok | weworkremotely | vc-portfolio | yc | newsletter | ramp | harmonic | other
  sourceUrl: string | null;
  snippet: string;
  fitReason: string | null;
  jdId: string | null;           // if converted into a JD
  status: string;                // new | dm_found | outreach_sent | replied | converted | dismissed
  postedAt: string | null;
  scrapeSource: string | null;   // remoteok-api | crawl4ai:* | jina | firecrawl | apify | vc-portfolio | yc | ramp | harmonic | newsletter | simulated
  // Decision maker (pipeline Step 2)
  dmName: string | null;
  dmTitle: string | null;
  dmLinkedinUrl: string | null;
  dmNotes: string | null;
  dmIsSample: boolean;
  // Warm-intro referrers (who can recommend Oceans for an intro)
  referrers: ReferrerDTO[];
  // Outreach (pipeline Step 3)
  outreachStatus: string | null;
  outreachContent: string | null;
  outreachSentAt: string | null;
  // Step 2: Categorization
  seniority: string | null;
  skillsRequired: string[];
  timezone: string | null;
  // Agent 1: persistence tracking
  firstSeenAt: string;
  lastSeenAt: string;
  timesSeen: number;
  ageBand: string;            // fresh | week | month | quarter | stuck
  stillLive: boolean;
  // Agent 1: who posted it
  postedByName: string | null;
  postedByTitle: string | null;
  postedByUrl: string | null;
  postedByKind: string | null; // hr | founder | ceo | recruiter | other
  isOnCompanyPage: boolean;
  // Agent 1: lead scoring
  leadScore: number;
  createdAt: string;
}

export interface ActivityDTO {
  id: string;
  agent: string;               // customer_finder | talent_matcher | system
  type: string;
  message: string;
  meta: string | null;
  createdAt: string;
}

// ---------- Integrations ----------

export interface IntegrationDTO {
  provider: string;            // apify | clay | slack | hubspot | instantly
  label: string;
  description: string;
  docsUrl: string;
  category: string;            // scraping | enrichment | outreach | crm
  capabilities: string[];
  keyLabel: string;
  keyPlaceholder: string;
  status: string;              // connected | disconnected | error
  keyHint: string | null;      // masked, e.g. "••••2a"
  lastSyncedAt: string | null;
  lastError: string | null;
}

// ---------- Dashboard ----------

export interface DashboardStatsDTO {
  totalLeads: number;            // scraped jobs not dismissed — a job IS a lead
  hotLeads: number;              // still live and open 3+ months
  contactedLeads: number;
  repliedLeads: number;
  convertedLeads: number;
  totalCandidates: number;
  activeCandidates: number;
  placedCandidates: number;
  totalJds: number;
  activeJds: number;             // JDs flagged isActive=true ("jobs I'm looking for")
  totalMatches: number;
  totalJobTargets: number;
  recentActivities: ActivityDTO[];
  leadsByRegion: { region: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  leadsByAgeBand: { ageBand: string; count: number }[];
  // Latest scraped jobs — surfaced on the dashboard so scraped leads are visible
  // immediately (with posting link + decision maker + referrers), not just Pipeline.
  latestScrapedJobs: ScrapedJobDTO[];
}
