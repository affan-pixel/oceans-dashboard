import { NextResponse } from 'next/server'
import { getAllIntegrationRecords } from '@/lib/integrations/db'
import { REGISTRY, ALL_PROVIDERS, type Provider } from '@/lib/integrations/registry'
import type { IntegrationDTO } from '@/lib/types'

function toDTO(
  record: Awaited<ReturnType<typeof getAllIntegrationRecords>>[number]
): IntegrationDTO {
  const reg = REGISTRY[record.provider as Provider]
  return {
    provider: record.provider,
    label: record.label,
    description: reg.description,
    docsUrl: reg.docsUrl,
    category: reg.category,
    capabilities: reg.capabilities,
    keyLabel: reg.keyLabel,
    keyPlaceholder: reg.keyPlaceholder,
    status: record.status,
    keyHint: record.keyHint,
    lastSyncedAt: record.lastSyncedAt ? record.lastSyncedAt.toISOString() : null,
    lastError: record.lastError,
  }
}

export async function GET() {
  try {
    const records = await getAllIntegrationRecords()
    // Ensure order matches registry
    const ordered = ALL_PROVIDERS.map((p) => records.find((r) => r.provider === p)!).filter(Boolean)
    return NextResponse.json(ordered.map(toDTO))
  } catch (err) {
    console.error('[integrations GET] error', err)
    return NextResponse.json({ error: 'Failed to load integrations' }, { status: 500 })
  }
}
