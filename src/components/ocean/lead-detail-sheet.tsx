'use client'

import { useState } from 'react'
import {
  ExternalLink,
  Globe,
  Building2,
  Briefcase,
  MapPin,
  Users,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Sparkles,
  Send,
  Mail,
  Linkedin,
  Hand,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SignalBadge,
  PriorityBadge,
  LeadStatusBadge,
  OutreachStatusBadge,
} from './ui/signal-badge'
import { ScoreRing } from './ui/score-ring'
import {
  useLead,
  useUpdateLead,
  useDeleteLead,
  useCreateOutreach,
  useUpdateOutreach,
} from './hooks/use-ocean-query'
import { relativeTime } from './hooks/utils'
import type { LeadDTO } from '@/lib/types'

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'manual', label: 'Manual', icon: Hand },
]

const OUTREACH_STATUS = ['pending', 'sent', 'replied', 'bounced']

function StatusSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-7 w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OUTREACH_STATUS.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function OutreachComposer({
  leadId,
  onDone,
}: {
  leadId: string
  onDone?: () => void
}) {
  const createOutreach = useCreateOutreach()
  const [channel, setChannel] = useState('email')
  const [action, setAction] = useState('')
  const [role, setRole] = useState('')
  const [open, setOpen] = useState(false)

  function submit() {
    if (!action.trim()) return
    createOutreach.mutate(
      {
        leadId,
        body: { channel, action, role: role || undefined },
      },
      {
        onSettled: () => {
          setOpen(false)
          setAction('')
          setRole('')
          onDone?.()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Draft next outreach step
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draft outreach step</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="out-channel">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="out-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => {
                  const Icon = c.icon
                  return (
                    <SelectItem key={c.value} value={c.value}>
                      <Icon className="size-4" />
                      {c.label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {channel === 'email'
                ? 'Claude will draft the email body automatically.'
                : 'Manual or LinkedIn — no AI draft.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="out-action">Action / subject</Label>
            <Input
              id="out-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Intro email re. GTM Engineer hire"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="out-role">Role you're pitching (optional)</Label>
            <Input
              id="out-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. GTM Engineer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={createOutreach.isPending || !action.trim()}
          >
            {createOutreach.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {channel === 'email' ? 'Draft with AI' : 'Add step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditLeadDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: LeadDTO
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const update = useUpdateLead()
  const [form, setForm] = useState({
    companyName: lead.companyName,
    industry: lead.industry ?? '',
    stage: lead.stage ?? '',
    region: lead.region ?? '',
    location: lead.location ?? '',
    sizeMin: lead.sizeMin?.toString() ?? '',
    sizeMax: lead.sizeMax?.toString() ?? '',
    priority: lead.priority,
    status: lead.status,
    website: lead.website ?? '',
    notes: lead.notes ?? '',
  })

  function submit() {
    update.mutate(
      {
        id: lead.id,
        body: {
          companyName: form.companyName,
          industry: form.industry || null,
          stage: form.stage || null,
          region: form.region || null,
          location: form.location || null,
          sizeMin: form.sizeMin ? Number(form.sizeMin) : null,
          sizeMax: form.sizeMax ? Number(form.sizeMax) : null,
          priority: form.priority,
          status: form.status,
          website: form.website || null,
          notes: form.notes || null,
        },
      },
      { onSettled: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="el-name">Company name</Label>
            <Input
              id="el-name"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-industry">Industry</Label>
            <Input
              id="el-industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-stage">Stage</Label>
            <Input
              id="el-stage"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-region">Region</Label>
            <Select
              value={form.region || 'none'}
              onValueChange={(v) =>
                setForm({ ...form, region: v === 'none' ? '' : v })
              }
            >
              <SelectTrigger id="el-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-loc">Location</Label>
            <Input
              id="el-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-prio">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger id="el-prio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger id="el-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['new', 'contacted', 'replied', 'qualified', 'won', 'lost'].map(
                  (s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-smin">Size min</Label>
            <Input
              id="el-smin"
              type="number"
              value={form.sizeMin}
              onChange={(e) => setForm({ ...form, sizeMin: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-smax">Size max</Label>
            <Input
              id="el-smax"
              type="number"
              value={form.sizeMax}
              onChange={(e) => setForm({ ...form, sizeMax: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="el-web">Website</Label>
            <Input
              id="el-web"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="el-notes">Notes</Label>
            <Textarea
              id="el-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={update.isPending || !form.companyName.trim()}
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteLeadDialog({
  leadId,
  onDeleted,
}: {
  leadId: string
  onDeleted: () => void
}) {
  const del = useDeleteLead()
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the lead, all its signals, and all outreach steps. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              del.mutate(leadId, { onSettled: () => onDeleted() })
            }}
          >
            {del.isPending ? 'Deleting…' : 'Delete lead'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function OutreachTimeline({ leadId }: { leadId: string }) {
  const { data: lead } = useLead(leadId)
  const updateOutreach = useUpdateOutreach()

  if (!lead) return null

  const steps = lead.outreachSteps

  return (
    <div className="space-y-3">
      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No outreach steps yet. Draft your first one above.
        </p>
      )}
      {steps.map((step) => (
        <div key={step.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {step.step}
              </span>
              <Badge variant="outline" className="capitalize">
                {step.channel === 'email' && <Mail className="size-3" />}
                {step.channel === 'linkedin' && <Linkedin className="size-3" />}
                {step.channel === 'manual' && <Hand className="size-3" />}
                {step.channel}
              </Badge>
              <OutreachStatusBadge status={step.status} />
            </div>
            <StatusSelect
              value={step.status}
              onChange={(v) =>
                updateOutreach.mutate({
                  id: step.id,
                  body: { status: v, sentAt: v === 'sent' ? new Date().toISOString() : null },
                })
              }
            />
          </div>
          <div className="text-sm font-medium">{step.action}</div>
          {step.content && (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs font-mono ocean-scroll">
              {step.content}
            </pre>
          )}
          <div className="text-[11px] text-muted-foreground">
            Created {relativeTime(step.createdAt)}
            {step.sentAt && ` · sent ${relativeTime(step.sentAt)}`}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: lead, isLoading } = useLead(leadId)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            {lead ? (
              <>
                <Building2 className="size-5 text-primary" />
                {lead.companyName}
              </>
            ) : (
              'Lead detail'
            )}
          </SheetTitle>
          <SheetDescription>
            {lead ? `Lead detail · ${lead.region ?? '—'} · ${lead.industry ?? '—'}` : 'Loading…'}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !lead ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-6 ocean-scroll">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={lead.priority} />
                    <LeadStatusBadge status={lead.status} />
                    {lead.sourceStrategy && (
                      <Badge variant="outline" className="capitalize">
                        {lead.sourceStrategy.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {lead.website && (
                    <a
                      href={lead.website ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Globe className="size-3.5" />
                      {lead.domain ?? lead.website}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <ScoreRing value={lead.icpScore} size={72} label="ICP" />
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetaItem icon={Briefcase} label="Industry" value={lead.industry ?? '—'} />
                <MetaItem icon={MapPin} label="Location" value={lead.location ?? '—'} />
                <MetaItem icon={Users} label="Size" value={
                  lead.sizeMin && lead.sizeMax
                    ? `${lead.sizeMin}–${lead.sizeMax}`
                    : lead.sizeMin ?? lead.sizeMax ?? '—'
                } />
                <MetaItem icon={TrendingUp} label="Stage" value={lead.stage ?? '—'} />
              </div>

              {lead.notes && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                  <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}

              <Separator />

              {/* Signals */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sparkles className="size-4 text-primary" />
                  Signals ({lead.signals.length})
                </h3>
                {lead.signals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No signals captured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {lead.signals.map((sig) => (
                      <div key={sig.id} className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <SignalBadge type={sig.type} />
                          <span className="text-[11px] text-muted-foreground">
                            {relativeTime(sig.capturedAt)} · weight {sig.weight}
                          </span>
                        </div>
                        <div className="text-sm font-medium">{sig.title}</div>
                        {sig.description && (
                          <p className="text-xs text-muted-foreground">{sig.description}</p>
                        )}
                        {sig.source && (
                          <a
                            href={sig.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            {sig.source}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* Outreach */}
              <section>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Send className="size-4 text-primary" />
                    Outreach sequence
                  </h3>
                  <OutreachComposer leadId={lead.id} />
                </div>
                <OutreachTimeline leadId={lead.id} />
              </section>

              <Separator />

              <div className="flex gap-2 pb-4">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Edit lead
                </Button>
                <DeleteLeadDialog
                  leadId={lead.id}
                  onDeleted={() => onOpenChange(false)}
                />
              </div>
            </div>
          </ScrollArea>
        )}

        {lead && (
          <EditLeadDialog
            lead={lead}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  )
}

// Re-export for the lead row "open sheet" button placement
export function LeadRowOpenButton({
  leadId,
  className,
}: {
  leadId: string
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8', className)}
      aria-label="View lead"
    >
      Open
    </Button>
  )
}

// Helper to render a Card-shaped lead for mobile
export function LeadCardMobile({
  lead,
  onOpen,
}: {
  lead: LeadDTO
  onOpen: (id: string) => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(lead.id)
        }
      }}
      className="cursor-pointer hover:border-primary/40 transition-colors py-3"
    >
      <CardContent className="px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{lead.companyName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {lead.industry ?? '—'} · {lead.region ?? '—'} · {lead.stage ?? '—'}
            </div>
          </div>
          <PriorityBadge priority={lead.priority} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <LeadStatusBadge status={lead.status} />
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {lead.signals.length} signal{lead.signals.length === 1 ? '' : 's'}
            </div>
            <ScoreRing value={lead.icpScore} size={32} strokeWidth={3} showLabel />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
