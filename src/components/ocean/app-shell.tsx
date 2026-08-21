'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar, MobileSidebar } from './sidebar'
import { Topbar } from './topbar'
import { DashboardView } from './views/dashboard-view'
import { PipelineView } from './views/pipeline-view'
import { JdsView } from './views/jds-view'
import { JobTargetsView } from './views/job-targets-view'
import { CandidatesView } from './views/candidates-view'
import { MatchesView } from './views/matches-view'
import { IntegrationsView } from './views/integrations-view'
import { useOceanStore, type ViewId } from './store'

const VIEWS: Record<ViewId, React.ComponentType> = {
  dashboard: DashboardView,
  pipeline: PipelineView,
  jds: JdsView,
  targets: JobTargetsView,
  candidates: CandidatesView,
  matches: MatchesView,
  integrations: IntegrationsView,
}

function ViewRouter() {
  const activeView = useOceanStore((s) => s.activeView)
  const View = VIEWS[activeView]
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <View />
      </motion.div>
    </AnimatePresence>
  )
}

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar (Sheet) */}
      <MobileSidebar open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen} />

      {/* Right side: topbar + main + footer */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Topbar onOpenSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 px-4 lg:px-6 py-6">
          <div className="mx-auto w-full max-w-7xl">
            <ViewRouter />
          </div>
        </main>

        <footer className="mt-auto border-t bg-background/95">
          <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs text-muted-foreground">
            <div>
              Oceans · AI-Trained Remote Talent from Sri Lanka · Matched in 24 hours, placed in 2 weeks
            </div>
            <div className="text-[11px]">
              Prepared by Affan · Buildin Blocks
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
