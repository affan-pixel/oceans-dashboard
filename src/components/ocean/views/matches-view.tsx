'use client'

import { useState } from 'react'
import {
  Target,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  FileText,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMatches } from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { MatchResultCard, MatchResultCompact } from '../match-result-card'
import { ExternalProspectsSection } from '../external-prospects-section'
import { relativeTime } from '../hooks/utils'
import type { MatchDTO } from '@/lib/types'

function MatchCard({ match }: { match: MatchDTO }) {
  const [expanded, setExpanded] = useState(false)
  const top3 = match.results.slice(0, 3)
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedJdId = useOceanStore((s) => s.setSelectedJdId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              {match.jobTitle}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              {match.company && <span>{match.company}</span>}
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {relativeTime(match.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {match.results.length} candidate{match.results.length === 1 ? '' : 's'}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedJdId(match.jobDescriptionId)
                setActiveView('jds')
              }}
            >
              <FileText className="size-4" />
              View JD
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {match.summary && (
          <p className="text-sm text-muted-foreground">{match.summary}</p>
        )}

        {!expanded ? (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Top {Math.min(3, top3.length)}
            </div>
            {top3.map((r) => (
              <MatchResultCompact key={r.id} result={r} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3" />
                Internal pool · {match.results.length} ranked
              </div>
              {match.results.map((r) => (
                <MatchResultCard key={r.id} result={r} matchId={match.id} />
              ))}
            </div>
            <ExternalProspectsSection match={match} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MatchesEmpty() {
  const setActiveView = useOceanStore((s) => s.setActiveView)
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Target className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No matches yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Head to Job Descriptions, parse a JD, and run a semantic match to produce your first ranked shortlist.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setActiveView('jds')}
        >
          Go to Job Descriptions
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function MatchesView() {
  const { data: matches, isLoading } = useMatches()
  const selectedMatchJdId = useOceanStore((s) => s.selectedMatchJdId)
  const setSelectedMatchJdId = useOceanStore((s) => s.setSelectedMatchJdId)

  const filtered = selectedMatchJdId
    ? (matches ?? []).filter((m) => m.jobDescriptionId === selectedMatchJdId)
    : matches ?? []

  const uniqueJdCount = new Set((matches ?? []).map((m) => m.jobDescriptionId)).size

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Past matches
                {matches && (
                  <Badge variant="secondary">{matches.length}</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {matches && matches.length > 0
                  ? `${matches.length} match${matches.length === 1 ? '' : 'es'} across ${uniqueJdCount} job description${uniqueJdCount === 1 ? '' : 's'}.`
                  : 'Every shortlist the Talent Matcher has produced, newest first.'}
              </CardDescription>
            </div>
            {selectedMatchJdId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMatchJdId(null)}
              >
                <Layers className="size-4" />
                Show all matches
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            selectedMatchJdId ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matches for this JD yet. Run a match from the Job Descriptions view.
              </div>
            ) : (
              <MatchesEmpty />
            )
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
