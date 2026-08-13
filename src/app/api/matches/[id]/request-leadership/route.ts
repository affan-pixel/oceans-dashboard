import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

type Params = { params: Promise<{ id: string }> }

// POST /api/matches/[id]/request-leadership
// Step 8: request leadership sign-off. Creates a pending ApprovalRequest (stage: leadership).
// If Slack is connected, optionally posts a reminder; else just records the request.
// Body: { matchResultId?, note? }
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const matchResultId = body.matchResultId ? String(body.matchResultId) : null
    const note = body.note ? String(body.note).slice(0, 500) : null

    const match = await db.match.findUnique({
      where: { id },
      include: { jobDescription: { select: { title: true, company: true } } },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const approval = await db.approvalRequest.create({
      data: {
        matchId: id,
        matchResultId,
        candidateId: null,
        stage: 'leadership',
        channel: env.slackBotToken ? 'slack' : 'in_app',
        slackChannel: env.slackBotToken ? env.slackChannel : null,
        status: 'pending',
        note,
      },
    })

    await db.activity.create({
      data: {
        agent: 'talent_matcher',
        type: 'leadership_requested',
        message: `Leadership approval requested for ${match.jobDescription?.title ?? 'a role'} @ ${match.jobDescription?.company ?? ''}.`,
      },
    })

    return NextResponse.json({ ok: true, approvalId: approval.id, status: 'pending' })
  } catch (err) {
    console.error('[request-leadership] error', err)
    return NextResponse.json({ error: 'Failed to request leadership approval' }, { status: 500 })
  }
}
