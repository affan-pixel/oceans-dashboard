import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJdDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const jd = await db.jobDescription.findUnique({ where: { id } })
    if (!jd) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(toJdDTO(jd))
  } catch (err) {
    console.error('[jd GET] error', err)
    return NextResponse.json({ error: 'Failed to load job description' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.jobDescription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      title,
      company,
      isActive,
      priority,
      notes,
      targetId,
      source,
    } = body ?? {}

    // Build a partial update — only fields actually provided.
    // Per task spec: do NOT re-run parseJD on PUT.
    const data: Record<string, unknown> = {}
    if (typeof title === 'string') data.title = title
    if (company === null || typeof company === 'string') data.company = company
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof priority === 'string' && priority) data.priority = priority
    if (notes === null || typeof notes === 'string') data.notes = notes
    if (targetId === null || (typeof targetId === 'string' && targetId)) {
      data.targetId = targetId
    }
    if (typeof source === 'string') {
      const allowedSources = ['agent', 'sales_team', 'client']
      data.source = allowedSources.includes(source) ? source : 'sales_team'
    }

    const updated = await db.jobDescription.update({
      where: { id },
      data,
    })

    return NextResponse.json(toJdDTO(updated))
  } catch (err) {
    console.error('[jd PUT] error', err)
    return NextResponse.json({ error: 'Failed to update job description' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.jobDescription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Matches cascade via onDelete: Cascade in schema
    await db.jobDescription.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[jd DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete job description' }, { status: 500 })
  }
}
