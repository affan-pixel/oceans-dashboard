'use client'

import { useState } from 'react'
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Trash2,
  Pencil,
  Loader2,
  ArrowRight,
  Send,
  Building2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  useJd,
  useUpdateJd,
  useDeleteJd,
  useRunMatch,
  useToggleJdActive,
  useJobTargets,
} from './hooks/use-ocean-query'
import { useOceanStore } from './store'
import { relativeTime } from './hooks/utils'
import { PriorityBadge } from './ui/signal-badge'
import type { JobDescriptionDTO } from '@/lib/types'

function ParsedJdView({ jd }: { jd: JobDescriptionDTO }) {
  return (
    <div className="space-y-4">
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
                Hidden signals describe the underlying context — e.g. &quot;scrappy&quot;, &quot;zero to one&quot;,
                &quot;no playbook&quot;. They help the matcher look beyond keywords to culture fit.
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

function EditJdDialog({
  jd,
  open,
  onOpenChange,
}: {
  jd: JobDescriptionDTO
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const update = useUpdateJd()
  const { data: targets } = useJobTargets()
  const [form, setForm] = useState({
    title: jd.title,
    company: jd.company ?? '',
    priority: jd.priority,
    notes: jd.notes ?? '',
    targetId: jd.targetId ?? 'none',
    isActive: jd.isActive,
  })

  function submit() {
    update.mutate(
      {
        id: jd.id,
        body: {
          title: form.title,
          company: form.company || undefined,
          priority: form.priority,
          notes: form.notes || null,
          targetId: form.targetId === 'none' ? null : form.targetId,
          isActive: form.isActive,
        },
      },
      { onSettled: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Edit job description</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ej-title">Title</Label>
            <Input
              id="ej-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ej-company">Company</Label>
            <Input
              id="ej-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ej-priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger id="ej-priority">
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
            <Label htmlFor="ej-target">Linked job target</Label>
            <Select
              value={form.targetId}
              onValueChange={(v) => setForm({ ...form, targetId: v })}
            >
              <SelectTrigger id="ej-target">
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
            <Label htmlFor="ej-notes">Notes</Label>
            <Textarea
              id="ej-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 rounded-md border p-3">
            <Switch
              id="ej-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label htmlFor="ej-active" className="cursor-pointer">
              Mark as active search (a job I&apos;m looking for)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function JdDetailSheet({
  jdId,
  open,
  onOpenChange,
}: {
  jdId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: jd, isLoading } = useJd(jdId)
  const runMatch = useRunMatch()
  const del = useDeleteJd()
  const toggle = useToggleJdActive()
  const { data: targets } = useJobTargets()
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedJdId = useOceanStore((s) => s.setSelectedJdId)
  const setSelectedMatchJdId = useOceanStore((s) => s.setSelectedMatchJdId)
  const [editOpen, setEditOpen] = useState(false)

  const linkedTarget = (targets ?? []).find((t) => t.id === jd?.targetId)

  function handleRunMatch() {
    if (!jd) return
    runMatch.mutate(jd.id, {
      onSuccess: () => {
        onOpenChange(false)
        setSelectedMatchJdId(jd.id)
        setActiveView('matches')
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            {jd ? (
              <>
                <FileText className="size-5 text-primary" />
                {jd.title}
              </>
            ) : (
              'Job description'
            )}
          </SheetTitle>
          <SheetDescription>
            {jd ? `Parsed ${relativeTime(jd.createdAt)} · ${jd.company ?? 'No company'}` : 'Loading…'}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !jd ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 relative">
            {runMatch.isPending && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm space-y-3 px-4 text-center">
                <Loader2 className="size-10 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Embedding JD… ranking candidates by outcome fit…</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    This is the semantic match step. Comparing outcomes against every active candidate.
                    Usually takes 10–30 seconds.
                  </p>
                </div>
              </div>
            )}
            <div className="px-6 py-4 space-y-6 ocean-scroll">
              {/* Header badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={jd.priority} />
                <Badge variant="outline" className="capitalize">{jd.status}</Badge>
                {jd.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    Active search
                  </Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                {linkedTarget && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="size-3" />
                    {linkedTarget.name}
                  </Badge>
                )}
              </div>

              {/* Company + meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</div>
                  <div className="text-sm font-medium">{jd.title}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Company</div>
                  <div className="text-sm font-medium">{jd.company ?? '—'}</div>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Mark as active search</div>
                  <div className="text-xs text-muted-foreground">
                    Active searches are &quot;jobs I&apos;m looking for&quot; — they appear in the Active Searches section.
                  </div>
                </div>
                <Switch
                  checked={jd.isActive}
                  onCheckedChange={() => toggle.mutate(jd.id)}
                  disabled={toggle.isPending}
                  aria-label="Toggle active search"
                />
              </div>

              {jd.notes && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                  <p className="text-sm whitespace-pre-wrap">{jd.notes}</p>
                </div>
              )}

              <Separator />

              <ParsedJdView jd={jd} />

              <Separator />

              {/* Raw text */}
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  Raw JD text
                </h3>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs font-mono ocean-scroll">
                  {jd.rawText}
                </pre>
              </section>

              <Separator />

              {/* Run match */}
              <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      Run semantic match
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Embeds this JD and ranks every active candidate by outcome fit. ~10–30s.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleRunMatch} disabled={runMatch.isPending}>
                    {runMatch.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {runMatch.isPending ? 'Matching…' : 'Run match'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false)
                      setSelectedMatchJdId(jd.id)
                      setActiveView('matches')
                    }}
                  >
                    View past matches
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </section>

              <div className="flex flex-wrap gap-2 pb-4">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this JD?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the JD and all its matches. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          del.mutate(jd.id, {
                            onSettled: () => {
                              onOpenChange(false)
                              setSelectedJdId(null)
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
          </ScrollArea>
        )}

        {jd && (
          <EditJdDialog
            jd={jd}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
