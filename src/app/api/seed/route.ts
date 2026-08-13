import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { seedData } from '@/lib/seed-data'

// POST /api/seed — reset the database to demo data.
//
// SECURITY:
// - In production this endpoint MUST be protected (auth + admin role).
// - We run the seed logic in-process (no shell exec) to avoid command-injection risk.
// - We do not return internal error details to the client.
const ALLOW_SEED =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_SEED_ENDPOINT === 'true'

export async function POST() {
  if (!ALLOW_SEED) {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production.' },
      { status: 403 }
    )
  }
  try {
    await seedData(db)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[seed POST] error', err)
    return NextResponse.json({ error: 'Failed to re-seed database' }, { status: 500 })
  }
}
