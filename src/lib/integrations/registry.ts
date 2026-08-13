// Integration adapter registry.
// Each adapter wraps a third-party app's REST API. The app gracefully falls back
// to LLM-simulated behavior when an integration is not connected.
//
// To add a new integration:
//   1. Create src/lib/integrations/{provider}.ts exporting an IntegrationAdapter
//   2. Register it in REGISTRY below
//   3. (optional) wire it into a flow via getIntegration() + isConnected()

export type Provider = 'apify' | 'apollo' | 'lemlist' | 'hubspot' | 'clay'

export interface IntegrationConfig {
  provider: Provider
  label: string
  description: string
  docsUrl: string
  keyLabel: string // e.g. "API Token"
  keyPlaceholder: string
  category: 'scraping' | 'enrichment' | 'outreach' | 'crm'
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
}

export const ALL_PROVIDERS: Provider[] = ['apify', 'apollo', 'lemlist', 'hubspot', 'clay']
