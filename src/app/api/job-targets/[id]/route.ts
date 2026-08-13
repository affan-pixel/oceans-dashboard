import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJobTargetDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

// Normalise an array-ish value from the client into a clean string[].
function toArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter((x) => x.length > 0)
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((x) => x.length > 0)
  }
  return []
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const target = await db.jobTarget.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(toJobTargetDTO(target))
  } catch (err) {
    console.error('[job-target GET] error', err)
    return NextResponse.json({ error: 'Failed to load job target' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.jobTarget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      name,
      description,
      roleTypes,
      stages,
      industries,
      regions,
      salaryMinUsd,
      remoteOnly,
      signals,
      keywords,
    } = body ?? {}

    const data: Record<string, unknown> = {}
    if (typeof name === 'string') data.name = name
    if (description === null || typeof description === 'string') data.description = description
    if (roleTypes !== undefined) data.roleTypes = JSON.stringify(toArray(roleTypes))
    if (stages !== undefined) data.stages = JSON.stringify(toArray(stages))
    if (industries !== undefined) data.industries = JSON.stringify(toArray(industries))
    if (regions !== undefined) data.regions = JSON.stringify(toArray(regions))
    if (salaryMinUsd === null) {
      data.salaryMinUsd = null
    } else if (typeof salaryMinUsd === 'number' && Number.isFinite(salaryMinUsd)) {
      data.salaryMinUsd = salaryMinUsd
    }
    if (typeof remoteOnly === 'boolean') data.remoteOnly = remoteOnly
    if (signals !== undefined) data.signals = JSON.stringify(toArray(signals))
    if (keywords !== undefined) data.keywords = JSON.stringify(toArray(keywords))

    const updated = await db.jobTarget.update({ where: { id }, data })
    return NextResponse.json(toJobTargetDTO(updated))
  } catch (err) {
    console.error('[job-target PUT] error', err)
    return NextResponse.json({ error: 'Failed to update job target' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.jobTarget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.jobTarget.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[job-target DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete job target' }, { status: 500 })
  }
}
