'use client'

import { useState } from 'react'
import {
  Users,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Sparkles,
  Search,
  Mail,
  Phone,
  Linkedin,
  Github,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useCandidates,
  useCreateCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  useRestructureCandidate,
} from '../hooks/use-ocean-query'
import { CandidateStatusBadge } from '../ui/signal-badge'
import { initials, SAMPLE_CV, relativeTime } from '../hooks/utils'
import { useOceanStore } from '../store'
import type { CandidateDTO } from '@/lib/types'

type StatusFilter = 'all' | 'active' | 'placed' | 'paused'
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'placed', label: 'Placed' },
  { id: 'paused', label: 'Paused' },
]
const STATUS_RANK: Record<string, number> = { active: 0, placed: 1, paused: 2 }

function AddCandidateDialog() {
  const create = useCreateCandidate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    headline: '',
    location: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    githubUrl: '',
    rawProfile: '',
    tags: '',
  })

  function reset() {
    setForm({
      name: '',
      headline: '',
      location: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      githubUrl: '',
      rawProfile: '',
      tags: '',
    })
  }

  function loadSample() {
    setForm((f) => ({
      ...f,
      name: 'Kasun Perera',
      headline: 'GTM / Outbound Operator',
      location: 'Colombo, Sri Lanka',
      rawProfile: SAMPLE_CV,
      tags: 'gtm, outbound, apollo, lemlist',
    }))
  }

  function submit() {
    if (!form.name.trim() || !form.headline.trim() || !form.location.trim() || !form.rawProfile.trim()) {
      return
    }
    create.mutate(
      {
        name: form.name,
        headline: form.headline,
        location: form.location,
        email: form.email || null,
        phone: form.phone || null,
        linkedinUrl: form.linkedinUrl || null,
        githubUrl: form.githubUrl || null,
        rawProfile: form.rawProfile,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
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
        Add Candidate
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name *</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-headline">Headline *</Label>
            <Input
              id="c-headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="e.g. GTM Operator"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-loc">Location *</Label>
            <Input
              id="c-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Colombo, Sri Lanka"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-li">LinkedIn URL</Label>
            <Input
              id="c-li"
              value={form.linkedinUrl}
              onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-gh">GitHub URL</Label>
            <Input
              id="c-gh"
              value={form.githubUrl}
              onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tags">Tags (comma-separated)</Label>
            <Input
              id="c-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="gtm, outbound, saas"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="c-raw">Raw profile / CV *</Label>
              <Button variant="ghost" size="sm" onClick={loadSample}>
                <Sparkles className="size-4" />
                Load sample
              </Button>
            </div>
            <Textarea
              id="c-raw"
              rows={10}
              value={form.rawProfile}
              onChange={(e) => setForm({ ...form, rawProfile: e.target.value })}
              placeholder="Paste the candidate's CV, LinkedIn about, or raw profile text…"
              className="font-mono text-xs"
            />
          </div>
        </div>

        {create.isPending && (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center gap-2.5">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              AI is structuring the profile into outcomes, tools, stages, and roles-fit…
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              create.isPending ||
              !form.name.trim() ||
              !form.headline.trim() ||
              !form.location.trim() ||
              !form.rawProfile.trim()
            }
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {create.isPending ? 'Structuring…' : 'Create candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CandidateCard({
  candidate,
  onOpen,
}: {
  candidate: CandidateDTO
  onOpen: (id: string) => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(candidate.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(candidate.id)
        }
      }}
      className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all py-4"
    >
      <CardContent className="px-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{candidate.name}</div>
            <div className="text-xs text-muted-foreground truncate">{candidate.headline}</div>
            <div className="text-[11px] text-muted-foreground truncate">{candidate.location}</div>
          </div>
          <CandidateStatusBadge status={candidate.status} />
        </div>

        {candidate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {candidate.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.tools.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full" onClick={(e) => {
          e.stopPropagation()
          onOpen(candidate.id)
        }}>
          View profile
        </Button>
      </CardContent>
    </Card>
  )
}

function CandidateDetail({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: CandidateDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const restructure = useRestructureCandidate()
  const del = useDeleteCandidate()
  const update = useUpdateCandidate()
  const [editOpen, setEditOpen] = useState(false)

  if (!candidate) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Loading…</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate">{candidate.name}</div>
              <SheetDescription className="truncate">
                {candidate.headline}
              </SheetDescription>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6 ocean-scroll">
            {/* Header info */}
            <div className="flex items-center gap-2 flex-wrap">
              <CandidateStatusBadge status={candidate.status} />
              <span className="text-xs text-muted-foreground">
                Added {relativeTime(candidate.createdAt)} · updated {relativeTime(candidate.updatedAt)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Location</div>
                <div className="text-sm font-medium">{candidate.location}</div>
              </div>
              {candidate.email && (
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</div>
                  <a href={`mailto:${candidate.email}`} className="text-sm text-primary hover:underline flex items-center gap-1 truncate">
                    <Mail className="size-3" />
                    {candidate.email}
                  </a>
                </div>
              )}
              {candidate.phone && (
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</div>
                  <div className="text-sm flex items-center gap-1"><Phone className="size-3" />{candidate.phone}</div>
                </div>
              )}
              {candidate.linkedinUrl && (
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">LinkedIn</div>
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate">
                    <Linkedin className="size-3" /> Profile
                  </a>
                </div>
              )}
              {candidate.githubUrl && (
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">GitHub</div>
                  <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate">
                    <Github className="size-3" /> Profile
                  </a>
                </div>
              )}
            </div>

            {candidate.tags.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.tags.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Outcomes */}
            {candidate.outcomes.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Sparkles className="size-4 text-primary" />
                  Outcomes (what they've built)
                </h3>
                <ul className="space-y-1">
                  {candidate.outcomes.map((o, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="mt-1.5 size-1 rounded-full bg-primary shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Roles fit */}
            {candidate.rolesFit.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-2">Could fill these roles even without the title</h3>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.rolesFit.map((r) => (
                    <Badge key={r} className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                      {r}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Skills & tools */}
            <div className="grid sm:grid-cols-2 gap-4">
              {candidate.skills.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </section>
              )}
              {candidate.tools.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Tools</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.tools.map((t) => (
                      <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Company stages */}
            {candidate.companyStages.length > 0 && (
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Company stages worked at</h3>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.companyStages.map((s) => (
                    <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Work context */}
            {candidate.workContext && (
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Work context</h3>
                <blockquote className="border-l-2 border-primary/40 pl-3 italic text-sm text-foreground/80">
                  {candidate.workContext}
                </blockquote>
              </section>
            )}

            <Separator />

            {/* Raw profile */}
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Raw profile</h3>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs font-mono ocean-scroll">
                {candidate.rawProfile}
              </pre>
            </section>

            <div className="flex flex-wrap gap-2 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => restructure.mutate(candidate.id)}
                disabled={restructure.isPending}
              >
                {restructure.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Re-structure with AI
              </Button>
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
                    <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {candidate.name} from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        del.mutate(candidate.id, {
                          onSettled: () => onOpenChange(false),
                        })
                      }}
                    >
                      Delete candidate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </ScrollArea>

        <EditCandidateDialog
          key={candidate.id}
          candidate={candidate}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={(body) => update.mutate({ id: candidate.id, body })}
          saving={update.isPending}
        />
      </SheetContent>
    </Sheet>
  )
}

function EditCandidateDialog({
  candidate,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  candidate: CandidateDTO
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (body: Record<string, unknown>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    name: candidate.name,
    headline: candidate.headline,
    location: candidate.location,
    status: candidate.status,
    email: candidate.email ?? '',
    phone: candidate.phone ?? '',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input
              id="ec-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-headline">Headline</Label>
            <Input
              id="ec-headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-loc">Location</Label>
            <Input
              id="ec-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-status">Status</Label>
            <Input
              id="ec-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-email">Email</Label>
            <Input
              id="ec-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-phone">Phone</Label>
            <Input
              id="ec-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onSave({
                name: form.name,
                headline: form.headline,
                location: form.location,
                status: form.status,
                email: form.email || null,
                phone: form.phone || null,
              })
              onOpenChange(false)
            }}
            disabled={saving}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CandidateGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

function CandidateEmpty({
  onGoToJds,
}: {
  onGoToJds?: () => void
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No candidates yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add your first candidate to start matching against JDs.
        </p>
        {onGoToJds && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onGoToJds}>
            Browse job descriptions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function CandidatesView() {
  const { data: candidates, isLoading } = useCandidates()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const setActiveView = useOceanStore((s) => s.setActiveView)

  const filtered = (candidates ?? [])
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.tools.some((t) => t.toLowerCase().includes(q)) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
    .slice()
    .sort((a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99))

  const selected = filtered.find((c) => c.id === selectedId) ?? null

  function open(id: string) {
    setSelectedId(id)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Active Candidates
              {candidates && (
                <Badge variant="secondary">{candidates.length}</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Structured, outcome-based profiles — the foundation the matcher runs on.
            </CardDescription>
          </div>
          <AddCandidateDialog />
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, headline, tool, location, or tag…"
              className="pl-9"
              aria-label="Search candidates"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 mb-4 overflow-x-auto ocean-scroll">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  statusFilter === s.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={statusFilter === s.id}
              >
                {s.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <CandidateGridSkeleton />
          ) : filtered.length === 0 ? (
            search.trim() || statusFilter !== 'all' ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No candidates{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}
                {search.trim() ? ` matching "${search}"` : ''}.
              </div>
            ) : (
              <CandidateEmpty onGoToJds={() => setActiveView('jds')} />
            )
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <CandidateCard key={c.id} candidate={c} onOpen={open} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CandidateDetail
        candidate={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
