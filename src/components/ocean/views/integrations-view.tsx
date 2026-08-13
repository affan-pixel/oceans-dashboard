'use client'

import { useState } from 'react'
import {
  Plug,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  KeyRound,
  Trash2,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration,
} from '../hooks/use-ocean-query'
import type { IntegrationDTO } from '@/lib/types'
import { relativeTime } from '../hooks/utils'

const CATEGORY_LABELS: Record<string, string> = {
  scraping: 'Job scraping',
  enrichment: 'Enrichment',
  outreach: 'Outreach',
  crm: 'CRM',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
        <CheckCircle2 className="size-3 mr-1" />
        Connected
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
        <AlertCircle className="size-3 mr-1" />
        Error
      </Badge>
    )
  }
  return <Badge variant="outline">Not connected</Badge>
}

function ConnectDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: IntegrationDTO
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const connect = useConnectIntegration()
  const test = useTestIntegration()
  const [apiKey, setApiKey] = useState('')

  function handleTest() {
    if (!apiKey.trim()) return
    test.mutate({ provider: integration.provider, apiKey: apiKey.trim() })
  }

  function handleConnect() {
    if (!apiKey.trim()) return
    connect.mutate(
      { provider: integration.provider, apiKey: apiKey.trim() },
      { onSettled: () => { setApiKey(''); onOpenChange(false) } }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="size-4 text-primary" />
            Connect {integration.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{integration.description}</p>
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            Get your {integration.keyLabel} from the {integration.label} dashboard
          </a>
          <div className="space-y-1.5">
            <Label htmlFor="int-key">{integration.keyLabel}</Label>
            <Input
              id="int-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={integration.keyPlaceholder}
              autoComplete="off"
            />
          </div>
          {test.isPending && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Testing connection…
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleTest} disabled={!apiKey.trim() || test.isPending}>
            Test
          </Button>
          <Button onClick={handleConnect} disabled={!apiKey.trim() || connect.isPending}>
            {connect.isPending && <Loader2 className="size-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IntegrationCard({ integration }: { integration: IntegrationDTO }) {
  const disconnect = useDisconnectIntegration()
  const test = useTestIntegration()
  const [connectOpen, setConnectOpen] = useState(false)

  return (
    <Card className={integration.status === 'connected' ? 'border-emerald-300' : ''}>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{integration.label}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {CATEGORY_LABELS[integration.category] ?? integration.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {integration.description}
            </p>
          </div>
          <StatusBadge status={integration.status} />
        </div>

        {integration.status === 'connected' && integration.keyHint && (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-mono">
              <KeyRound className="size-3 text-muted-foreground" />
              {integration.keyHint}
            </span>
            {integration.lastSyncedAt && (
              <span className="text-[11px] text-muted-foreground">
                Synced {relativeTime(integration.lastSyncedAt)}
              </span>
            )}
          </div>
        )}

        {integration.status === 'error' && integration.lastError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {integration.lastError}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          {integration.status === 'connected' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={test.isPending}
                onClick={() => test.mutate({ provider: integration.provider })}
              >
                {test.isPending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate(integration.provider)}
              >
                <Trash2 className="size-3" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" className="h-7 text-xs" onClick={() => setConnectOpen(true)}>
              <Plug className="size-3" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>

      <ConnectDialog
        integration={integration}
        open={connectOpen}
        onOpenChange={setConnectOpen}
      />
    </Card>
  )
}

export function IntegrationsView() {
  const { data: integrations, isLoading } = useIntegrations()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="size-5 text-primary" />
          Integrations
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Connect third-party apps to make the agents use real data. The app works without any keys
          (LLM-simulated fallback) and upgrades to real API calls when you connect each app. Keys
          are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">How it works:</span>{' '}
        When <strong>Apify</strong> is connected, ICP job scraping hits real LinkedIn Jobs, Indeed,
        and Wellfound postings. When disconnected, it uses AI-simulated postings. Same pattern for
        Apollo (lead enrichment), Lemlist (outreach), and HubSpot (CRM sync).
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !integrations || integrations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Plug className="mx-auto size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">No integrations available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <IntegrationCard key={i.provider} integration={i} />
          ))}
        </div>
      )}
    </div>
  )
}
