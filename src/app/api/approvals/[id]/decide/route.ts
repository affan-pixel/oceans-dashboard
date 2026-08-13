import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// POST /api/approvals/[id]/decide
// Decide any approval request (profile_review or leadership). Used by the in-app UI
// and by the Slack interactive callback.
// Body: { decision: 'approved'|'rejected', decidedBy?, note? }
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const decision = String(body.decision ?? '').toLowerCase()
    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 })
    }

    const approval = await db.approvalRequest.findUnique({ where: { id } })
    if (!approval) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

    const decidedBy = String(body.decidedBy ?? 'Oceans team').slice(0, 120)
    const note = body.note ? String(body.note).slice(0, 500) : null

    const updated = await db.approvalRequest.update({
      where: { id },
      data: { status: decision, decidedBy, decidedAt: new Date(), note },
    })

    // If this was a profile_review approval, stamp the match result fitStatus too.
    if (approval.matchResultId) {
      await db.matchResult.update({
        where: { id: approval.matchResultId },
        data: { fitStatus: decision },
      })
    }

    await db.activity.create({
      data: {
        agent: 'talent_matcher',
        type: `approval_${decision}`,
        message: `${approval.stage} ${decision} by ${decidedBy}.`,
      },
    })

    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch (err) {
    console.error('[approvals decide] error', err)
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 })
  }
}
