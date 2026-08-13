import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toLeadDTO } from '@/lib/mappers'

export async function GET() {
  try {
    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        signals: { orderBy: { capturedAt: 'desc' } },
        outreachSteps: { orderBy: { step: 'asc' } },
      },
    })
    return NextResponse.json(leads.map(toLeadDTO))
  } catch (err) {
    console.error('[leads GET] error', err)
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      companyName,
      domain = null,
      website = null,
      industry = null,
      stage = null,
      sizeMin = null,
      sizeMax = null,
      location = null,
      region = null,
      icpScore = 0,
      priority = 'medium',
      status = 'new',
      sourceStrategy = null,
      notes = null,
    } = body ?? {}

    if (!companyName) {
      return NextResponse.json(
        { error: 'Missing required field: companyName' },
        { status: 400 }
      )
    }

    const created = await db.lead.create({
      data: {
        companyName,
        domain: domain ?? null,
        website: website ?? null,
        industry: industry ?? null,
        stage: stage ?? null,
        sizeMin: sizeMin ?? null,
        sizeMax: sizeMax ?? null,
        location: location ?? null,
        region: region ?? null,
        icpScore: typeof icpScore === 'number' ? icpScore : 0,
        priority: priority ?? 'medium',
        status: status ?? 'new',
        sourceStrategy: sourceStrategy ?? null,
        notes: notes ?? null,
      },
      include: {
        signals: { orderBy: { capturedAt: 'desc' } },
        outreachSteps: { orderBy: { step: 'asc' } },
      },
    })

    // Activity log
    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'lead_created',
        message: `New lead added: ${companyName}.`,
      },
    })

    return NextResponse.json(toLeadDTO(created), { status: 201 })
  } catch (err) {
    console.error('[leads POST] error', err)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
