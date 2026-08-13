'use client'

import { create } from 'zustand'

export type ViewId =
  | 'dashboard'
  | 'pipeline'
  | 'jds'
  | 'targets'
  | 'candidates'
  | 'matches'
  | 'define'

export type RegionFilter = 'all' | 'USA' | 'Europe' | 'Australia'

interface OceanState {
  activeView: ViewId
  regionFilter: RegionFilter
  selectedJdId?: string | null
  selectedMatchJdId?: string | null
  setActiveView: (v: ViewId) => void
  setRegionFilter: (r: RegionFilter) => void
  setSelectedJdId: (id: string | null) => void
  setSelectedMatchJdId: (id: string | null) => void
}

export const useOceanStore = create<OceanState>((set) => ({
  activeView: 'dashboard',
  regionFilter: 'all',
  selectedJdId: null,
  selectedMatchJdId: null,
  setActiveView: (v) => set({ activeView: v }),
  setRegionFilter: (r) => set({ regionFilter: r }),
  setSelectedJdId: (id) => set({ selectedJdId: id }),
  setSelectedMatchJdId: (id) => set({ selectedMatchJdId: id }),
}))

export const VIEW_TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of your two-agent talent system — sourcing and placing Divers.',
  },
  pipeline: {
    title: 'Pipeline',
    subtitle: 'Scraped jobs → find decision maker → outreach → get JD → match candidates.',
  },
  jds: {
    title: 'Job Descriptions',
    subtitle: 'JDs received from clients or converted from pipeline outreach.',
  },
  targets: {
    title: 'ICPs',
    subtitle: 'Define each role ICP — EA, Marketing, Finance, Ops, CS, GTM — and scrape jobs per ICP.',
  },
  candidates: {
    title: 'Divers',
    subtitle: 'Vetted, AI-fluent talent from Sri Lanka — the foundation the matcher runs on.',
  },
  matches: {
    title: 'Matches',
    subtitle: 'All past ranked shortlists produced by the Talent Matcher.',
  },
  define: {
    title: 'Define',
    subtitle: 'Configure the rules both agents follow.',
  },
}
