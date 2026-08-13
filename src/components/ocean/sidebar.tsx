'use client'

import {
  LayoutDashboard,
  Radar,
  FileText,
  Crosshair,
  Users,
  Sparkles,
  Settings,
  Waves,
  X,
  Filter,
  Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useOceanStore, type ViewId } from './store'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ElementType
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'targets', label: 'ICPs', icon: Crosshair },
  { id: 'pipeline', label: 'Pipeline', icon: Filter },
  { id: 'jds', label: 'Job Descriptions', icon: FileText },
  { id: 'candidates', label: 'Divers', icon: Users },
  { id: 'matches', label: 'Matches', icon: Sparkles },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'define', label: 'Define', icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="ocean-gradient flex size-9 items-center justify-center rounded-lg shadow-sm">
        <Waves className="size-5 text-white" aria-hidden />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">Oceans</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/70">
          AI-Trained Talent
        </span>
      </div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const activeView = useOceanStore((s) => s.activeView)
  const setActiveView = useOceanStore((s) => s.setActiveView)

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveView(item.id)
              onNavigate?.()
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function AgentFooter() {
  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground">
        <Sparkles className="size-3" aria-hidden />
        Two Agents · One System
      </div>
      <div className="mt-2 h-0.5 w-full rounded-full ocean-accent-line" aria-hidden />
      <p className="mt-2 text-xs text-sidebar-foreground/70">
        Customer Finder sources the company. Talent Matcher places the Diver.
        Matched in 24 hours, placed in 2 weeks.
      </p>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col lg:border-r bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>
      {/* Signature Oceans color line under the logo */}
      <div className="h-0.5 w-full ocean-accent-line" aria-hidden />
      <div className="flex-1 overflow-y-auto px-3 py-4 ocean-scroll">
        <NavList />
      </div>
      <div className="px-3 pb-4">
        <AgentFooter />
      </div>
    </aside>
  )
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Primary navigation for Oceans
        </SheetDescription>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="h-0.5 w-full ocean-accent-line" aria-hidden />
        <div className="flex-1 overflow-y-auto px-3 py-4 ocean-scroll">
          <NavList onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="px-3 pb-4">
          <AgentFooter />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function MobileSidebarTrigger({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="lg:hidden"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </Button>
  )
}
