import { NextResponse } from 'next/server'
import { REGISTRY, ALL_PROVIDERS, type Provider } from '@/lib/integrations/registry'
import {
  connectIntegration,
  disconnectIntegration,
  getIntegrationRecord,
} from '@/lib/integrations/db'
import type { IntegrationDTO } from '@/lib/types'

type Params = { params: Promise<{ provider: string }> }

function isValidProvider(p: string): p is Provider {
  return ALL_PROVIDERS.includes(p as Provider)
}

function toDTO(
  record: Awaited<ReturnType<typeof getIntegrationRecord>>,
  provider: Provider
): IntegrationDTO | null {
  if (!record) return null
  const reg = REGISTRY[provider]
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

// POST /api/integrations/[provider] body: { apiKey: string } → connect
// DELETE /api/integrations/[provider] → disconnect
export async function POST(request: Request, { params }: Params) {
  try {
    const { provider: providerParam } = await params
    if (!isValidProvider(providerParam)) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const apiKey = String(body.apiKey ?? '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 })
    }

    const record = await connectIntegration(providerParam, apiKey)
    const dto = toDTO(record, providerParam)
    return NextResponse.json(dto, { status: 200 })
  } catch (err) {
    console.error('[integrations connect] error', err)
    return NextResponse.json({ error: 'Failed to connect integration' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { provider: providerParam } = await params
    if (!isValidProvider(providerParam)) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }
    await disconnectIntegration(providerParam)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[integrations disconnect] error', err)
    return NextResponse.json({ error: 'Failed to disconnect integration' }, { status: 500 })
  }
}
