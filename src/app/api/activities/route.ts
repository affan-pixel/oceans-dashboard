import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toActivityDTO } from '@/lib/mappers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = searchParams.get('limit')
    const limit = limitRaw ? Math.max(1, Math.min(200, parseInt(limitRaw, 10) || 20)) : 20

    const activities = await db.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(activities.map(toActivityDTO))
  } catch (err) {
    console.error('[activities GET] error', err)
    return NextResponse.json({ error: 'Failed to load activities' }, { status: 500 })
  }
}
