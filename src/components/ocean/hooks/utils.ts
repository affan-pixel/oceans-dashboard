'use client'

import { formatDistanceToNow } from 'date-fns'

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return '—'
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const SAMPLE_JD = `GTM Engineer (Remote, US/EU timezones)

We're a Series A SaaS company (45 people, $8M ARR, profitable last quarter) building the leading revenue intelligence platform for B2B sales teams. We just closed our Series A and need to scale outbound from 1 channel to 5 in the next two quarters.

You will own our outbound engine end-to-end: build cold email sequences in Apollo + Lemlist, write copy that converts, set up Clay enrichment workflows, and build the dashboards in HubSpot that the founder checks every morning. We don't have a playbook yet — you'll write it. The first 90 days look like: ship 3 new outbound campaigns, double our meeting-booked rate, and hire 1 SDR under you.

You've built outbound from scratch before (not just managed it). You write your own copy. You're comfortable in Apollo, Lemlist, Clay, and HubSpot. SQL a plus. No agency experience required — in fact we prefer operators who've done it in-house.

This is a fully remote role, but you'll overlap 4 hours/day with US Eastern. Compensation: $70-90k + equity. We're open to hiring globally.`

export const SAMPLE_CV = `Name: Kasun Perera
Location: Colombo, Sri Lanka

I'm a GTM operator who's spent the last 4 years building outbound engines for B2B SaaS startups. Most recently at a Series B dev-tools company where I built the cold email program from 0 → 4,000 prospects/month in Lemlist, with Clay enrichment workflows that pulled ICP firmographics, tech stack, and hiring signals. My sequences booked 240+ meetings in 12 months.

Before that, at a seed-stage fintech, I wrote all outbound copy, managed Apollo sequences, set up HubSpot reporting dashboards the CEO lived in, and trained our first 2 SDRs. I basically wrote the outbound playbook there.

I write my own copy, I'm comfortable in Apollo / Lemlist / Clay / HubSpot, and I know enough SQL to pull my own lists. I haven't had the "GTM Engineer" title at any of my jobs — I was "SDR Lead" and "RevOps Analyst" — but I've done the work. I'm looking for a remote role with US/EU overlap. Comp expectation: $70-85k.`
