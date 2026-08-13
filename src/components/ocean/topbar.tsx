'use client'

import { useState } from 'react'
import { RefreshCw, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { useOceanStore, VIEW_TITLES, type RegionFilter } from './store'
import { useSeed } from './hooks/use-ocean-query'

const REGIONS: { id: RegionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'USA', label: 'USA' },
  { id: 'Europe', label: 'Europe' },
  { id: 'Australia', label: 'Australia' },
]

function Hamburger({ onClick }: { onClick: () => void }) {
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

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const activeView = useOceanStore((s) => s.activeView)
  const regionFilter = useOceanStore((s) => s.regionFilter)
  const setRegionFilter = useOceanStore((s) => s.setRegionFilter)
  const seed = useSeed()
  const [seedOpen, setSeedOpen] = useState(false)
  const meta = VIEW_TITLES[activeView]
  const showRegionFilter = false

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Hamburger onClick={onOpenSidebar} />

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">{meta.title}</h1>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{meta.subtitle}</p>
        </div>

        {showRegionFilter && (
          <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Globe className="size-3.5 text-muted-foreground ml-2" aria-hidden />
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegionFilter(r.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  regionFilter === r.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={regionFilter === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Mobile region filter as a row below */}
        {showRegionFilter && (
          <div className="sm:hidden flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegionFilter(r.id)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  regionFilter === r.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
                aria-pressed={regionFilter === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <AlertDialog open={seedOpen} onOpenChange={setSeedOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={seed.isPending}>
              {seed.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              <span className="hidden sm:inline">Re-seed</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-seed the database?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all leads, candidates, JDs, targets, briefs, and matches back to
                the original demo dataset. Any data you added will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  seed.mutate(undefined, { onSettled: () => setSeedOpen(false) })
                }}
              >
                {seed.isPending ? 'Seeding…' : 'Re-seed data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}
