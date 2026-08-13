'use client'

import { useState } from 'react'
import {
  Settings,
  Database,
  Info,
  RefreshCw,
  Loader2,
  Radar,
  BrainCircuit,
  Layers,
  Rocket,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { useIcp, useSeed } from '../hooks/use-ocean-query'
import { IcpEditor } from '../icp-editor'

const TOOL_STACK = [
  { name: 'Clay', purpose: 'Lead enrichment & signal workflows' },
  { name: 'Apollo', purpose: 'Outbound sequences & contact data' },
  { name: 'Lemlist', purpose: 'Cold email deliverability & copy' },
  { name: 'HubSpot', purpose: 'CRM, pipeline, dashboards' },
  { name: 'Claude API', purpose: 'JD parsing, candidate structuring, semantic match' },
  { name: 'pgvector', purpose: 'Embedding storage for outcome-based matching' },
]

const PHASES = [
  {
    name: 'Phase 1 — Foundation',
    desc: 'Candidate database, JD parser, outcome-based structuring, ICP definition.',
  },
  {
    name: 'Phase 2 — Customer Finder',
    desc: 'Signal capture (funding, hiring, tech), ICP scoring, warm-intro mapping.',
  },
  {
    name: 'Phase 3 — Talent Matcher',
    desc: 'Semantic matching via embeddings, ranked shortlists, reasoning & gaps.',
  },
  {
    name: 'Phase 4 — Outreach & Ops',
    desc: 'AI-drafted outreach, sequence tracking, dashboards, weekly reporting.',
  },
]

function IcpSection() {
  const { data: icp, isLoading } = useIcp()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="size-4 text-primary" />
          Ideal Customer Profile
        </CardTitle>
        <CardDescription>
          Agent 1 scores every lead against this profile. Edit it any time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !icp ? (
          <Skeleton className="h-64" />
        ) : (
          <IcpEditor icp={icp} />
        )}
      </CardContent>
    </Card>
  )
}

function DataSection() {
  const seed = useSeed()
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          Data
        </CardTitle>
        <CardDescription>
          Reset the demo data back to its original state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={seed.isPending}>
              {seed.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Re-seed database
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-seed the database?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all leads, candidates, JDs, and matches back to the original
                demo dataset. Any data you added will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => seed.mutate(undefined, { onSettled: () => setOpen(false) })}
              >
                {seed.isPending ? 'Seeding…' : 'Re-seed data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs text-muted-foreground mt-2">
          You can also re-seed from the top bar at any time.
        </p>
      </CardContent>
    </Card>
  )
}

function AboutSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          About Ocean Talent
        </CardTitle>
        <CardDescription>
          Two AI agents, one system — placing Sri Lankan talent with companies in USA, Europe & Australia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Radar className="size-4" />
              </div>
              <span className="text-sm font-medium">Agent 1 — Customer Finder</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sources companies likely to hire remote talent from Sri Lanka. Mirrors existing
              clients, tracks funding & hiring signals, scores against the ICP, and drafts warm
              outreach.
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BrainCircuit className="size-4" />
              </div>
              <span className="text-sm font-medium">Agent 2 — Talent Matcher</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Parses JDs into outcomes, skills, context, and hidden signals, then ranks active
              candidates by outcome fit using embeddings. Surfaces strengths, gaps, and reasoning.
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Layers className="size-4 text-primary" />
            Tool stack
          </h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {TOOL_STACK.map((t) => (
              <div key={t.name} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.purpose}</div>
                </div>
                <Badge variant="outline">{t.name.split(' ')[0]}</Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Rocket className="size-4 text-primary" />
            Four-phase build plan
          </h4>
          <ol className="space-y-2">
            {PHASES.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

export function SettingsView() {
  return (
    <div className="space-y-4">
      <IcpSection />
      <DataSection />
      <AboutSection />
    </div>
  )
}
