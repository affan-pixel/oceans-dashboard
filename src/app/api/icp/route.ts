import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toIcpDTO } from '@/lib/mappers'

const DEFAULT_ICP = {
  id: 'singleton',
  sizeMin: 15,
  sizeMax: 200,
  stages: JSON.stringify(['Series A', 'Series B', 'Series C', 'Bootstrapped']),
  locations: JSON.stringify([
    'San Francisco',
    'New York',
    'Austin',
    'London',
    'Berlin',
    'Amsterdam',
    'Sydney',
    'Melbourne',
  ]),
  industries: JSON.stringify(['SaaS', 'Fintech', 'Edtech', 'Ecommerce', 'Dev Tools']),
  hiringPattern: 'remote-first or remote-open',
  budgetMinUsd: 80000,
  pain: 'Cannot fill technical or GTM roles locally at the price they want',
}

export async function GET() {
  try {
    let icp = await db.icpConfig.findUnique({ where: { id: 'singleton' } })
    if (!icp) {
      icp = await db.icpConfig.create({ data: DEFAULT_ICP })
    }
    return NextResponse.json(toIcpDTO(icp))
  } catch (err) {
    console.error('[icp GET] error', err)
    return NextResponse.json({ error: 'Failed to load ICP config' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    let icp = await db.icpConfig.findUnique({ where: { id: 'singleton' } })
    if (!icp) {
      icp = await db.icpConfig.create({ data: DEFAULT_ICP })
    }

    const body = await request.json()
    const {
      sizeMin,
      sizeMax,
      stages,
      locations,
      industries,
      hiringPattern,
      budgetMinUsd,
      pain,
    } = body ?? {}

    const update: Record<string, unknown> = {}
    if (typeof sizeMin === 'number') update.sizeMin = sizeMin
    if (typeof sizeMax === 'number') update.sizeMax = sizeMax
    if (Array.isArray(stages)) update.stages = JSON.stringify(stages)
    if (Array.isArray(locations)) update.locations = JSON.stringify(locations)
    if (Array.isArray(industries)) update.industries = JSON.stringify(industries)
    if (typeof hiringPattern === 'string') update.hiringPattern = hiringPattern
    if (typeof budgetMinUsd === 'number') update.budgetMinUsd = budgetMinUsd
    if (typeof pain === 'string') update.pain = pain

    const updated = await db.icpConfig.update({ where: { id: 'singleton' }, data: update })
    return NextResponse.json(toIcpDTO(updated))
  } catch (err) {
    console.error('[icp PUT] error', err)
    return NextResponse.json({ error: 'Failed to update ICP config' }, { status: 500 })
  }
}
