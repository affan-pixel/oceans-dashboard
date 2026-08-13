'use client'

import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, ShieldAlert,
  FileLock2, Send, Mail, Loader2, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ScoreRing } from './ui/score-ring'
import {
  useDecideFit, useGenerateRedactedProfile, useNotifySlack,
  useRequestLeadership, useSendProspectEmail,
} from './hooks/use-ocean-query'
import type { MatchResultDTO } from '@/lib/types'

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? 'bg-emerald-600 text-white border-emerald-700'
      : rank === 2
        ? 'bg-teal-600 text-white border-teal-700'
        : rank === 3
          ? 'bg-cyan-600 text-white border-cyan-700'
          : 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border size-7 text-xs font-semibold tabular-nums shrink-0',
        styles
      )}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  )
}

// Match-type badge: port (blue) | lagoon (violet) | market (orange)
function MatchTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    port: { label: '🔵 Port', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    lagoon: { label: '🟣 Lagoon', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    market: { label: '🟠 Market', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  }
  const m = map[type] ?? map.port
  return <Badge variant="outline" className={cn('text-[10px]', m.cls)}>{m.label}</Badge>
}

// Fit-status badge: pending | approved | rejected
function FitStatusBadge({ status }: { status: string }) {
  if (status === 'approved')
    return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><ShieldCheck className="size-3 mr-0.5" />Fit approved</Badge>
  if (status === 'rejected')
    return <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200"><ShieldAlert className="size-3 mr-0.5" />Rejected</Badge>
  return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Awaiting fit-check</Badge>
}

const SAMPLE_EMAIL = `Hi {{first_name}},

We've identified a strong match for your open role from the Oceans talent pool — an AI-trained operator from Sri Lanka, available remote and overlapping US hours.

Match type: {{match_type}} · Suggested range: {{price_range}}

Happy to share a redacted profile and set up a quick intro this week?

— Affan, Oceans`

export function MatchResultCard({ result, matchId }: { result: MatchResultDTO; matchId: string }) {
  const decideFit = useDecideFit()
  const redact = useGenerateRedactedProfile()
  const slack = useNotifySlack()
  const leadership = useRequestLeadership()
  const email = useSendProspectEmail()

  const [showProfile, setShowProfile] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')

  const approved = result.fitStatus === 'approved'

  return (
    <Card className="hover:border-primary/40 hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <RankBadge rank={result.rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate">{result.candidateName}</h4>
                <p className="text-xs text-muted-foreground truncate">{result.candidateHeadline}</p>
                <p className="text-[11px] text-muted-foreground truncate">{result.candidateLocation}</p>
              </div>
              <ScoreRing value={result.score} size={56} label="fit" />
            </div>
          </div>
        </div>

        {/* Workflow metadata: match type + price + fit status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <MatchTypeBadge type={result.matchType} />
          {result.priceRangeUsd && (
            <Badge variant="outline" className="text-[10px] tabular-nums">{result.priceRangeUsd}</Badge>
          )}
          <FitStatusBadge status={result.fitStatus} />
          {result.candidateRedactedProfile && (
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"><FileLock2 className="size-3 mr-0.5" />Redacted ready</Badge>
          )}
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{result.reasoning}</p>

        {result.strengths.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Strengths</div>
            <div className="flex flex-wrap gap-1.5">
              {result.strengths.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 className="size-3" />{s}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.gaps.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gaps</div>
            <div className="flex flex-wrap gap-1.5">
              {result.gaps.map((g, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                  <AlertTriangle className="size-3" />{g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- Workflow action bar (Faahika's steps 5→9) ---- */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t">
          {/* Step 5: profile-fit approve/reject */}
          {!approved && result.fitStatus !== 'rejected' && (
            <>
              <Button size="sm" variant="default" className="h-7 text-xs"
                disabled={decideFit.isPending}
                onClick={() => decideFit.mutate({ resultId: result.id, decision: 'approved' })}>
                {decideFit.isPending ? <Loader2 className="size-3 animate-spin" /> : <ThumbsUp className="size-3" />}Approve fit
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                disabled={decideFit.isPending}
                onClick={() => decideFit.mutate({ resultId: result.id, decision: 'rejected' })}>
                <ThumbsDown className="size-3" />Reject
              </Button>
            </>
          )}

          {/* Step 6: redacted profile (needs fit approved) */}
          <Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!approved || redact.isPending}
            onClick={() => redact.mutate(result.id, { onSuccess: () => setShowProfile(true) })}>
            {redact.isPending ? <Loader2 className="size-3 animate-spin" /> : <FileLock2 className="size-3" />}
            {result.candidateRedactedProfile ? 'View redacted' : 'Redact profile'}
          </Button>
          {result.candidateRedactedProfile && approved && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowProfile(true)}>
              View
            </Button>
          )}

          {/* Step 7: notify Slack */}
          <Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!approved || slack.isPending}
            onClick={() => slack.mutate({ matchId, matchResultId: result.id })}>
            {slack.isPending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}Slack
          </Button>

          {/* Step 8: leadership approval */}
          <Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!approved || leadership.isPending}
            onClick={() => leadership.mutate({ matchId, matchResultId: result.id })}>
            {leadership.isPending ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}Leadership
          </Button>

          {/* Step 9: email prospect */}
          <Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!approved || email.isPending}
            onClick={() => setShowEmail(true)}>
            <Mail className="size-3" />Email
          </Button>
        </div>

        {/* Redacted profile viewer */}
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileLock2 className="size-4 text-indigo-600" />Oceans-branded redacted profile</DialogTitle>
              <DialogDescription>PII stripped — safe to share with the prospect before reveal.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto ocean-scroll rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
              {result.candidateRedactedProfile || '_(No redacted profile yet.)_'}
            </div>
          </DialogContent>
        </Dialog>

        {/* Email prospect dialog (step 9) */}
        <Dialog open={showEmail} onOpenChange={setShowEmail}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Mail className="size-4 text-primary" />Email the prospect</DialogTitle>
              <DialogDescription>Sent via HubSpot when configured; otherwise drafted for manual send.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <input
                type="email" placeholder="prospect@startup.com" value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full h-9 rounded-md border px-3 text-sm"
              />
              <textarea
                defaultValue={SAMPLE_EMAIL.replace('{{match_type}}', result.matchType).replace('{{price_range}}', result.priceRangeUsd ?? 'TBD')}
                className="w-full h-40 rounded-md border p-3 text-xs font-mono"
              />
              <Button
                className="w-full"
                disabled={!emailTo.trim() || email.isPending}
                onClick={() => {
                  email.mutate(
                    { matchId, to: emailTo.trim(), subject: 'Intro: matched Oceans candidate', body: SAMPLE_EMAIL.replace('{{match_type}}', result.matchType).replace('{{price_range}}', result.priceRangeUsd ?? 'TBD') },
                    { onSuccess: () => setShowEmail(false) }
                  )
                }}
              >
                {email.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send via HubSpot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export function MatchResultCompact({ result }: { result: MatchResultDTO }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2.5">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary tabular-nums">
        #{result.rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{result.candidateName}</div>
        <div className="text-[11px] text-muted-foreground truncate">{result.candidateHeadline}</div>
      </div>
      {result.priceRangeUsd && (
        <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">{result.priceRangeUsd}</span>
      )}
      <Badge variant="secondary" className="tabular-nums">
        {result.score}
        <ArrowRight className="size-3" />
      </Badge>
    </div>
  )
}
