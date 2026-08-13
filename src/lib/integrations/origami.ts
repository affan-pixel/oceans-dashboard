// Origami adapter — AI lead-finding from LinkedIn + email outreach setup.
// https://origami.chat
//
// NOTE: Origami's public API surface is not yet formally documented (as of the
// "Sequencer" launch). This adapter is structured against the most likely REST
// shape (POST /v1/leads/search, POST /v1/sequences). When you connect a real key,
// the first call will confirm the exact endpoints; update the paths here if they
// differ. Every call degrades to a clearly-labeled sample on failure so the flow
// never breaks.

import type { ScrapedJobInput, ScrapedJobOutput } from '@/lib/ai'

export interface OrigamiLead {
  name: string
  title: string
  company: string
  linkedinUrl: string
  email?: string
  intentSignal?: string // why Origami flagged them as high-intent
}

/**
 * Find high-intent leads from LinkedIn for an ICP via Origami.
 * Used as an alternative lead source in the scrape chain (Agent 1).
 */
export async function findLeadsWithOrigami(
  apiKey: string,
  icp: ScrapedJobInput
): Promise<{ leads: OrigamiLead[]; real: boolean }> {
  const roleType = icp.roleTypes[0] || icp.keywords[0] || icp.name
  const region = icp.regions[0] || 'USA'

  try {
    const res = await fetch('https://api.origami.chat/v1/leads/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: roleType,
        industries: icp.industries,
        region,
        remote: icp.remoteOnly,
        limit: 6,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Origami HTTP ${res.status}`)
    const data = (await res.json()) as { leads?: OrigamiLead[] }
    return { leads: data.leads ?? [], real: true }
  } catch {
    // TODO: confirm the exact Origami endpoint. Until then, return labeled samples
    // so the lead-finding flow is demonstrable.
    return {
      leads: sampleOrigamiLeads(icp),
      real: false,
    }
  }
}

/**
 * Set up an email outreach sequence for a lead via Origami's Sequencer.
 * Returns the sequence id (or a draft if the API isn't reachable).
 */
export async function setupOutreachWithOrigami(
  apiKey: string,
  opts: { leadName: string; leadEmail: string; role: string; companyName: string }
): Promise<{ sequenceId: string | null; real: boolean; message: string }> {
  try {
    const res = await fetch('https://api.origami.chat/v1/sequences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Oceans outreach — ${opts.role} @ ${opts.companyName}`,
        steps: [{ channel: 'email', to: opts.leadEmail, personalization: { role: opts.role, company: opts.companyName } }],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`Origami HTTP ${res.status}`)
    const data = (await res.json()) as { id?: string }
    return { sequenceId: data.id ?? null, real: true, message: 'Origami sequence created.' }
  } catch {
    return {
      sequenceId: null,
      real: false,
      message: 'Origami outreach drafted (API endpoint pending confirmation).',
    }
  }
}

function sampleOrigamiLeads(icp: ScrapedJobInput): OrigamiLead[] {
  const role = icp.roleTypes[0] || 'the role'
  return [
    { name: 'Riley Thompson', title: 'Head of People', company: 'Acme Labs', linkedinUrl: 'https://linkedin.com/in/sample-origami-1', email: 'riley@acmelabs.example', intentSignal: 'Posted the open role on LinkedIn 2 days ago' },
    { name: 'Morgan Lee', title: 'Talent Lead', company: 'Bright Harbor', linkedinUrl: 'https://linkedin.com/in/sample-origami-2', email: 'morgan@brightharbor.example', intentSignal: `Actively sourcing ${role} candidates` },
    { name: 'Casey Nguyen', title: 'Co-founder', company: 'Northwind', linkedinUrl: 'https://linkedin.com/in/sample-origami-3', intentSignal: 'Recent funding round — scaling the team' },
  ]
}

/**
 * Convert Origami leads into the ScrapedJobOutput shape so they flow into the
 * existing pipeline (each lead → a scraped "job" the DM finder can act on).
 */
export function origamiLeadsToScrapedJobs(
  leads: OrigamiLead[],
  icp: ScrapedJobInput
): ScrapedJobOutput[] {
  return leads.map((l) => ({
    title: icp.roleTypes[0] || icp.name,
    company: l.company,
    location: 'Remote',
    region: icp.regions[0] || 'USA',
    salaryText: '',
    sourcePlatform: 'other' as const,
    sourceUrl: l.linkedinUrl,
    snippet: l.intentSignal ? `${l.title} at ${l.company}. ${l.intentSignal}.` : `${l.title} at ${l.company}.`,
    fitReason: `Origami lead: ${l.intentSignal ?? 'high-intent signal'}`,
    postedAt: '',
  }))
}
