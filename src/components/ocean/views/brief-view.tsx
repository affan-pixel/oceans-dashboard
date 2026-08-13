'use client'

import { useState } from 'react'
import {
  PenLine,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Sparkles,
  FileText,
  ArrowRight,
  StickyNote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  useBriefs,
  useCreateBrief,
  useUpdateBrief,
  useDeleteBrief,
  useConvertBriefToJd,
} from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { relativeTime } from '../hooks/utils'
import type { BriefDTO } from '@/lib/types'

const BRIEF_TYPES: { value: string; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'jd_draft', label: 'JD draft' },
  { value: 'role_description', label: 'Role description' },
  { value: 'context', label: 'Context' },
]

const TYPE_STYLES: Record<string, string> = {
  note: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
  jd_draft: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
  role_description: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  context: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
}

function typeLabel(t: string): string {
  return BRIEF_TYPES.find((b) => b.value === t)?.label ?? t.replace(/_/g, ' ')
}

function BriefComposer() {
  const create = useCreateBrief()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('note')
  const [content, setContent] = useState('')

  function submit() {
    if (!title.trim() || !content.trim()) return
    create.mutate(
      { title, type, content },
      {
        onSettled: () => {
          setTitle('')
          setContent('')
          setType('note')
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-4 text-primary" />
          New brief
        </CardTitle>
        <CardDescription>
          Anything goes — paste a JD, draft a role, leave client-call notes. Convert anything into a structured JD with one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Title</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title — e.g. 'Client call notes — Bright Harbor'"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="bc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRIEF_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-content">Content</Label>
          <Textarea
            id="bc-content"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste, type, or dictate anything. The agents will pick this up."
            className="font-mono text-xs"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={create.isPending || !title.trim() || !content.trim()}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Save brief
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EditBriefDialog({
  brief,
  open,
  onOpenChange,
}: {
  brief: BriefDTO
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const update = useUpdateBrief()
  const [title, setTitle] = useState(brief.title)
  const [type, setType] = useState(brief.type)
  const [content, setContent] = useState(brief.content)

  function submit() {
    if (!title.trim() || !content.trim()) return
    update.mutate(
      { id: brief.id, body: { title, type, content } },
      { onSettled: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Edit brief</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eb-title">Title</Label>
              <Input
                id="eb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="eb-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRIEF_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eb-content">Content</Label>
            <Textarea
              id="eb-content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs"
            />
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

function BriefCard({ brief }: { brief: BriefDTO }) {
  const convert = useConvertBriefToJd()
  const del = useDeleteBrief()
  const setActiveView = useOceanStore((s) => s.setActiveView)
  const setSelectedJdId = useOceanStore((s) => s.setSelectedJdId)
  const [editOpen, setEditOpen] = useState(false)

  const canConvert =
    (brief.type === 'jd_draft' || brief.type === 'role_description') && !brief.linkedJdId

  return (
    <Card>
      <CardContent className="pt-4 space-y-3 relative">
        {convert.isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm space-y-2 px-4 text-center rounded-lg">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Claude is parsing this brief into a structured JD…</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">~5–15 seconds.</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={TYPE_STYLES[brief.type] ?? TYPE_STYLES.note}>
                {typeLabel(brief.type)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {relativeTime(brief.createdAt)}
              </span>
            </div>
            <h3 className="font-medium mt-1.5">{brief.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit brief">
              <Pencil className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  aria-label="Delete brief"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes the brief. If it was converted into a JD, the JD remains.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate(brief.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs font-mono ocean-scroll">
          {brief.content}
        </pre>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canConvert ? (
            <Button
              size="sm"
              onClick={() =>
                convert.mutate({ id: brief.id, body: {} })
              }
              disabled={convert.isPending}
            >
              {convert.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Convert to JD
            </Button>
          ) : brief.linkedJdId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedJdId(brief.linkedJdId)
                setActiveView('jds')
              }}
            >
              <FileText className="size-4" />
              View linked JD
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>

      <EditBriefDialog
        brief={brief}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  )
}

function BriefsEmpty() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <StickyNote className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No briefs yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Start typing above. Paste a JD, draft a role description, or leave client-call notes.
        </p>
      </CardContent>
    </Card>
  )
}

export function BriefView() {
  const { data: briefs, isLoading } = useBriefs()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PenLine className="size-5 text-primary" />
          Brief
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A scratchpad for the agents. Paste a JD, draft a role, leave client-call notes — convert anything into a parsed JD with one click.
        </p>
      </div>

      <BriefComposer />

      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          Saved briefs
          {briefs && <Badge variant="secondary">{briefs.length}</Badge>}
        </h3>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : !briefs || briefs.length === 0 ? (
          <BriefsEmpty />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {briefs.map((b) => (
              <BriefCard key={b.id} brief={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
