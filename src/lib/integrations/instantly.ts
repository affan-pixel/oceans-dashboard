// Instantly adapter — cold-email sequencing (instantly.ai).
// https://developer.instantly.ai/
//
// Key flow: add a lead (the decision maker on a scraped job) to an Instantly
// campaign; Instantly runs the multi-step email sequence from there.

const BASE = 'https://api.instantly.ai/api/v1'

export interface InstantlyCampaign {
  id: string
  name: string
}

/** List campaigns (so the UI can pick which one leads go into). */
export async function listInstantlyCampaigns(apiKey: string): Promise<InstantlyCampaign[]> {
  const res = await fetch(`${BASE}/campaign/get/all?apiKey=${encodeURIComponent(apiKey)}`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Instantly list campaigns HTTP ${res.status}`)
  const data = (await res.json()) as { data?: Array<{ id?: string; name?: string }> }
  return (data.data ?? [])
    .filter((c) => c.id)
    .map((c) => ({ id: String(c.id), name: String(c.name ?? 'Unnamed campaign') }))
}

/**
 * Push a lead into an Instantly campaign.
 * personalization keys become {{variables}} usable in the Instantly sequence,
 * e.g. {{company}} {{role}} {{signal}}.
 */
export async function addLeadToInstantlyCampaign(opts: {
  apiKey: string
  campaignId: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  website?: string
  personalization?: Record<string, string>
}): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/lead/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: opts.apiKey,
      campaign_id: opts.campaignId,
      leads: [
        {
          email: opts.email,
          first_name: opts.firstName ?? '',
          last_name: opts.lastName ?? '',
          company: opts.company ?? '',
          website: opts.website ?? '',
          personalization: opts.personalization ?? {},
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string }
  if (!res.ok || body.status === 'error') {
    return { ok: false, message: body.message ?? `Instantly HTTP ${res.status}` }
  }
  return { ok: true, message: 'Lead added to Instantly campaign.' }
}
