'use client'

import { cn } from '@/lib/utils'

export type SignalType =
  | 'funding'
  | 'job_post'
  | 'headcount_growth'
  | 'tech_stack'
  | 'no_local_hire'
  | 'warm_intro'
  | string

const SIGNAL_STYLES: Record<string, { label: string; className: string }> = {
  funding: {
    label: 'Funding',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  job_post: {
    label: 'Job post',
    className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  },
  headcount_growth: {
    label: 'Headcount growth',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  },
  tech_stack: {
    label: 'Tech stack',
    className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  },
  no_local_hire: {
    label: 'No local hire',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  },
  warm_intro: {
    label: 'Warm intro',
    className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  },
}

export function SignalBadge({
  type,
  className,
}: {
  type: SignalType
  className?: string
}) {
  const style = SIGNAL_STYLES[type] ?? {
    label: type.replace(/_/g, ' '),
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        style.className,
        className
      )}
    >
      {style.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    low: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        map[priority] ?? map.low
      )}
    >
      {priority}
    </span>
  )
}

export function LeadStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    contacted: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    replied: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    qualified: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
    won: 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-500/40',
    lost: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        map[status] ?? map.new
      )}
    >
      {status}
    </span>
  )
}

export function OutreachStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    sent: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    replied: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    bounced: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        map[status] ?? map.pending
      )}
    >
      {status}
    </span>
  )
}

export function CandidateStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    placed: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    paused: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        map[status] ?? map.active
      )}
    >
      {status}
    </span>
  )
}

export function AgentBadge({ agent }: { agent: string }) {
  const map: Record<string, { label: string; className: string }> = {
    customer_finder: {
      label: 'Customer Finder',
      className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    },
    talent_matcher: {
      label: 'Talent Matcher',
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    },
    system: {
      label: 'System',
      className: 'bg-muted text-muted-foreground border-border',
    },
  }
  const style = map[agent] ?? map.system
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        style.className
      )}
    >
      {style.label}
    </span>
  )
}
