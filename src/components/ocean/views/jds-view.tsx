'use client'

import { useState } from 'react'
import {
  FileText,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Wand2,
  Sparkles,
  Send,
  ChevronRight,
  Search,
  Flame,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  useJds,
  useCreateJd,
  useDeleteJd,
  useRunMatch,
  useToggleJdActive,
  useJobTargets,
} from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { SAMPLE_JD, relativeTime } from '../hooks/utils'
import { JdDetailSheet } from '../jd-detail-sheet'
import { PriorityBadge } from '../ui/signal-badge'
import type { JobDescriptionDTO } from '@/lib/types'

function AddJdDialog() {
  const create = useCreateJd()
  const { data: targets } = useJobTargets()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    company: '',
    rawText: '',
    isActive: false,
    priority: 'medium',
    notes: '',
    targetId: 'none',
    source: 'sales_team',
  })

  function reset() {
    setForm({
      title: '',
      company: '',
      rawText: '',
      isActive: false,
      priority: 'medium',
      notes: '',
      targetId: 'none',
      source: 'sales_team',
    })
  }

  function loadSample() {
    setForm((f) => ({
      ...f,
      title: 'GTM Engineer',
      company: 'Series A SaaS',
      rawText: SAMPLE_JD,
    }))
  }

  function submit() {
    if (!form.title.trim() || !form.rawText.trim()) return
    create.mutate(
      {
        title: form.title,
        company: form.company || undefined,
        rawText: form.rawText,
        isActive: form.isActive,
        priority: form.priority,
        notes: form.notes || null,
        targetId: form.targetId === 'none' ? null : form.targetId,
        source: form.source,
      },
      {
        onSettled: () => {
          setOpen(false)
          reset()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Add JD
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Add a job description</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nj-title">Title *</Label>
            <Input
              id="nj-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. GTM Engineer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nj-company">Company</Label>
            <Input
              id="nj-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="e.g. Acme SaaS"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="nj-raw">Raw JD text *</Label>
              <Button variant="ghost" size="sm" onClick={loadSample}>
                <Wand2 className="size-4" />
                Load sample
              </Button>
            </div>
            <Textarea
              id="nj-raw"
              rows={12}
              value={form.rawText}
              onChange={(e) => {
                const next = e.target.value
                setForm((f) => ({ ...f, rawText: next }))
                if (!form.title) {
                  const firstLine = next.split('\n')[0].trim()
                  if (firstLine) setForm((f) => ({ ...f, title: firstLine }))
                }
              }}
              placeholder="Paste the full job description here…"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nj-source">Source</Label>
            <Select
              value={form.source}
              onValueChange={(v) => setForm({ ...form, source: v })}
            >
              <SelectTrigger id="nj-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_team">Sales team</SelectItem>
                <SelectItem value="agent">Agent discovered</SelectItem>
                <SelectItem value="client">Client submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nj-priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger id="nj-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['high', 'medium', 'low'].map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nj-target">Link to a job target</Label>
            <Select
              value={form.targetId}
              onValueChange={(v) => setForm({ ...form, targetId: v })}
            >
              <SelectTrigger id="nj-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {(targets ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nj-notes">Notes</Label>
            <Textarea
              id="nj-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Freeform notes about this search — context, founder, why it matters."
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 rounded-md border p-3">
            <Switch
              id="nj-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label htmlFor="nj-active" className="cursor-pointer">
              Mark as active search (a job I&apos;m looking for)
            </Label>
          </div>
        </div>

        {create.isPending && (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center gap-2.5">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              Claude is extracting outcomes, skills, context, and hidden signals… (~5–15s)
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={create.isPending || !form.title.trim() || !form.rawText.trim()}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {create.isPending ? 'Parsing…' : 'Parse & save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function JdCard({
  jd,
  onView,
  onRunMatch,
  runningMatchId,
}: {
  jd: JobDescriptionDTO
  onView: (id: string) => void
  onRunMatch: (id: string) => void
  runningMatchId: string | null
}) {
  const toggle = useToggleJdActive()
  const del = useDeleteJd()
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedMatchJdId = useOceanStore((s) => s.setSelectedMatchJdId)
  const isRunning = runningMatchId === jd.id

  return (
    <Card className={`relative overflow-hidden ${jd.isActive ? 'border-primary/40' : ''}`}>
      {jd.isActive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden />
      )}
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{jd.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {jd.company ?? '—'} · {relativeTime(jd.createdAt)}
            </div>
          </div>
          <PriorityBadge priority={jd.priority} />
        </div>

        {jd.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{jd.notes}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="capitalize">{jd.status}</Badge>
          {jd.isActive && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              Active
            </Badge>
          )}
          {jd.source === 'agent' && (
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30">
              Agent-sourced
            </Badge>
          )}
          {jd.source === 'client' && (
            <Badge className="bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30">
              Client-submitted
            </Badge>
          )}
          {jd.outcomes.length > 0 && (
            <Badge variant="secondary">
              {jd.outcomes.length} outcome{jd.outcomes.length === 1 ? '' : 's'}
            </Badge>
          )}
          {jd.signals.length > 0 && (
            <Badge variant="outline">{jd.signals.length} signal{jd.signals.length === 1 ? '' : 's'}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <Switch
              checked={jd.isActive}
              onCheckedChange={() => toggle.mutate(jd.id)}
              disabled={toggle.isPending}
              aria-label="Toggle active search"
            />
            Active search
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(jd.id)}
              aria-label={`View ${jd.title}`}
            >
              <Eye className="size-4" />
              View
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onRunMatch(jd.id)}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isRunning ? 'Matching…' : 'Run match'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedMatchJdId(jd.id)
              setActiveView('matches')
            }}
          >
            Matches
            <ChevronRight className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive" aria-label="Delete JD">
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this JD?</AlertDialogTitle>
                <AlertDialogDescription>
                  Removes the JD and all its matches. Cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => del.mutate(jd.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {isRunning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm space-y-2 px-4 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Embedding JD… ranking candidates…</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              10–30 seconds. Comparing outcomes against every active candidate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActiveSearchesSection({
  jds,
  onView,
  onRunMatch,
  runningMatchId,
}: {
  jds: JobDescriptionDTO[]
  onView: (id: string) => void
  onRunMatch: (id: string) => void
  runningMatchId: string | null
}) {
  if (jds.length === 0) return null
  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-4 text-primary" />
          Active searches
          <Badge variant="secondary">{jds.length}</Badge>
        </CardTitle>
        <CardDescription>
          The jobs you are actively looking for. Run a match to rank candidates against any of these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jds.map((jd) => (
            <JdCard
              key={jd.id}
              jd={jd}
              onView={onView}
              onRunMatch={onRunMatch}
              runningMatchId={runningMatchId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function JdsEmpty() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No job descriptions yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Paste a JD and let Claude parse it into outcomes, skills, context, and hidden signals.
          Mark the ones you&apos;re actively looking for.
        </p>
      </CardContent>
    </Card>
  )
}

export function JdsView() {
  const { data: jds, isLoading } = useJds()
  const runMatch = useRunMatch()
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedMatchJdId = useOceanStore((s) => s.setSelectedMatchJdId)
  const storeSelectedJdId = useOceanStore((s) => s.selectedJdId)
  const clearSelectedJdId = useOceanStore((s) => s.setSelectedJdId)
  const [localJdId, setLocalJdId] = useState<string | null>(null)
  const [localOpen, setLocalOpen] = useState(false)
  const [runningMatchId, setRunningMatchId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Derive the active selection from the store hint (e.g. from Brief/Matches) or local state.
  // Avoids useEffect — when a store hint is set, treat the sheet as open for that JD.
  const selectedJdId = storeSelectedJdId ?? localJdId
  const sheetOpen = storeSelectedJdId ? true : localOpen

  function openJd(id: string) {
    if (storeSelectedJdId) clearSelectedJdId(null)
    setLocalJdId(id)
    setLocalOpen(true)
  }

  function handleSheetOpenChange(v: boolean) {
    if (!v) {
      if (storeSelectedJdId) clearSelectedJdId(null)
      setLocalOpen(false)
    } else {
      setLocalOpen(true)
    }
  }

  const active = (jds ?? []).filter((j) => j.isActive)
  const allFiltered = (jds ?? []).filter((j) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      j.title.toLowerCase().includes(q) ||
      (j.company ?? '').toLowerCase().includes(q) ||
      j.outcomes.some((o) => o.toLowerCase().includes(q))
    )
  })

  function handleRunMatch(id: string) {
    setRunningMatchId(id)
    runMatch.mutate(id, {
      onSettled: () => setRunningMatchId(null),
      onSuccess: () => {
        setSelectedMatchJdId(id)
        setActiveView('matches')
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Job Descriptions
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload JDs and mark the ones you are actively looking for.
          </p>
        </div>
        <AddJdDialog />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (jds ?? []).length === 0 ? (
        <JdsEmpty />
      ) : (
        <>
          <ActiveSearchesSection
            jds={active}
            onView={openJd}
            onRunMatch={handleRunMatch}
            runningMatchId={runningMatchId}
          />

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  All job descriptions
                  <Badge variant="secondary">{allFiltered.length}</Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Every parsed JD. Toggle &quot;Active search&quot; to mark the ones you&apos;re currently looking for.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, company, or outcome…"
                  className="pl-9"
                  aria-label="Search job descriptions"
                />
              </div>

              {allFiltered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No JDs match &quot;{search}&quot;.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFiltered.map((jd) => (
                    <JdCard
                      key={jd.id}
                      jd={jd}
                      onView={openJd}
                      onRunMatch={handleRunMatch}
                      runningMatchId={runningMatchId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <JdDetailSheet
        jdId={selectedJdId}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </div>
  )
}
