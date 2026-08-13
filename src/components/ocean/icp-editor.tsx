'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save } from 'lucide-react'
import type { IcpConfigDTO } from '@/lib/types'
import { useUpdateIcp } from './hooks/use-ocean-query'

function parseList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export function IcpEditor({
  icp,
  onSaved,
}: {
  icp: IcpConfigDTO
  onSaved?: () => void
}) {
  const updateIcp = useUpdateIcp()
  const [sizeMin, setSizeMin] = useState(icp.sizeMin.toString())
  const [sizeMax, setSizeMax] = useState(icp.sizeMax.toString())
  const [stages, setStages] = useState(icp.stages.join(', '))
  const [locations, setLocations] = useState(icp.locations.join(', '))
  const [industries, setIndustries] = useState(icp.industries.join(', '))
  const [hiringPattern, setHiringPattern] = useState(icp.hiringPattern)
  const [budgetMin, setBudgetMin] = useState(icp.budgetMinUsd.toString())
  const [pain, setPain] = useState(icp.pain)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateIcp.mutate(
      {
        sizeMin: Number(sizeMin) || 0,
        sizeMax: Number(sizeMax) || 0,
        stages: parseList(stages),
        locations: parseList(locations),
        industries: parseList(industries),
        hiringPattern,
        budgetMinUsd: Number(budgetMin) || 0,
        pain,
      },
      { onSettled: () => onSaved?.() }
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="icp-size-min">Size min (people)</Label>
          <Input
            id="icp-size-min"
            type="number"
            value={sizeMin}
            onChange={(e) => setSizeMin(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="icp-size-max">Size max (people)</Label>
          <Input
            id="icp-size-max"
            type="number"
            value={sizeMax}
            onChange={(e) => setSizeMax(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="icp-stages">Stages (comma-separated)</Label>
        <Input
          id="icp-stages"
          value={stages}
          onChange={(e) => setStages(e.target.value)}
          placeholder="Series A, Series B, Bootstrapped"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="icp-locations">Locations (comma-separated)</Label>
        <Input
          id="icp-locations"
          value={locations}
          onChange={(e) => setLocations(e.target.value)}
          placeholder="San Francisco, London, Sydney"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="icp-industries">Industries (comma-separated)</Label>
        <Input
          id="icp-industries"
          value={industries}
          onChange={(e) => setIndustries(e.target.value)}
          placeholder="SaaS, Fintech, Dev Tools"
        />
      </div>

      <Separator />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="icp-budget">Budget min (USD)</Label>
          <Input
            id="icp-budget"
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="icp-hiring">Hiring pattern</Label>
          <Input
            id="icp-hiring"
            value={hiringPattern}
            onChange={(e) => setHiringPattern(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="icp-pain">Pain we solve</Label>
        <Textarea
          id="icp-pain"
          value={pain}
          onChange={(e) => setPain(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={updateIcp.isPending}>
          {updateIcp.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save ICP
        </Button>
      </div>
    </form>
  )
}
