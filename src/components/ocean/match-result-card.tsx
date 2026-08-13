'use client'

import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScoreRing } from './ui/score-ring'
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
        'inline-flex items-center justify-center rounded-full border size-7 text-xs font-semibold tabular-nums',
        styles
      )}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  )
}

export function MatchResultCard({ result }: { result: MatchResultDTO }) {
  return (
    <Card className="hover:border-primary/40 hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <RankBadge rank={result.rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate">{result.candidateName}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {result.candidateHeadline}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {result.candidateLocation}
                </p>
              </div>
              <ScoreRing value={result.score} size={56} label="fit" />
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{result.reasoning}</p>

        {result.strengths.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Strengths
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.strengths.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                >
                  <CheckCircle2 className="size-3" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.gaps.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Gaps
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.gaps.map((g, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                >
                  <AlertTriangle className="size-3" />
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
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
      <Badge variant="secondary" className="tabular-nums">
        {result.score}
        <ArrowRight className="size-3" />
      </Badge>
    </div>
  )
}
