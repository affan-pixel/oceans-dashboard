import { NextResponse } from 'next/server'
import { runRecheck, logRecheck } from '@/lib/recheck'

// POST /api/pipeline/recheck — in-app "Recheck" button.
// Body: { limit?: number } (default 20, max 40)
// The scheduled equivalent is GET /api/cron/recheck (bearer-authenticated).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const summary = await runRecheck(body.limit)
    await logRecheck(summary, 'manual')
    return NextResponse.json(summary)
  } catch (err) {
    console.error('[batch recheck] error', err)
    return NextResponse.json({ error: 'Failed to batch recheck' }, { status: 500 })
  }
}
