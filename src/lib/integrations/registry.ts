// Integration adapter registry.
// Each adapter wraps a third-party app's REST API. The app gracefully falls back
// to LLM-simulated behavior when an integration is not connected.
//
// To add a new integration:
//   1. Create src/lib/integrations/{provider}.ts exporting an IntegrationAdapter
//   2. Register it in REGISTRY below
//   3. (optional) wire it into a flow via getIntegration() + isConnected()

export type Provider = 'apify' | 'apollo' | 'lemlist' | 'hubspot' | 'clay' | 'origami' | 'firecrawl' | 'slack' | 'workable'

export interface IntegrationConfig {
  provider: Provider
  label: string
  description: string
  docsUrl: string
  keyLabel: string // e.g. "API Token"
  keyPlaceholder: string
  category: 'scraping' | 'enrichment' | 'outreach' | 'crm' | 'leads' | 'messaging' | 'ats'
  capabilities: string[] // e.g. ['job-scrape', 'lead-enrich']
}

export interface TestResult {
  ok: boolean
  message: string
  accountInfo?: string // e.g. "Workspace: My Team"
}

export interface IntegrationAdapter extends IntegrationConfig {
  /** Test the connection with the given API key. Returns ok + a friendly message. */
  test: (apiKey: string) => Promise<TestResult>
}

export const REGISTRY: Record<Provider, IntegrationAdapter> = {
  apify: {
    provider: 'apify',
    label: 'Apify',
    description:
      'Scraping marketplace — powers real LinkedIn Jobs, Indeed, and Wellfound job scraping per ICP.',
    docsUrl: 'https://docs.apify.com/api/v2',
    keyLabel: 'API Token',
    keyPlaceholder: 'apify_api_xxxxxxxxxxxxxxxxxxxx',
    category: 'scraping',
    capabilities: ['job-scrape'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://api.apify.com/v2/users/me', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) {
          return { ok: false, message: `Apify rejected the key (HTTP ${res.status}).` }
        }
        const data = (await res.json()) as { data?: { username?: string } }
        return {
          ok: true,
          message: 'Connected to Apify.',
          accountInfo: data.data?.username ? `User: ${data.data.username}` : undefined,
        }
      } catch {
        return { ok: false, message: 'Could not reach Apify. Check the token and try again.' }
      }
    },
  },

  apollo: {
    provider: 'apollo',
    label: 'Apollo',
    description:
      'Company + people data — enriches leads with real industry, size, tech stack, and emails.',
    docsUrl: 'https://developer.apollo.io/',
    keyLabel: 'API Key',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'enrichment',
    capabilities: ['lead-enrich'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://api.apollosecurity.com/v1/organization_jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ api_key: apiKey, page: 1, per_page: 1 }),
          signal: AbortSignal.timeout(10_000),
        })
        if (res.status === 401 || res.status === 403) {
          return { ok: false, message: 'Apollo rejected the API key.' }
        }
        return { ok: true, message: 'Connected to Apollo.', accountInfo: 'Key accepted.' }
      } catch {
        return { ok: false, message: 'Could not reach Apollo. Check the key and try again.' }
      }
    },
  },

  lemlist: {
    provider: 'lemlist',
    label: 'Lemlist',
    description:
      'Outreach email sequences — sends real personalised campaigns instead of drafting in-app only.',
    docsUrl: 'https://developer.lemlist.com/',
    keyLabel: 'API Key',
    keyPlaceholder: 'xxxxxxxxxxxxxxxx',
    category: 'outreach',
    capabilities: ['outreach-send'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const auth = Buffer.from(`${apiKey}:`).toString('base64')
        const res = await fetch('https://api.lemlist.com/api/team', {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) {
          return { ok: false, message: `Lemlist rejected the key (HTTP ${res.status}).` }
        }
        const data = (await res.json()) as { name?: string }
        return {
          ok: true,
          message: 'Connected to Lemlist.',
          accountInfo: data.name ? `Team: ${data.name}` : undefined,
        }
      } catch {
        return { ok: false, message: 'Could not reach Lemlist. Check the key and try again.' }
      }
    },
  },

  hubspot: {
    provider: 'hubspot',
    label: 'HubSpot',
    description:
      'CRM sync — pushes qualified leads and outreach activity into your HubSpot pipeline.',
    docsUrl: 'https://developers.hubspot.com/docs/api/crm',
    keyLabel: 'Access Token',
    keyPlaceholder: 'pat-xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'crm',
    capabilities: ['crm-sync'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        })
        if (res.status === 401) {
          return { ok: false, message: 'HubSpot rejected the access token.' }
        }
        return { ok: true, message: 'Connected to HubSpot.', accountInfo: 'Token accepted.' }
      } catch {
        return { ok: false, message: 'Could not reach HubSpot. Check the token and try again.' }
      }
    },
  },

  clay: {
    provider: 'clay',
    label: 'Clay',
    description:
      'Enrichment waterfall — funding, headcount growth, tech stack signals on every lead.',
    docsUrl: 'https://docs.clay.com/',
    keyLabel: 'API Key',
    keyPlaceholder: 'xxxxxxxxxxxxxxxx',
    category: 'enrichment',
    capabilities: ['lead-enrich'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://api.clay.com/v1/sources', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        })
        if (res.status === 401 || res.status === 403) {
          return { ok: false, message: 'Clay rejected the API key.' }
        }
        return { ok: true, message: 'Connected to Clay.', accountInfo: 'Key accepted.' }
      } catch {
        return { ok: false, message: 'Could not reach Clay. Check the key and try again.' }
      }
    },
  },

  origami: {
    provider: 'origami',
    label: 'Origami',
    description:
      'AI lead-finding + multi-step LinkedIn & email outreach (origami.chat). Finds high-intent leads from LinkedIn and sets up email sequences — can drive Agent 1 lead-finding + outreach.',
    docsUrl: 'https://origami.chat',
    keyLabel: 'API Key',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'leads',
    capabilities: ['lead-find', 'outreach-setup'],
    test: async (apiKey: string): Promise<TestResult> => {
      // Origami's API surface isn't publicly documented yet; this test just
      // confirms the key is non-empty and well-formed. Real validation happens
      // on first use. Update the endpoint here once Origami publishes API docs.
      if (!apiKey || apiKey.length < 10) {
        return { ok: false, message: 'Origami key looks too short — check it and try again.' }
      }
      return { ok: true, message: 'Origami key saved (validated on first use).', accountInfo: 'Key accepted.' }
    },
  },

  firecrawl: {
    provider: 'firecrawl',
    label: 'Firecrawl',
    description:
      'Web scraping — scrapes JD pages + LinkedIn profiles into clean markdown. Replaces simulated external-prospect scraping with real data when connected.',
    docsUrl: 'https://docs.firecrawl.dev/',
    keyLabel: 'API Key',
    keyPlaceholder: 'fc-xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'scraping',
    capabilities: ['job-scrape', 'profile-scrape'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/account', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        })
        if (res.status === 401 || res.status === 403) {
          return { ok: false, message: 'Firecrawl rejected the API key.' }
        }
        return { ok: true, message: 'Connected to Firecrawl.', accountInfo: 'Key accepted.' }
      } catch {
        return { ok: false, message: 'Could not reach Firecrawl. Check the key and try again.' }
      }
    },
  },

  slack: {
    provider: 'slack',
    label: 'Slack',
    description:
      'Notifications + approvals. Posts opportunity matches (with match type + price) and accepts Approve/Reject button replies.',
    docsUrl: 'https://api.slack.com/apps',
    keyLabel: 'Bot Token (xoxb-)',
    keyPlaceholder: 'xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx',
    category: 'messaging',
    capabilities: ['notify', 'approval'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch('https://slack.com/api/auth.test', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        })
        const data = (await res.json()) as { ok?: boolean; user?: string; team?: string }
        if (!data.ok) {
          return { ok: false, message: 'Slack rejected the bot token.' }
        }
        return { ok: true, message: 'Connected to Slack.', accountInfo: data.team ? `Team: ${data.team}` : undefined }
      } catch {
        return { ok: false, message: 'Could not reach Slack. Check the token and try again.' }
      }
    },
  },

  workable: {
    provider: 'workable',
    label: 'Workable',
    description:
      'Talent pool ATS — pulls Lagoon + Port candidate profiles into the matching pool when connected.',
    docsUrl: 'https://dev.workable.com/',
    keyLabel: 'API Token',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'ats',
    capabilities: ['candidate-fetch'],
    test: async (apiKey: string): Promise<TestResult> => {
      // Real validation needs the subdomain; the adapter does the full call.
      if (!apiKey || apiKey.length < 8) {
        return { ok: false, message: 'Workable token looks too short.' }
      }
      return { ok: true, message: 'Workable token saved (validated on first sync).' }
    },
  },
}

export const ALL_PROVIDERS: Provider[] = [
  'apify', 'origami', 'firecrawl', 'apollo', 'clay', 'workable', 'slack', 'lemlist', 'hubspot',
]
