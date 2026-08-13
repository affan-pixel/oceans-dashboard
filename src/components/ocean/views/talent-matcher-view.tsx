'use client'

import { useState } from 'react'
import {
  BrainCircuit,
  FileSearch,
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle2,
  Lightbulb,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useJds,
  useCreateJd,
  useDeleteJd,
  useRunMatch,
} from '../hooks/use-ocean-query'
import { SAMPLE_JD, relativeTime } from '../hooks/utils'
import { MatchResultCard } from '../match-result-card'
import type { JobDescriptionDTO, MatchDTO } from '@/lib/types'

function ParsedJdView({ jd }: { jd: JobDescriptionDTO }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10 dark:border-emerald-500/30">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          Parsed & saved as <span className="font-medium">{jd.title}</span>
          {jd.company && <> · {jd.company}</>}
          <span className="ml-auto text-xs text-emerald-600/70 dark:text-emerald-400/70">
            id: {jd.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {jd.outcomes.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Outcomes (what they actually need)
          </h4>
          <ul className="space-y-1">
            {jd.outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {jd.context && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Context
          </h4>
          <blockquote className="border-l-2 border-primary/40 pl-3 italic text-sm text-foreground/80">
            {jd.context}
          </blockquote>
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {jd.mandatorySkills.length > 0 && (
          <section>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
              Mandatory skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {jd.mandatorySkills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </section>
        )}

        {jd.niceToHave.length > 0 && (
          <section>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
              Nice to have
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {jd.niceToHave.map((s) => (
                <Badge key={s} variant="outline" className="text-muted-foreground">
                  {s}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>

      {jd.signals.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="size-3" />
            Hidden signals
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-foreground"
                  aria-label="What are hidden signals?"
                >
                  (?)
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Hidden signals describe the underlying context — e.g. "scrappy", "zero to one",
                "no playbook". They help the matcher look beyond keywords to culture fit.
              </TooltipContent>
            </Tooltip>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {jd.signals.map((s) => (
              <Badge
                key={s}
                className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
              >
                {s}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ParseLoadingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Claude is parsing the job description…</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Extracting outcomes, mandatory skills, nice-to-haves, context, and hidden signals.
          This usually takes 5–15 seconds.
        </p>
      </div>
    </div>
  )
}

function MatchLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm rounded-xl space-y-3 px-4 text-center">
      <div className="relative">
        <Loader2 className="size-10 animate-spin text-primary" />
        <Sparkles className="absolute -right-1 -top-1 size-4 text-primary animate-pulse" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Embedding JD… ranking candidates by outcome fit…</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          This is the semantic match step. Comparing outcomes against every active candidate.
          Usually takes 10–30 seconds.
        </p>
      </div>
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <FileSearch className="size-7 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No job description parsed yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Paste a JD on the left and click "Parse with AI" to start matching candidates.
        </p>
      </CardContent>
    </Card>
  )
}

function RecentJdsList({
  currentId,
  onSelect,
}: {
  currentId: string | null
  onSelect: (jd: JobDescriptionDTO) => void
}) {
  const { data: jds, isLoading } = useJds()
  if (isLoading) return <Skeleton className="h-12 w-full" />
  if (!jds || jds.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No recent parsed JDs.</p>
    )
  }
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto ocean-scroll pr-1">
      {jds.map((jd) => {
        const isActive = jd.id === currentId
        return (
          <button
            key={jd.id}
            type="button"
            onClick={() => onSelect(jd)}
            className={`w-full text-left rounded-md border p-2.5 transition-colors ${
              isActive
                ? 'border-primary bg-primary/5'
                : 'hover:bg-accent/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{jd.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {jd.company ?? '—'} · {relativeTime(jd.createdAt)}
                </div>
              </div>
              {isActive && <Badge variant="secondary">current</Badge>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function TalentMatcherView() {
  const createJd = useCreateJd()
  const runMatch = useRunMatch()
  const deleteJd = useDeleteJd()

  const [rawText, setRawText] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [parsedJd, setParsedJd] = useState<JobDescriptionDTO | null>(null)
  const [matchResult, setMatchResult] = useState<MatchDTO | null>(null)
  const [explainerOpen, setExplainerOpen] = useState(false)

  function loadSample() {
    setRawText(SAMPLE_JD)
    const firstLine = SAMPLE_JD.split('\n')[0].trim()
    setTitle(firstLine)
    setCompany('Series A SaaS')
  }
  function handleParse() {
    if (!rawText.trim() || !title.trim()) return
    createJd.mutate(
      {
        title,
        company: company || undefined,
        rawText,
      },
      {
        onSuccess: (jd) => {
          setParsedJd(jd)
          setMatchResult(null)
        },
      }
    )
  }

  function handleMatch() {
    if (!parsedJd) return
    runMatch.mutate(parsedJd.id, {
      onSuccess: (match) => setMatchResult(match),
    })
  }

  function selectJd(jd: JobDescriptionDTO) {
    setParsedJd(jd)
    setRawText(jd.rawText)
    setTitle(jd.title)
    setCompany(jd.company ?? '')
    setMatchResult(null)
  }

  // Sync the title field from raw text if the user hasn't manually edited it
  // (handled inline in the textarea onChange instead of via effect)

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* LEFT: parse panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Parse a job description
            </CardTitle>
            <CardDescription>
              Paste the raw JD. Claude extracts outcomes, skills, context, and hidden signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={loadSample}>
                <Wand2 className="size-4" />
                Load sample
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jd-title">Title</Label>
              <Input
                id="jd-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GTM Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jd-company">Company (optional)</Label>
              <Input
                id="jd-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme SaaS"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jd-raw">Raw JD text</Label>
              <Textarea
                id="jd-raw"
                rows={10}
                value={rawText}
                onChange={(e) => {
                  const next = e.target.value
                  setRawText(next)
                  if (!title) {
                    const firstLine = next.split('\n')[0].trim()
                    if (firstLine) setTitle(firstLine)
                  }
                }}
                placeholder="Paste the full job description here…"
                className="font-mono text-xs"
              />
            </div>

            <Button
              onClick={handleParse}
              disabled={createJd.isPending || !rawText.trim() || !title.trim()}
              className="w-full"
            >
              {createJd.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {createJd.isPending ? 'Parsing…' : 'Parse with AI'}
            </Button>

            {createJd.isPending && <ParseLoadingOverlay />}

            {parsedJd && !createJd.isPending && (
              <div className="pt-2">
                <ParsedJdView jd={parsedJd} />
                <div className="mt-3 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="size-4" />
                        Delete JD
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this JD?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the JD and all its matches. Cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (!parsedJd) return
                            deleteJd.mutate(parsedJd.id, {
                              onSettled: () => {
                                setParsedJd(null)
                                setMatchResult(null)
                              },
                            })
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BrainCircuit className="size-4 text-primary" />
              Recent parsed JDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentJdsList currentId={parsedJd?.id ?? null} onSelect={selectJd} />
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: match panel */}
      <div className="space-y-4">
        {parsedJd ? (
          <Card className="relative overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-primary" />
                Match candidates
              </CardTitle>
              <CardDescription>
                Run a semantic match against every active candidate in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Active JD</div>
                <div className="text-sm font-medium mt-0.5">{parsedJd.title}</div>
                {parsedJd.company && (
                  <div className="text-xs text-muted-foreground">{parsedJd.company}</div>
                )}
              </div>

              <Button
                onClick={handleMatch}
                disabled={runMatch.isPending}
                size="lg"
                className="w-full"
              >
                {runMatch.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {runMatch.isPending ? 'Matching…' : 'Run semantic match'}
              </Button>

              {runMatch.isPending && <MatchLoadingOverlay />}

              {matchResult && matchResult.results.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Collapsible open={explainerOpen} onOpenChange={setExplainerOpen}>
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-primary">
                            <Lightbulb className="size-3.5" />
                            Why this works
                          </div>
                          {explainerOpen ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Traditional tools match keywords. We match <strong>outcomes</strong> —
                          "built outbound pipeline" matches "created cold email sequences from
                          scratch" even though the words differ. Each candidate is scored on
                          outcome overlap, weighted by stage, tools, and signal fit.
                        </p>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      Ranked shortlist
                      <Badge variant="secondary" className="ml-2">
                        {matchResult.results.length} candidate
                        {matchResult.results.length === 1 ? '' : 's'}
                      </Badge>
                    </h4>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto ocean-scroll pr-1">
                    {matchResult.results.map((r) => (
                      <MatchResultCard key={r.id} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {matchResult && matchResult.results.length === 0 && (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No candidates were ranked. Add candidates first.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
