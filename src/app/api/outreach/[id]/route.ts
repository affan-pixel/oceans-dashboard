import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toOutreachDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.outreachStep.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, sentAt } = body ?? {}

    if (typeof status !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = { status }
    if (sentAt !== undefined) {
      update.sentAt = sentAt ? new Date(sentAt) : null
    }

    const updated = await db.outreachStep.update({ where: { id }, data: update })
    return NextResponse.json(toOutreachDTO(updated))
  } catch (err) {
    console.error('[outreach PUT] error', err)
    return NextResponse.json({ error: 'Failed to update outreach step' }, { status: 500 })
  }
}
