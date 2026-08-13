'use client'

import {
  Radar,
  Users,
  Sparkles,
  FileText,
  Crosshair,
  PenLine,
  BrainCircuit,
  TrendingUp,
  CheckCircle2,
  FileSearch,
  Layers,
  Wand2,
  ExternalLink,
  UserSearch,
  Link2,
  Search,
  UsersRound,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '../hooks/use-ocean-query'
import { useOceanStore } from '../store'
import { AgentBadge } from '../ui/signal-badge'
import { relativeTime } from '../hooks/utils'
import type { ScrapedJobDTO } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  new: 'oklch(0.42 0.09 244)',      // navy
  contacted: 'oklch(0.55 0.22 264)', // indigo
  replied: 'oklch(0.70 0.10 200)',   // sky
  qualified: 'oklch(0.68 0.18 42)', // orange
  won: 'oklch(0.60 0.13 160)',      // emerald (kept for "won")
  lost: 'oklch(0.65 0 0)',          // gray
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ElementType
  value: number
  label: string
  accent: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: accent }}
        aria-hidden
      />
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="text-2xl xl:text-3xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-lg"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function FlowStep({
  n,
  icon: Icon,
  color,
  title,
  body,
}: {
  n: number
  icon: React.ElementType
  color: string
  title: string
  body: string
}) {
  return (
    <div className="relative rounded-lg border p-4 space-y-2" style={{ background: `${color}0d` }}>
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg" style={{ background: color }} aria-hidden />
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: `${color}1f`, color }}
        >
          {n}
        </span>
        <Icon className="size-4" style={{ color }} aria-hidden />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

function AgentColumn({
  icon: Icon,
  name,
  color,
  description,
  steps,
}: {
  icon: React.ElementType
  name: string
  color: string
  description: string
  steps: string[]
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ background: `${color}0d` }}>
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center rounded-md"
          style={{ background: `${color}1f`, color }}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-[11px] text-muted-foreground">{description}</div>
        </div>
      </div>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span
              className="flex size-4 items-center justify-center rounded-full text-[10px] font-semibold mt-0.5"
              style={{ background: `${color}1f`, color }}
            >
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Latest scraped leads — surfaced on the dashboard so what the agent just scraped
// (posting link + decision maker + referrers) is visible immediately, not buried in Pipeline.
function LatestScrapedLeads({ jobs }: { jobs: ScrapedJobDTO[] }) {
  const setActiveView = useOceanStore((s) => s.setActiveView)

  if (!jobs || jobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="size-4 text-primary" />
          Latest scraped leads
          <Badge variant="secondary" className="ml-1">{jobs.length}</Badge>
        </CardTitle>
        <CardDescription>
          Newest jobs surfaced by the scraper — with the posting link, decision maker, and warm-intro referrers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {jobs.map((job) => {
            const hasDm = !!job.dmName
            const refCount = job.referrers?.length ?? 0
            return (
              <li key={job.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{job.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{job.sourcePlatform}</Badge>
                      {job.scrapeSource && (
                        <Badge variant="outline" className="text-[10px]">{job.scrapeSource}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {job.company} · {job.location || 'Remote'}
                      {job.salaryText ? ` · ${job.salaryText}` : ''}
                    </div>
                    {/* Decision maker */}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                      {hasDm ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <UserSearch className="size-3 text-primary" />
                          <span className="font-medium">{job.dmName}</span>
                          {job.dmTitle && <span className="text-muted-foreground">· {job.dmTitle}</span>}
                          {job.dmLinkedinUrl && (
                            <a
                              href={job.dmLinkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link2 className="size-3" />LinkedIn
                            </a>
                          )}
                          {job.dmIsSample && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">sample</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <UserSearch className="size-3" />Decision maker not found yet
                        </span>
                      )}
                    </div>
                    {/* Referrers */}
                    {refCount > 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UsersRound className="size-3 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">
                          {refCount} warm-intro path{refCount === 1 ? '' : 's'}
                        </span>
                        <span className="truncate">· {job.referrers.map((r) => r.name).join(', ')}</span>
                        {job.referrers.some((r) => r.isSample) && (
                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">sample</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {job.sourceUrl && (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />Job link
                      </a>
                    )}
                    <span className="text-[11px] text-muted-foreground">{relativeTime(job.createdAt)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={() => setActiveView('pipeline')}
          className="mt-3 text-xs text-primary hover:underline"
        >
          View all in Pipeline →
        </button>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const { data: stats, isLoading } = useDashboard()

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const regionData = stats.leadsByRegion.map((r) => ({
    name: r.region,
    count: r.count,
  }))
  const statusData = stats.leadsByStatus.map((s) => ({
    name: s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? 'oklch(0.65 0 0)',
  }))

  return (
    <div className="space-y-6">
      {/* Oceans signature hero banner */}
      <div className="ocean-gradient-hero relative overflow-hidden rounded-xl p-6 text-white">
        <div className="absolute inset-x-0 bottom-0 h-0.5 ocean-accent-line" aria-hidden />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/70">Oceans · Two-Agent Talent System</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight">
              AI-trained remote talent from Sri Lanka
            </h2>
            <p className="mt-1 text-sm text-white/80 max-w-xl">
              Matched in 24 hours. Placed in 2 weeks. 600+ companies scale with Oceans without compromise.
            </p>
          </div>
          <div className="flex gap-6 sm:gap-8">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{stats.totalLeads}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wider">Leads</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{stats.activeCandidates}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wider">Divers</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{stats.totalMatches}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wider">Matches</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Radar}
          value={stats.totalLeads}
          label="Total leads"
          accent="oklch(0.42 0.09 244)"
        />
        <StatCard
          icon={Users}
          value={stats.activeCandidates}
          label="Active Divers"
          accent="oklch(0.55 0.22 264)"
        />
        <StatCard
          icon={FileText}
          value={stats.activeJds}
          label="Active JDs (looking for)"
          accent="oklch(0.42 0.09 244)"
        />
        <StatCard
          icon={Crosshair}
          value={stats.totalJobTargets}
          label="Job targets"
          accent="oklch(0.68 0.18 42)"
        />
        <StatCard
          icon={Sparkles}
          value={stats.totalMatches}
          label="Total matches"
          accent="oklch(0.70 0.10 200)"
        />
        <StatCard
          icon={PenLine}
          value={stats.totalBriefs}
          label="Briefs"
          accent="oklch(0.80 0.05 110)"
        />
      </div>

      {/* Latest scraped leads — what the agents just found, with posting link + DM + referrers */}
      <LatestScrapedLeads jobs={stats.latestScrapedJobs} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Leads by region
            </CardTitle>
            <CardDescription>Distribution of prospect companies across target markets.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'oklch(0.42 0.09 244 / 0.08)' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid oklch(0.92 0 0)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.42 0.09 244)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Leads by status
            </CardTitle>
            <CardDescription>Where leads sit in the customer funnel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, textTransform: 'capitalize' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid oklch(0.92 0 0)',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Two agents · one system
          </CardTitle>
          <CardDescription>
            Oceans runs two AI agents that work in sequence: first source the company, then place the Diver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <AgentColumn
              icon={Radar}
              name="Agent 1 · Customer Finder"
              color="oklch(0.42 0.09 244)"
              description="Finds companies likely to hire remote talent from Sri Lanka."
              steps={[
                'Mirror existing clients to find lookalikes',
                'Track funding, hiring, and tech signals',
                'Score every lead against the ICP',
                'Draft warm outreach via the right channel',
              ]}
            />
            <AgentColumn
              icon={BrainCircuit}
              name="Agent 2 · Talent Matcher"
              color="oklch(0.55 0.22 264)"
              description="Parses JDs and ranks Divers by outcome fit — not keywords."
              steps={[
                'Parse JD into outcomes, skills, signals',
                'Match the internal pool (500 Divers) FIRST',
                'If internal is weak — scrape external prospects',
                'Surface ranked shortlist with reasoning',
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* The 3-step flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            The flow · find jobs → match internally → scrape externally
          </CardTitle>
          <CardDescription>
            Every role moves through the same three steps. Internal matching comes first —
            the 500-Diver pool covers most roles. External scraping is a supplement, not the default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <FlowStep
              n={1}
              icon={FileText}
              color="oklch(0.42 0.09 244)"
              title="Find jobs"
              body="The agent surfaces open roles (job-post signals on leads, Indeed/Wellfound feeds) and the sales team can also paste JDs directly. Every job is tagged with its source."
            />
            <FlowStep
              n={2}
              icon={Users}
              color="oklch(0.55 0.22 264)"
              title="Match internally first"
              body="The JD is parsed into outcomes, then ranked against the 500-Diver pool by semantic fit. Strength is scored strong / moderate / weak."
            />
            <FlowStep
              n={3}
              icon={Radar}
              color="oklch(0.68 0.18 42)"
              title="Scrape external (if weak)"
              body="Only when internal match is weak or moderate, the agent scrapes LinkedIn / Indeed / Wellfound for additional prospects to review and promote."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            Recent activity
          </CardTitle>
          <CardDescription>The latest from both agents.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <FileSearch className="mx-auto size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">No activity yet.</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto ocean-scroll pr-1">
              {stats.recentActivities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AgentBadge agent={a.agent} />
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{a.message}</p>
                  </div>
                  <CheckCircle2 className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
