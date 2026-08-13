import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toOutreachDTO } from '@/lib/mappers'
import { draftOutreachEmail } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
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

    const body = await request.json()
    const { channel, action, role } = body ?? {}

    if (!channel || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, action' },
        { status: 400 }
      )
    }

    // Compute next step number
    const currentCount = lead.outreachSteps.length
    const step = currentCount + 1

    let content: string | null = body.content ?? null

    // If email channel and no content provided, draft via AI
    if (channel === 'email' && !content) {
      const latestSignal = lead.signals[0]
      const signalTitle = latestSignal?.title ?? 'ICP match'
      const roleForEmail = role ?? action ?? 'open role'
      try {
        content = await draftOutreachEmail({
          companyName: lead.companyName,
          industry: lead.industry,
          stage: lead.stage,
          signal: signalTitle,
          role: roleForEmail,
        })
      } catch (draftErr) {
        console.error('[outreach POST] draftOutreachEmail failed', draftErr)
        content = null
      }
    }

    const created = await db.outreachStep.create({
      data: {
        leadId: lead.id,
        step,
        channel,
        action,
        content,
        status: 'pending',
      },
    })

    // Activity log
    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'outreach_sent',
        message: `Outreach step ${step} drafted for ${lead.companyName}.`,
      },
    })

    return NextResponse.json(toOutreachDTO(created), { status: 201 })
  } catch (err) {
    console.error('[outreach POST] error', err)
    return NextResponse.json({ error: 'Failed to create outreach step' }, { status: 500 })
  }
}
