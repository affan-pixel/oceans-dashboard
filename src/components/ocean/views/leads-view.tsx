'use client'

import { useState } from 'react'
import {
  Radar,
  Plus,
  Loader2,
  Sparkles,
  Users2,
  Link2,
  Handshake,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useLeads,
  useCreateLead,
} from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { IcpSummaryCard } from '../icp-summary-card'
import {
  LeadDetailSheet,
  LeadCardMobile,
} from '../lead-detail-sheet'
import {
  PriorityBadge,
  LeadStatusBadge,
} from '../ui/signal-badge'
import type { LeadDTO } from '@/lib/types'

const STRATEGIES = [
  {
    icon: Users2,
    title: 'Mirror clients',
    desc: 'Source companies similar to your existing placed clients — same stage, same stack, same pain.',
  },
  {
    icon: Sparkles,
    title: 'Signal-based prospecting',
    desc: 'Track funding rounds, job posts, headcount growth, tech stack changes — trigger outreach when intent spikes.',
  },
  {
    icon: Handshake,
    title: 'Warm intros',
    desc: 'Map second-degree connections between your network and target decision-makers.',
  },
  {
    icon: Activity,
    title: 'ICP tracking',
    desc: 'Score every lead against a strict ICP — size, stage, location, hiring pattern, budget, pain.',
  },
]

function StrategiesExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/40 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radar className="size-4 text-primary" />
                  Four prospecting strategies
                </CardTitle>
                <CardDescription className="mt-1">
                  How Agent 1 surfaces companies likely to hire.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="Toggle">
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {STRATEGIES.map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.title} className="rounded-lg border bg-card p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

const INDUSTRIES = ['SaaS', 'Fintech', 'Edtech', 'Ecommerce', 'Dev Tools', 'Healthtech', 'Climate', 'AI/ML']
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Bootstrapped', 'Public']
const REGIONS = ['USA', 'Europe', 'Australia']
const PRIORITIES = ['high', 'medium', 'low']
const SOURCES = ['mirror_clients', 'signal_based', 'warm_intro', 'icp_tracking']

function AddLeadDialog() {
  const create = useCreateLead()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    domain: '',
    website: '',
    industry: 'SaaS',
    stage: 'Series A',
    sizeMin: '',
    sizeMax: '',
    location: '',
    region: 'USA',
    priority: 'medium',
    sourceStrategy: 'icp_tracking',
    notes: '',
  })

  function reset() {
    setForm({
      companyName: '',
      domain: '',
      website: '',
      industry: 'SaaS',
      stage: 'Series A',
      sizeMin: '',
      sizeMax: '',
      location: '',
      region: 'USA',
      priority: 'medium',
      sourceStrategy: 'icp_tracking',
      notes: '',
    })
  }

  function submit() {
    if (!form.companyName.trim()) return
    create.mutate(
      {
        companyName: form.companyName,
        domain: form.domain || null,
        website: form.website || null,
        industry: form.industry,
        stage: form.stage,
        sizeMin: form.sizeMin ? Number(form.sizeMin) : null,
        sizeMax: form.sizeMax ? Number(form.sizeMax) : null,
        location: form.location || null,
        region: form.region,
        priority: form.priority,
        status: 'new',
        sourceStrategy: form.sourceStrategy,
        notes: form.notes || null,
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
        Add Lead
      </Button>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto ocean-scroll">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="al-name">Company name *</Label>
            <Input
              id="al-name"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-domain">Domain</Label>
            <Input
              id="al-domain"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder="acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-website">Website</Label>
            <Input
              id="al-website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-industry">Industry</Label>
            <Select
              value={form.industry}
              onValueChange={(v) => setForm({ ...form, industry: v })}
            >
              <SelectTrigger id="al-industry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-stage">Stage</Label>
            <Select
              value={form.stage}
              onValueChange={(v) => setForm({ ...form, stage: v })}
            >
              <SelectTrigger id="al-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-smin">Size min</Label>
            <Input
              id="al-smin"
              type="number"
              value={form.sizeMin}
              onChange={(e) => setForm({ ...form, sizeMin: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-smax">Size max</Label>
            <Input
              id="al-smax"
              type="number"
              value={form.sizeMax}
              onChange={(e) => setForm({ ...form, sizeMax: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-loc">Location</Label>
            <Input
              id="al-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="San Francisco"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-region">Region</Label>
            <Select
              value={form.region}
              onValueChange={(v) => setForm({ ...form, region: v })}
            >
              <SelectTrigger id="al-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-prio">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger id="al-prio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-source">Source strategy</Label>
            <Select
              value={form.sourceStrategy}
              onValueChange={(v) => setForm({ ...form, sourceStrategy: v })}
            >
              <SelectTrigger id="al-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="al-notes">Notes</Label>
            <Textarea
              id="al-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={create.isPending || !form.companyName.trim()}
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LeadsTable({
  leads,
  onOpen,
}: {
  leads: LeadDTO[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="w-32">ICP score</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Signals</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              onClick={() => onOpen(lead.id)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{lead.companyName}</TableCell>
              <TableCell className="text-muted-foreground">{lead.industry ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{lead.stage ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="outline">{lead.region ?? '—'}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.sizeMin && lead.sizeMax
                  ? `${lead.sizeMin}–${lead.sizeMax}`
                  : lead.sizeMin ?? lead.sizeMax ?? '—'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={lead.icpScore} className="w-16 h-2" />
                  <span className="text-xs tabular-nums">{lead.icpScore}</span>
                </div>
              </TableCell>
              <TableCell><PriorityBadge priority={lead.priority} /></TableCell>
              <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
              <TableCell className="text-right tabular-nums">{lead.signals.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LeadsMobileList({
  leads,
  onOpen,
}: {
  leads: LeadDTO[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="md:hidden space-y-2">
      {leads.map((lead) => (
        <LeadCardMobile key={lead.id} lead={lead} onOpen={onOpen} />
      ))}
    </div>
  )
}

function LeadsSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LeadsEmpty() {
  const setActiveView = useOceanStore((s) => s.setActiveView)
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Radar className="size-6 text-primary" />
        </div>
        <h3 className="text-sm font-medium">No leads yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add a lead manually or re-seed the database to start prospecting.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setActiveView('define')}
        >
          Configure your ICP first
        </Button>
      </CardContent>
    </Card>
  )
}

export function LeadsView() {
  const { data: leads, isLoading } = useLeads()
  const regionFilter = useOceanStore((s) => s.regionFilter)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = (leads ?? []).filter((l) => {
    if (regionFilter === 'all') return true
    return l.region === regionFilter
  })

  function openLead(id: string) {
    setSelectedLeadId(id)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <IcpSummaryCard />
      <StrategiesExplainer />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              Leads
              <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Click a row to see signals, ICP scoring, and the outreach sequence.
            </CardDescription>
          </div>
          <AddLeadDialog />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LeadsSkeleton />
          ) : filtered.length === 0 ? (
            <LeadsEmpty />
          ) : (
            <>
              <LeadsTable leads={filtered} onOpen={openLead} />
              <LeadsMobileList leads={filtered} onOpen={openLead} />
            </>
          )}
        </CardContent>
      </Card>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
