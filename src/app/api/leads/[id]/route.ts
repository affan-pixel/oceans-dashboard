import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toLeadDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        signals: { orderBy: { capturedAt: 'desc' } },
        outreachSteps: { orderBy: { step: 'asc' } },
      },
    })
    if (!lead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(toLeadDTO(lead))
  } catch (err) {
    console.error('[lead GET] error', err)
    return NextResponse.json({ error: 'Failed to load lead' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      companyName,
      domain,
      website,
      industry,
      stage,
      sizeMin,
      sizeMax,
      location,
      region,
      icpScore,
      priority,
      status,
      sourceStrategy,
      mirroredFromClientId,
      notes,
    } = body ?? {}

    const update: Record<string, unknown> = {}
    if (typeof companyName === 'string') update.companyName = companyName
    if (domain !== undefined) update.domain = domain
    if (website !== undefined) update.website = website
    if (industry !== undefined) update.industry = industry
    if (stage !== undefined) update.stage = stage
    if (sizeMin !== undefined) update.sizeMin = sizeMin
    if (sizeMax !== undefined) update.sizeMax = sizeMax
    if (location !== undefined) update.location = location
    if (region !== undefined) update.region = region
    if (typeof icpScore === 'number') update.icpScore = icpScore
    if (typeof priority === 'string') update.priority = priority
    if (typeof status === 'string') update.status = status
    if (sourceStrategy !== undefined) update.sourceStrategy = sourceStrategy
    if (mirroredFromClientId !== undefined) update.mirroredFromClientId = mirroredFromClientId
    if (notes !== undefined) update.notes = notes

    const updated = await db.lead.update({
      where: { id },
      data: update,
      include: {
        signals: { orderBy: { capturedAt: 'desc' } },
        outreachSteps: { orderBy: { step: 'asc' } },
      },
    })

    return NextResponse.json(toLeadDTO(updated))
  } catch (err) {
    console.error('[lead PUT] error', err)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Signals + outreach steps cascade via onDelete: Cascade in schema
    await db.lead.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[lead DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
