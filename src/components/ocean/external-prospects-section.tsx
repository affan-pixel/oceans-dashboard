'use client'

import { Radar, Loader2, ExternalLink, CheckCircle2, XCircle, Eye, Sparkles, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from './ui/score-ring'
import { useScrapeExternal, useUpdateProspect } from './hooks/use-ocean-query'
import { cn } from '@/lib/utils'
import type { MatchDTO, ExternalProspectDTO } from '@/lib/types'

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  wellfound: 'Wellfound',
  github: 'GitHub',
  other: 'Other',
}

function StrengthBadge({ strength }: { strength: string | null }) {
  if (!strength) return null
  const map: Record<string, { label: string; className: string }> = {
    strong: { label: 'Strong', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    moderate: { label: 'Moderate', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    weak: { label: 'Weak', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  }
  const s = map[strength] ?? map.weak
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', s.className)}>
      Internal: {s.label}
    </span>
  )
}

function ProspectRow({ prospect }: { prospect: ExternalProspectDTO }) {
  const update = useUpdateProspect()
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-3">
        <ScoreRing value={prospect.score} size={48} strokeWidth={5} showLabel label="" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{prospect.name}</span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {PLATFORM_LABELS[prospect.sourcePlatform] ?? prospect.sourcePlatform}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize',
                prospect.status === 'promoted' && 'border-emerald-300 text-emerald-700',
                prospect.status === 'rejected' && 'border-rose-300 text-rose-700',
                prospect.status === 'reviewed' && 'border-sky-300 text-sky-700'
              )}
            >
              {prospect.status}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{prospect.headline}</div>
          {prospect.location && (
            <div className="text-[11px] text-muted-foreground">{prospect.location}</div>
          )}
        </div>
        {prospect.sourceUrl && (
          <a
            href={prospect.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-muted-foreground hover:text-primary"
            aria-label={`View ${prospect.name} on ${PLATFORM_LABELS[prospect.sourcePlatform] ?? 'external source'}`}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{prospect.snippet}</p>
      {prospect.fitReason && (
        <p className="text-xs">
          <span className="font-medium text-foreground">Fit:</span>{' '}
          <span className="text-muted-foreground">{prospect.fitReason}</span>
        </p>
      )}
      {prospect.status === 'new' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: prospect.id, status: 'reviewed' })}
          >
            <Eye className="size-3" />
            Review
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: prospect.id, status: 'promoted' })}
          >
            <CheckCircle2 className="size-3" />
            Promote to pool
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: prospect.id, status: 'rejected' })}
          >
            <XCircle className="size-3" />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}

export function ExternalProspectsSection({ match }: { match: MatchDTO }) {
  const scrape = useScrapeExternal()
  const strength = match.internalStrength
  const canScrape = strength === 'weak' || strength === 'moderate'
  const prospects = match.externalProspects ?? []
  const scrapeStatus = match.externalScrapeStatus ?? 'none'

  return (
    <Card className="border-dashed">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radar className="size-4 text-primary" />
              Step 4 — External prospects
              {prospects.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{prospects.length}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              When the internal pool doesn't fully cover a role, the agent scrapes LinkedIn / Indeed /
              Wellfound for additional prospects. These are <span className="font-medium">not</span> in the
              candidate pool yet — review and promote the ones worth pursuing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StrengthBadge strength={strength} />
            {canScrape && scrapeStatus !== 'done' && (
              <Button size="sm" disabled={scrape.isPending} onClick={() => scrape.mutate(match.id)}>
                {scrape.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Radar className="size-4" />
                )}
                {scrape.isPending ? 'Scraping…' : prospects.length > 0 ? 'Re-scrape' : 'Scrape external'}
              </Button>
            )}
          </div>
        </div>

        {scrape.isPending && (
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground mt-2">
              Scraping LinkedIn, Indeed, Wellfound &amp; GitHub for prospects who fit this JD…
            </p>
          </div>
        )}

        {!scrape.isPending && prospects.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {strength === 'strong' ? (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                Internal match is strong — no external scrape needed.
              </span>
            ) : canScrape ? (
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                Internal match is {strength}. Click “Scrape external” to surface more prospects.
              </span>
            ) : (
              'Run an internal match first to determine if external scraping is needed.'
            )}
          </div>
        )}

        {prospects.length > 0 && (
          <div className="space-y-2">
            {prospects.map((p) => (
              <ProspectRow key={p.id} prospect={p} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
