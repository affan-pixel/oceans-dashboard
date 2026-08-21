// Integration adapter registry.
// Each adapter wraps a third-party app's REST API. The app gracefully falls back
// to LLM-simulated behavior when an integration is not connected.
//
// To add a new integration:
//   1. Create src/lib/integrations/{provider}.ts exporting an IntegrationAdapter
//   2. Register it in REGISTRY below
//   3. (optional) wire it into a flow via getIntegration() + isConnected()

export type Provider = 'apify' | 'clay' | 'slack' | 'hubspot' | 'instantly'

export interface IntegrationConfig {
  provider: Provider
  label: string
  description: string
  docsUrl: string
  keyLabel: string // e.g. "API Token"
  keyPlaceholder: string
  category: 'scraping' | 'enrichment' | 'crm' | 'messaging' | 'outreach'
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

  instantly: {
    provider: 'instantly',
    label: 'Instantly',
    description:
      'Cold-email sequencing — pushes scraped-job leads into an Instantly campaign (unlimited email sends).',
    docsUrl: 'https://developer.instantly.ai/',
    keyLabel: 'API Key',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'outreach',
    capabilities: ['outreach-send'],
    test: async (apiKey: string): Promise<TestResult> => {
      try {
        const res = await fetch(`https://api.instantly.ai/api/v1/campaign/get/all?apiKey=${encodeURIComponent(apiKey)}`, {
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) return { ok: false, message: `Instantly rejected the key (HTTP ${res.status}).` }
        return { ok: true, message: 'Connected to Instantly.', accountInfo: 'Key accepted.' }
      } catch {
        return { ok: false, message: 'Could not reach Instantly. Check the key and try again.' }
      }
    },
  },
}

export const ALL_PROVIDERS: Provider[] = [
  'apify', 'clay', 'slack', 'hubspot', 'instantly',
]
