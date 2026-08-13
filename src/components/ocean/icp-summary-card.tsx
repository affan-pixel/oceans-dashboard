'use client'

import { Building2, MapPin, Briefcase, TrendingUp, DollarSign, AlertCircle, Settings2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOceanStore } from './store'
import { useIcp } from './hooks/use-ocean-query'
import type { IcpConfigDTO } from '@/lib/types'

export function IcpSummaryCard() {
  const { data: icp, isLoading } = useIcp()
  const setActiveView = useOceanStore((s) => s.setActiveView)

  if (isLoading || !icp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            Ideal Customer Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            Ideal Customer Profile
          </CardTitle>
          <CardDescription className="mt-1">
            The ICP Agent 1 scores every lead against. Edit it in Define.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveView('define')}
        >
          <Settings2 className="size-4" />
          Edit ICP
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <IcpAttributes icp={icp} />
      </CardContent>
    </Card>
  )
}

export function IcpAttributes({ icp }: { icp: IcpConfigDTO }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Building2 className="size-3" /> Company size
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{icp.sizeMin}–{icp.sizeMax} people</Badge>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="size-3" /> Stages
        </div>
        <div className="flex flex-wrap gap-1.5">
          {icp.stages.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {icp.stages.map((s) => (
            <Badge key={s} variant="secondary">{s}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3" /> Locations
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto ocean-scroll">
          {icp.locations.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {icp.locations.map((l) => (
            <Badge key={l} variant="outline">{l}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Briefcase className="size-3" /> Industries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {icp.industries.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {icp.industries.map((i) => (
            <Badge key={i} variant="outline">{i}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <DollarSign className="size-3" /> Budget min (USD)
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">${icp.budgetMinUsd.toLocaleString()}</Badge>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="size-3" /> Hiring pattern
        </div>
        <p className="text-sm">{icp.hiringPattern}</p>
      </div>

      <div className="space-y-1 sm:col-span-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <AlertCircle className="size-3" /> Pain we solve
        </div>
        <p className="text-sm">{icp.pain}</p>
      </div>
    </div>
  )
}
