import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { runRecheck, logRecheck, RECHECK_MAX_BATCH } from '@/lib/recheck'

// GET /api/cron/recheck?limit=40 — scheduled Agent 1 persistence check.
//
// Without this running on a schedule, firstSeenAt and lastSeenAt never diverge,
// ageBand stays "fresh" forever, and the entire "this role has been open 3
// months" signal is dead weight. This endpoint is the thing that makes it real.
//
// Auth: requires `Authorization: Bearer $CRON_SECRET`. The endpoint fans out
// paid/rate-limited outbound fetches, so it must not be open to the internet.
// If CRON_SECRET is unset the route refuses to run rather than defaulting open.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function handle(request: Request) {
  const secret = env.cronSecret
  if (!secret) {
    console.error('[cron recheck] CRON_SECRET is not set — refusing to run')
    return NextResponse.json(
      { error: 'Cron is not configured. Set CRON_SECRET.' },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const limit = new URL(request.url).searchParams.get('limit') ?? RECHECK_MAX_BATCH
    const summary = await runRecheck(limit)
    await logRecheck(summary, 'cron')
    console.log('[cron recheck]', JSON.stringify(summary))
    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[cron recheck] error', err)
    return NextResponse.json({ error: 'Recheck failed' }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
