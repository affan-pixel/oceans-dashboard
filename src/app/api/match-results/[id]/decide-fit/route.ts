import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// POST /api/match-results/[id]/decide-fit
// Step 5: Oceans team profile-fit check. Body: { decision: 'approved'|'rejected', decidedBy?, note? }
// Creates an ApprovalRequest (stage: profile_review) and stamps fitStatus on the match result.
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const decision = String(body.decision ?? '').toLowerCase()
    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 })
    }

    const result = await db.matchResult.findUnique({
      where: { id },
      include: { match: true },
    })
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const decidedBy = String(body.decidedBy ?? 'Oceans team').slice(0, 120)
    const note = body.note ? String(body.note).slice(0, 500) : null

    const [updated] = await db.$transaction([
      db.matchResult.update({
        where: { id },
        data: { fitStatus: decision },
      }),
      db.approvalRequest.create({
        data: {
          matchId: result.matchId,
          matchResultId: result.id,
          candidateId: result.candidateId,
          stage: 'profile_review',
          channel: 'in_app',
          status: decision,
          decidedBy,
          decidedAt: new Date(),
          note,
        },
      }),
      db.activity.create({
        data: {
          agent: 'talent_matcher',
          type: 'profile_fit_' + decision,
          message: `Profile-fit ${decision} by ${decidedBy}${note ? ` — ${note}` : ''}.`,
        },
      }),
    ])

    return NextResponse.json({ id: updated.id, fitStatus: updated.fitStatus })
  } catch (err) {
    console.error('[decide-fit] error', err)
    return NextResponse.json({ error: 'Failed to record fit decision' }, { status: 500 })
  }
}
