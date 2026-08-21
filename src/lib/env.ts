// Typed environment config — single source of truth for all API keys.
// Every key is OPTIONAL. Each feature checks its own flag and degrades gracefully.
//
// Two ways keys enter the system:
//   1. Env vars below (recommended for Railway / production).
//   2. The Integrations UI (encrypted in the DB via crypto.ts) — used at runtime
//      by isConnected()/getApiKey() in integrations/db.ts.
// Where both exist, the Integrations UI value (DB) takes precedence because it's
// the one the user actively configured.

function b(v: string | undefined): string | undefined {
  const t = (v ?? '').trim()
  return t.length > 0 ? t : undefined
}

export const env = {
  databaseUrl: process.env.DATABASE_URL!,

  // LLM (z-ai-web-dev-sdk)
  zaiApiKey: b(process.env.ZAI_API_KEY),
  zaiBaseUrl: b(process.env.ZAI_BASE_URL) ?? 'https://api.z.ai/api/paas/v4',

  // Encryption
  integrationEncryptionKey: b(process.env.INTEGRATION_ENCRYPTION_KEY),

  // Scraping
  apifyApiKey: b(process.env.APIFY_API_KEY),
  firecrawlApiKey: b(process.env.FIRECRAWL_API_KEY),

  // AI lead-finding + outreach (origami.chat)
  origamiApiKey: b(process.env.ORIGAMI_API_KEY),

  // Notifications + approvals
  slackBotToken: b(process.env.SLACK_BOT_TOKEN),
  slackSigningSecret: b(process.env.SLACK_SIGNING_SECRET),
  slackChannel: b(process.env.SLACK_CHANNEL) ?? '#oceans-deals',

  // CRM + email
  hubspotAccessToken: b(process.env.HUBSPOT_ACCESS_TOKEN),
  instantlyApiKey: b(process.env.INSTANTLY_API_KEY),
  instantlyCampaignId: b(process.env.INSTANTLY_CAMPAIGN_ID),

  // Talent pool (Workable)
  workableApiKey: b(process.env.WORKABLE_API_KEY),
  workableSubdomain: b(process.env.WORKABLE_SUBDOMAIN),

  // Seed gate
  enableSeedEndpoint: process.env.ENABLE_SEED_ENDPOINT === 'true',

  // Derived: which integrations are available via ENV (vs needing the Integrations UI)
  hasLlm: !!b(process.env.ZAI_API_KEY),
  hasApify: !!b(process.env.APIFY_API_KEY),
  hasFirecrawl: !!b(process.env.FIRECRAWL_API_KEY),
  hasOrigami: !!b(process.env.ORIGAMI_API_KEY),
  hasSlack: !!b(process.env.SLACK_BOT_TOKEN),
  hasHubspot: !!b(process.env.HUBSPOT_ACCESS_TOKEN),
  hasInstantly: !!b(process.env.INSTANTLY_API_KEY),
  hasWorkable: !!b(process.env.WORKABLE_API_KEY),
}

// True when NODE_ENV=production — used to harden endpoints.
export const isProd = process.env.NODE_ENV === 'production'
