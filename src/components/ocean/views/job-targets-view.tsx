'use client'

import { useState } from 'react'
import {
  Crosshair,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  TrendingUp,
  Globe,
  Lightbulb,
  DollarSign,
  KeyRound,
  Tag,
  Radar,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import {
  useJobTargets,
  useCreateJobTarget,
  useUpdateJobTarget,
  useDeleteJobTarget,
  useScrapeIcpJobs,
  useIcpJobs,
  useConvertScrapedJob,
  useDismissScrapedJob,
  type JobTargetInput,
} from '../hooks/use-ocean-query'
import { relativeTime } from '../hooks/utils'
import type { JobTargetDTO, ScrapedJobDTO } from '@/lib/types'

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

interface FormState {
  name: string
  description: string
  roleTypes: string
  stages: string
  industries: string
  regions: string
  signals: string
  keywords: string
  salaryMinUsd: string
  remoteOnly: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  roleTypes: '',
  stages: '',
  industries: '',
  regions: '',
  signals: '',
  keywords: '',
  salaryMinUsd: '',
  remoteOnly: true,
}

function formFromTarget(t: JobTargetDTO): FormState {
  return {
    name: t.name,
    description: t.description ?? '',
    roleTypes: t.roleTypes.join(', '),
    stages: t.stages.join(', '),
    industries: t.industries.join(', '),
    regions: t.regions.join(', '),
    signals: t.signals.join(', '),
    keywords: t.keywords.join(', '),
    salaryMinUsd: t.salaryMinUsd ? String(t.salaryMinUsd) : '',
    remoteOnly: t.remoteOnly,
  }
}

function formToInput(f: FormState): JobTargetInput {
  return {
    name: f.name,
    description: f.description || null,
    roleTypes: splitList(f.roleTypes),
    stages: splitList(f.stages),
    industries: splitList(f.industries),
    regions: splitList(f.regions),
    signals: splitList(f.signals),
    keywords: splitList(f.keywords),
    salaryMinUsd: f.salaryMinUsd ? Number(f.salaryMinUsd) : null,
    remoteOnly: f.remoteOnly,
  }
}

function JobTargetForm({
  form,
  setForm,
}: {
  form: FormState
  setForm: (f: FormState) => void
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="jt-name">Name *</Label>
        <Input
          id="jt-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Early-stage GTM roles"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="jt-desc">Description</Label>
        <Textarea
          id="jt-desc"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What this target represents — context for the agent."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-roles">Role types</Label>
        <Input
          id="jt-roles"
          value={form.roleTypes}
          onChange={(e) => setForm({ ...form, roleTypes: e.target.value })}
          placeholder="GTM Engineer, RevOps Manager"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-stages">Stages</Label>
        <Input
          id="jt-stages"
          value={form.stages}
          onChange={(e) => setForm({ ...form, stages: e.target.value })}
          placeholder="Seed, Series A, Series B"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-ind">Industries</Label>
        <Input
          id="jt-ind"
          value={form.industries}
          onChange={(e) => setForm({ ...form, industries: e.target.value })}
          placeholder="SaaS, Fintech, Dev Tools"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-reg">Regions</Label>
        <Input
          id="jt-reg"
          value={form.regions}
          onChange={(e) => setForm({ ...form, regions: e.target.value })}
          placeholder="USA, Europe, Australia"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-sig">Signals</Label>
        <Input
          id="jt-sig"
          value={form.signals}
          onChange={(e) => setForm({ ...form, signals: e.target.value })}
          placeholder="scrappy, zero-to-one, no playbook"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-kw">Keywords</Label>
        <Input
          id="jt-kw"
          value={form.keywords}
          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          placeholder="outbound, apollo, lemlist"
        />
        <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jt-sal">Salary min (USD)</Label>
        <Input
          id="jt-sal"
          type="number"
          value={form.salaryMinUsd}
          onChange={(e) => setForm({ ...form, salaryMinUsd: e.target.value })}
          placeholder="60000"
        />
      </div>
      <div className="flex items-center gap-2 rounded-md border p-3">
        <Switch
          id="jt-remote"
          checked={form.remoteOnly}
          onCheckedChange={(v) => setForm({ ...form, remoteOnly: v })}
        />
        <Label htmlFor="jt-remote" className="cursor-pointer">Remote only</Label>
      </div>
    </div>
  )
}

function AddJobTargetDialog() {
  const create = useCreateJobTarget()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function submit() {
    if (!form.name.trim()) return
    create.mutate(formToInput(form), {
      onSettled: () => {
        setOpen(false)
        setForm(EMPTY_FORM)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Add ICP
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Add an ICP</DialogTitle>
        </DialogHeader>
        <JobTargetForm form={form} setForm={setForm} />
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={create.isPending || !form.name.trim()}
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Create ICP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditJobTargetDialog({
  target,
  open,
  onOpenChange,
}: {
  target: JobTargetDTO
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const update = useUpdateJobTarget()
  const [form, setForm] = useState<FormState>(formFromTarget(target))

  function submit() {
    if (!form.name.trim()) return
    update.mutate(
      { id: target.id, body: formToInput(form) },
      { onSettled: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Edit ICP</DialogTitle>
        </DialogHeader>
        <JobTargetForm form={form} setForm={setForm} />
        <DialogFooter>
          <Button onClick={submit} disabled={update.isPending || !form.name.trim()}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChipGroup({
  icon: Icon,
  label,
  items,
  variant,
}: {
  icon: React.ElementType
  label: string
  items: string[]
  variant: 'sky' | 'emerald' | 'indigo' | 'slate' | 'amber' | 'muted'
}) {
  if (items.length === 0) return null
  const styles: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    muted: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <Badge key={`${it}-${i}`} variant="outline" className={styles[variant]}>
            {it}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function JobTargetCard({ target }: { target: JobTargetDTO }) {
  const del = useDeleteJobTarget()
  const [editOpen, setEditOpen] = useState(false)
  const [jobsOpen, setJobsOpen] = useState(false)
  const scrape = useScrapeIcpJobs()
  const { data: jobs } = useIcpJobs(jobsOpen ? target.id : null)
  const convert = useConvertScrapedJob()
  const dismiss = useDismissScrapedJob()

  const isScraping = scrape.isPending && scrape.variables === target.id
  const newJobsCount = target.scrapedJobsCount ?? 0

  return (
    <Card className={isScraping ? 'border-primary/40' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Crosshair className="size-4 text-primary" />
              {target.name}
            </CardTitle>
            {target.description && (
              <CardDescription className="mt-1 line-clamp-2">{target.description}</CardDescription>
            )}
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>Updated {relativeTime(target.updatedAt)}</span>
              {target.lastScrapedAt && (
                <span className="flex items-center gap-1">
                  · Scraped {relativeTime(target.lastScrapedAt)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit ICP">
              <Pencil className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  aria-label="Delete ICP"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this ICP?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes &quot;{target.name}&quot;. JDs linked to it will keep their data but lose this link.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate(target.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <ChipGroup icon={Briefcase} label="Role types" items={target.roleTypes} variant="sky" />
          <ChipGroup icon={TrendingUp} label="Stages" items={target.stages} variant="emerald" />
          <ChipGroup icon={Tag} label="Industries" items={target.industries} variant="indigo" />
          <ChipGroup icon={Globe} label="Regions" items={target.regions} variant="slate" />
          <ChipGroup icon={Lightbulb} label="Signals" items={target.signals} variant="amber" />
          <ChipGroup icon={KeyRound} label="Keywords" items={target.keywords} variant="muted" />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <DollarSign className="size-3 text-muted-foreground" />
            {target.salaryMinUsd
              ? `Salary min $${target.salaryMinUsd.toLocaleString()}`
              : 'No salary floor'}
          </span>
          <Badge variant="outline">{target.remoteOnly ? 'Remote only' : 'Open to on-site'}</Badge>
        </div>

        {/* Scrape section */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Radar className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium">
                {newJobsCount > 0
                  ? `${newJobsCount} new job${newJobsCount === 1 ? '' : 's'} scraped`
                  : target.scrapeStatus === 'done'
                    ? 'Scraped — no new jobs'
                    : 'Not scraped yet'}
              </div>
              <div className="text-[10px] text-muted-foreground">
                LinkedIn · Indeed · Wellfound
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {newJobsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setJobsOpen(true)}
              >
                View jobs
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={isScraping}
              onClick={() => scrape.mutate(target.id)}
            >
              {isScraping ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Radar className="size-3" />
              )}
              {isScraping ? 'Scraping…' : 'Scrape jobs'}
            </Button>
          </div>
        </div>
      </CardContent>

      <EditJobTargetDialog target={target} open={editOpen} onOpenChange={setEditOpen} />

      {/* Scraped jobs sheet */}
      <Sheet open={jobsOpen} onOpenChange={setJobsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Radar className="size-4 text-primary" />
              Scraped jobs · {target.name}
            </SheetTitle>
            <SheetDescription>
              Jobs scraped from LinkedIn, Indeed, and Wellfound matching this ICP. Convert promising
              ones into JDs — they&apos;ll appear in Job Descriptions with source &quot;agent&quot;.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto ocean-scroll px-5 py-4 space-y-3">
            {!jobs || jobs.length === 0 ? (
              <div className="py-12 text-center">
                <Radar className="mx-auto size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  No scraped jobs yet. Click &quot;Scrape jobs&quot; to find postings matching this ICP.
                </p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-lg border p-3 space-y-2 ${
                    job.status === 'converted' ? 'border-emerald-300 bg-emerald-50/40' : ''
                  } ${job.status === 'dismissed' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{job.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {job.company} · {job.location || 'Remote'}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize shrink-0"
                    >
                      {job.sourcePlatform}
                    </Badge>
                  </div>
                  {job.salaryText && (
                    <div className="text-xs font-medium text-emerald-700">{job.salaryText}</div>
                  )}
                  <p className="text-xs text-muted-foreground">{job.snippet}</p>
                  {job.fitReason && (
                    <p className="text-xs">
                      <span className="font-medium">Fit:</span>{' '}
                      <span className="text-muted-foreground">{job.fitReason}</span>
                    </p>
                  )}
                  {job.status === 'new' && (
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={convert.isPending}
                        onClick={() => convert.mutate(job.id)}
                      >
                        <ArrowRight className="size-3" />
                        Convert to JD
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={dismiss.isPending}
                        onClick={() => dismiss.mutate(job.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                  {job.status === 'converted' && (
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Converted to JD
                    </div>
                  )}
                  {job.status === 'dismissed' && (
                    <div className="text-xs text-muted-foreground">Dismissed</div>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

function JobTargetsEmpty() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Crosshair className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No ICPs yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Define your first role ICP — the kinds of roles, stages, and industries you place Divers into.
          Each ICP drives its own job scraping on LinkedIn, Indeed, and Wellfound.
        </p>
      </CardContent>
    </Card>
  )
}

export function JobTargetsView() {
  const { data: targets, isLoading } = useJobTargets()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crosshair className="size-5 text-primary" />
            Role ICPs
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Each ICP is a role category Oceans places — EA, Marketing, Finance, Ops, CS, GTM. Define
            them separately, then scrape LinkedIn / Indeed / Wellfound per ICP to find open jobs.
          </p>
        </div>
        <AddJobTargetDialog />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : !targets || targets.length === 0 ? (
        <JobTargetsEmpty />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {targets.map((t) => (
            <JobTargetCard key={t.id} target={t} />
          ))}
        </div>
      )}
    </div>
  )
}
