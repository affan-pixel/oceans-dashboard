'use client'

import { useState } from 'react'
import {
  Filter, Loader2, ExternalLink, Search, Mail, Send, CheckCircle2,
  FileText, ArrowRight, UserSearch, Sparkles, X, UsersRound, Link2,
  RefreshCw, Flame, Zap, UserRound,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  usePipeline, useFindDecisionMaker, useFindReferrers, useScrapedJobOutreach,
  useRecheckJob, useSendToInstantly, useBatchRecheck,
  useConvertScrapedJob, useDismissScrapedJob, useUpdateScrapedJob,
} from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { relativeTime } from '../hooks/utils'
import type { ScrapedJobDTO } from '@/lib/types'
import { cn } from '@/lib/utils'

const PIPELINE_STEPS = [
  { key: 'new', label: 'Scraped', icon: Search, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'dm_found', label: 'DM found', icon: UserSearch, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'outreach_sent', label: 'Outreach sent', icon: Send, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { key: 'replied', label: 'Replied', icon: CheckCircle2, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'converted', label: 'JD received', icon: FileText, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
] as const

function StatusBadge({ status }: { status: string }) {
  const step = PIPELINE_STEPS.find((s) => s.key === status)
  if (!step) return status === 'dismissed' ? <Badge variant="outline" className="opacity-60">Dismissed</Badge> : <Badge variant="outline">{status}</Badge>
  const Icon = step.icon
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', step.color)}><Icon className="size-3" />{step.label}</span>
}

// Age-band badge: how long the job has stayed open (the persistence signal).
function AgeBandBadge({ job }: { job: ScrapedJobDTO }) {
  const meta: Record<string, { label: string; cls: string; title: string }> = {
    fresh:   { label: 'New',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', title: 'Posted < 24h' },
    week:    { label: '1w+',  cls: 'bg-sky-50 text-sky-700 border-sky-200', title: 'Still open after a week' },
    month:   { label: '1m+',  cls: 'bg-amber-50 text-amber-700 border-amber-200', title: 'Still open after a month' },
    quarter: { label: '3m+',  cls: 'bg-orange-50 text-orange-700 border-orange-200', title: 'Still open after 3 months' },
    stuck:   { label: 'STUCK', cls: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold', title: 'Open 3+ months — they cannot fill it' },
  }
  if (job.stillLive === false) {
    return <Badge variant="outline" className="text-[10px] opacity-50 line-through" title="Posting no longer live">closed</Badge>
  }
  const m = meta[job.ageBand] ?? meta.fresh
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`} title={m.title}>{m.label}</Badge>
}

function LeadScoreBadge({ score }: { score: number }) {
  if (!score) return null
  const hot = score >= 50
  return (
    <Badge variant="outline" className={`text-[10px] tabular-nums ${hot ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}`} title="Lead score">
      {hot && <Flame className="size-2.5" />}{score}
    </Badge>
  )
}

function PipelineCard({ job, onOpen }: { job: ScrapedJobDTO & { icpName?: string }; onOpen: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={onOpen}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{job.title}</div>
            <div className="text-xs text-muted-foreground truncate">{job.company} · {job.location || 'Remote'} · {job.icpName || 'ICP'}</div>
          </div>
          <StatusBadge status={job.status} />
        </div>
        {job.salaryText && <div className="text-xs font-medium text-emerald-700">{job.salaryText}</div>}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <AgeBandBadge job={job} />
          <Badge variant="outline" className="text-[10px] capitalize">{job.sourcePlatform}</Badge>
          <LeadScoreBadge score={job.leadScore ?? 0} />
          {job.postedByName && (
            <span className="inline-flex items-center gap-0.5" title={`Posted by ${job.postedByName}${job.postedByTitle ? ` (${job.postedByTitle})` : ''} — ${job.postedByKind ?? 'other'}`}>
              <UserRound className="size-3" />{job.postedByName}
            </span>
          )}
          <span>seen {job.timesSeen ?? 1}×</span>
          {job.dmTitle && <span className="flex items-center gap-1">· <UserSearch className="size-3" /> {job.dmTitle}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineDetailSheet({ job, open, onOpenChange }: { job: (ScrapedJobDTO & { icpName?: string }) | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const findDm = useFindDecisionMaker()
  const findReferrers = useFindReferrers()
  const outreach = useScrapedJobOutreach()
  const recheck = useRecheckJob()
  const instantly = useSendToInstantly()
  const [instantlyEmail, setInstantlyEmail] = useState('')
  const convert = useConvertScrapedJob()
  const dismiss = useDismissScrapedJob()
  const update = useUpdateScrapedJob()
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedJdId = useOceanStore((s) => s.setSelectedJdId)
  const [dmNameInput, setDmNameInput] = useState('')
  if (!job) return null
  const stepIndex = PIPELINE_STEPS.findIndex((s) => s.key === job.status)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2"><Filter className="size-4 text-primary" />{job.title}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 flex-wrap">
            {job.company} · {job.location || 'Remote'}
            <Badge variant="outline" className="text-[10px] capitalize">{job.sourcePlatform}</Badge>
            {job.scrapeSource && <Badge variant="outline" className="text-[10px]">{job.scrapeSource}</Badge>}
            {job.icpName && <Badge variant="outline" className="text-[10px]">{job.icpName}</Badge>}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto ocean-scroll px-5 py-4 space-y-4">
          {/* Pipeline progress */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-3">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon
              const done = i <= stepIndex
              return (
                <div key={step.key} className="flex items-center gap-1 flex-1">
                  <div className={cn('flex items-center gap-1.5 text-xs', done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    <div className={cn('flex size-6 items-center justify-center rounded-full text-[10px]', done ? 'bg-primary text-primary-foreground' : 'bg-muted')}><Icon className="size-3" /></div>
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <div className={cn('h-0.5 flex-1', done && i < stepIndex ? 'bg-primary' : 'bg-muted')} />}
                </div>
              )
            })}
          </div>

          {/* Job posting */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job posting</div>
            {job.salaryText && <div className="text-sm font-medium text-emerald-700">{job.salaryText}</div>}
            <p className="text-xs text-muted-foreground">{job.snippet}</p>
            {job.sourceUrl && <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="size-3" />View original posting</a>}
          </div>

          {/* Agent 1: persistence tracking — how long has this role stayed open? */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><RefreshCw className="size-3" />Job tracking</div>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={recheck.isPending || job.stillLive === false} onClick={() => recheck.mutate(job.id)}>
                {recheck.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}Recheck
              </Button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <AgeBandBadge job={job} />
              <LeadScoreBadge score={job.leadScore ?? 0} />
              <span className="text-[11px] text-muted-foreground">
                seen {job.timesSeen ?? 1}× · first {relativeTime(job.firstSeenAt ?? job.createdAt)} · last {relativeTime(job.lastSeenAt ?? job.createdAt)}
              </span>
            </div>
            {job.postedByName ? (
              <div className="text-xs">
                <span className="text-muted-foreground">Posted by </span>
                <span className="font-medium">{job.postedByName}</span>
                {job.postedByTitle && <span className="text-muted-foreground"> ({job.postedByTitle})</span>}
                {job.postedByKind && (job.postedByKind === 'founder' || job.postedByKind === 'ceo') && (
                  <Badge variant="outline" className="ml-1.5 text-[9px] bg-rose-50 text-rose-700 border-rose-200">hot signal · {job.postedByKind}</Badge>
                )}
                {job.postedByUrl && (
                  <a href={job.postedByUrl} target="_blank" rel="noopener noreferrer nofollow" className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                    <Link2 className="size-3" />LinkedIn
                  </a>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Poster unknown — recheck detects who at the company posted this (HR / founder / CEO).</p>
            )}
          </div>

          {/* Step 2: Decision maker */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><UserSearch className="size-3" />Step 2 · Decision maker</div>
              {!job.dmName && (
                <Button size="sm" className="h-7 text-xs" disabled={findDm.isPending} onClick={() => findDm.mutate(job.id)}>
                  {findDm.isPending ? <Loader2 className="size-3 animate-spin" /> : <UserSearch className="size-3" />}Find decision maker
                </Button>
              )}
            </div>
            {job.dmTitle ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{job.dmTitle}</Badge>
                  {job.dmName && <span className="text-sm font-medium">{job.dmName}</span>}
                  {job.dmIsSample && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Sample</Badge>
                  )}
                </div>
                {job.dmNotes && <p className="text-xs text-muted-foreground">{job.dmNotes}</p>}
                {job.dmLinkedinUrl && <a href={job.dmLinkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="size-3" />Find on LinkedIn</a>}
                <div className="flex items-center gap-1.5 pt-1">
                  <input type="text" value={dmNameInput} onChange={(e) => setDmNameInput(e.target.value)} placeholder="Add the person's name once found" className="flex-1 h-7 rounded-md border px-2 text-xs" />
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!dmNameInput.trim() || update.isPending} onClick={() => { update.mutate({ jobId: job.id, body: { dmName: dmNameInput.trim() } }); setDmNameInput('') }}>Save name</Button>
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground">Click "Find decision maker" to identify who to contact at {job.company}.</p>}
          </div>

          {/* Step 2b: Warm-intro referrers — who can recommend Oceans */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><UsersRound className="size-3" />Warm-intro paths</div>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={findReferrers.isPending} onClick={() => findReferrers.mutate(job.id)}>
                {findReferrers.isPending ? <Loader2 className="size-3 animate-spin" /> : <UsersRound className="size-3" />}Find referrers
              </Button>
            </div>
            {job.referrers && job.referrers.length > 0 ? (
              <ul className="space-y-2">
                {job.referrers.map((r, i) => (
                  <li key={i} className="rounded-md border bg-muted/30 p-2 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.isSample && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Sample</Badge>}
                      {r.title && <Badge variant="outline" className="text-[10px]">{r.title}</Badge>}
                      {r.linkedinUrl && (
                        <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          <Link2 className="size-3" />LinkedIn
                        </a>
                      )}
                    </div>
                    {r.relation && <div className="text-[11px] text-muted-foreground"><span className="font-medium">Relation:</span> {r.relation}</div>}
                    {r.reason && <div className="text-[11px] text-muted-foreground"><span className="font-medium">Why:</span> {r.reason}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Find people who can introduce Oceans to {job.company} — investors, advisors, or prior colleagues of the decision maker.</p>
            )}
          </div>

          {/* Step 3: Outreach */}
          {(job.status === 'dm_found' || job.status === 'outreach_sent' || job.status === 'replied') && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="size-3" />Step 3 · Outreach</div>
                <div className="flex gap-1">
                  {job.outreachStatus === 'none' && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={outreach.isPending} onClick={() => outreach.mutate({ jobId: job.id, action: 'draft' })}>{outreach.isPending ? <Loader2 className="size-3 animate-spin" /> : <Mail className="size-3" />}Draft email</Button>}
                  {(job.outreachStatus === 'drafted' || job.outreachStatus === 'none') && <Button size="sm" className="h-7 text-xs" disabled={outreach.isPending} onClick={() => outreach.mutate({ jobId: job.id, action: 'send' })}><Send className="size-3" />Mark sent</Button>}
                  {job.outreachStatus === 'sent' && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={outreach.isPending} onClick={() => outreach.mutate({ jobId: job.id, action: 'reply' })}><CheckCircle2 className="size-3" />Mark replied</Button>}
                </div>
              </div>
              {job.outreachContent && <div className="space-y-1"><Textarea value={job.outreachContent} readOnly className="text-xs font-mono h-32" />{job.outreachSentAt && <div className="text-[11px] text-muted-foreground">Sent {relativeTime(job.outreachSentAt)}</div>}</div>}
              {job.outreachStatus === 'none' && <p className="text-xs text-muted-foreground">Draft a personalised outreach email to the decision maker.</p>}
              {/* Instantly: push this lead into a cold-email sequence */}
              <div className="flex items-center gap-1.5 pt-1">
                <input type="email" value={instantlyEmail} onChange={(e) => setInstantlyEmail(e.target.value)} placeholder={job.dmName ? `${job.dmName.split(' ')[0].toLowerCase()}@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : 'dm email address'} className="flex-1 h-7 rounded-md border px-2 text-xs" />
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!instantlyEmail.trim() || instantly.isPending} onClick={() => instantly.mutate({ jobId: job.id, email: instantlyEmail.trim() })}>
                  {instantly.isPending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}Push to Instantly
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Instantly runs the email sequence ({{company}}/{{role}}/{{signal}} auto-personalized). No key set = lead drafted in-app.</p>
            </div>
          )}

          {/* Step 4: Get JD + convert */}
          {(job.status === 'replied' || job.status === 'converted') && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/40 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><FileText className="size-3" />Step 4 · Get the JD &amp; match</div>
              {job.status === 'replied' && !job.jdId && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">They replied! Convert this into a JD so you can match candidates.</p>
                  <Button size="sm" className="h-7 text-xs" disabled={convert.isPending} onClick={() => convert.mutate(job.id)}>{convert.isPending ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-3" />}Convert to JD</Button>
                </div>
              )}
              {job.jdId && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="size-4" />Converted to a JD</div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedJdId(job.jdId!); onOpenChange(false); setActiveView('jds') }}><FileText className="size-3" />View JD &amp; run match</Button>
                </div>
              )}
            </div>
          )}

          {job.status !== 'converted' && job.status !== 'dismissed' && (
            <Button variant="ghost" size="sm" className="text-xs text-destructive" disabled={dismiss.isPending} onClick={() => { dismiss.mutate(job.id); onOpenChange(false) }}><X className="size-3" />Dismiss</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PipelineEmpty() {
  const setActiveView = useOceanStore((s) => s.setActiveView)
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10"><Filter className="size-6 text-primary" /></div>
        <h3 className="text-sm font-medium">No jobs in the pipeline yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Go to ICPs and click "Scrape jobs" to find real job postings. They&apos;ll appear here and move through: find decision maker → outreach → get JD → match candidates.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveView('targets')}><Sparkles className="size-4" />Go to ICPs</Button>
      </CardContent>
    </Card>
  )
}

export function PipelineView() {
  const { data: pipeline, isLoading } = usePipeline()
  const batchRecheck = useBatchRecheck()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const filtered = (pipeline ?? []).filter((j) => statusFilter === 'all' ? j.status !== 'dismissed' : j.status === statusFilter)
  const selected = filtered.find((j) => j.id === selectedId) ?? null
  const counts: Record<string, number> = {}
  for (const j of pipeline ?? []) { if (j.status !== 'dismissed') counts[j.status] = (counts[j.status] ?? 0) + 1 }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Filter className="size-5 text-primary" />Pipeline</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">Every scraped job moves through 4 steps: find the decision maker → outreach → get the JD → match candidates. Click a job to advance it through the pipeline.</p>
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" disabled={batchRecheck.isPending} onClick={() => batchRecheck.mutate(20)}>
          {batchRecheck.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}Recheck open jobs (age tracking)
        </Button>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => setStatusFilter('all')} className={cn('rounded-md px-3 py-1 text-xs font-medium transition-colors', statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>All ({Object.values(counts).reduce((a, b) => a + b, 0)})</button>
        {PIPELINE_STEPS.map((step) => (
          <button key={step.key} onClick={() => setStatusFilter(step.key)} className={cn('rounded-md px-3 py-1 text-xs font-medium transition-colors', statusFilter === step.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{step.label} ({counts[step.key] ?? 0})</button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <PipelineEmpty />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{filtered.map((j) => <PipelineCard key={j.id} job={j} onOpen={() => setSelectedId(j.id)} />)}</div>
      )}
      <PipelineDetailSheet job={selected} open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)} />
    </div>
  )
}
