// Helpers to read integration state from the DB and decrypt keys.
// Server-only.

import { db } from '@/lib/db'
import { decrypt, maskKey } from '@/lib/crypto'
import { REGISTRY, type Provider } from './registry'

export interface IntegrationRecord {
  provider: Provider
  label: string
  status: 'connected' | 'disconnected' | 'error'
  keyHint: string | null
  lastSyncedAt: Date | null
  lastError: string | null
  config: Record<string, unknown>
}

/** Returns the decrypted API key for a provider, or null if not connected. */
export async function getApiKey(provider: Provider): Promise<string | null> {
  const row = await db.integration.findUnique({ where: { provider } })
  if (!row || row.status !== 'connected' || !row.apiKeyEnc) return null
  return decrypt(row.apiKeyEnc)
}

/** Is a provider connected and ready to use? */
export async function isConnected(provider: Provider): Promise<boolean> {
  const row = await db.integration.findUnique({ where: { provider } })
  return !!row && row.status === 'connected' && !!row.apiKeyEnc
}

/** Returns a friendly record for display (never the raw key). */
export async function getIntegrationRecord(
  provider: Provider
): Promise<IntegrationRecord | null> {
  const row = await db.integration.findUnique({ where: { provider } })
  if (!row) return null
  let config: Record<string, unknown> = {}
  try {
    config = JSON.parse(row.config || '{}')
  } catch {
    config = {}
  }
  return {
    provider: row.provider as Provider,
    label: row.label,
    status: row.status as 'connected' | 'disconnected' | 'error',
    keyHint: row.keyHint,
    lastSyncedAt: row.lastSyncedAt,
    lastError: row.lastError,
    config,
  }
}

/** Returns all integration records (for the Integrations UI), filling in
    disconnected providers from the registry so the UI shows all available apps. */
export async function getAllIntegrationRecords(): Promise<IntegrationRecord[]> {
  const rows = await db.integration.findMany()
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  return (Object.keys(REGISTRY) as Provider[]).map((provider) => {
    const row = byProvider.get(provider)
    const reg = REGISTRY[provider]
    if (!row) {
      return {
        provider,
        label: reg.label,
        status: 'disconnected' as const,
        keyHint: null,
        lastSyncedAt: null,
        lastError: null,
        config: {},
      }
    }
    let config: Record<string, unknown> = {}
    try {
      config = JSON.parse(row.config || '{}')
    } catch {
      config = {}
    }
    return {
      provider: row.provider as Provider,
      label: row.label,
      status: row.status as 'connected' | 'disconnected' | 'error',
      keyHint: row.keyHint,
      lastSyncedAt: row.lastSyncedAt,
      lastError: row.lastError,
      config,
    }
  })
}

/** Connect a provider: encrypt + store the key, set status. */
export async function connectIntegration(
  provider: Provider,
  apiKey: string
): Promise<IntegrationRecord> {
  const reg = REGISTRY[provider]
  const { encrypt, maskKey } = await import('@/lib/crypto')
  const enc = encrypt(apiKey)
  const hint = maskKey(apiKey)
  const row = await db.integration.upsert({
    where: { provider },
    create: {
      provider,
      label: reg.label,
      apiKeyEnc: enc,
      keyHint: hint,
      status: 'connected',
    },
    update: {
      label: reg.label,
      apiKeyEnc: enc,
      keyHint: hint,
      status: 'connected',
      lastError: null,
    },
  })
  let config: Record<string, unknown> = {}
  try {
    config = JSON.parse(row.config || '{}')
  } catch {
    config = {}
  }
  return {
    provider: row.provider as Provider,
    label: row.label,
    status: row.status as 'connected' | 'disconnected' | 'error',
    keyHint: row.keyHint,
    lastSyncedAt: row.lastSyncedAt,
    lastError: row.lastError,
    config,
  }
}

/** Disconnect a provider: clear the key, set status. */
export async function disconnectIntegration(provider: Provider): Promise<void> {
  await db.integration.upsert({
    where: { provider },
    create: {
      provider,
      label: REGISTRY[provider].label,
      apiKeyEnc: null,
      keyHint: null,
      status: 'disconnected',
    },
    update: {
      apiKeyEnc: null,
      keyHint: null,
      status: 'disconnected',
      lastError: null,
    },
  })
}

/** Record a sync event (success or error). */
export async function markSynced(
  provider: Provider,
  error: string | null = null
): Promise<void> {
  await db.integration.update({
    where: { provider },
    data: {
      lastSyncedAt: new Date(),
      lastError: error,
      status: error ? 'error' : 'connected',
    },
  })
}

export { maskKey }
