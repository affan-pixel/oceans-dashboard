import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toExternalProspectDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

// PUT /api/external-prospects/[id]  body: { status: "reviewed"|"promoted"|"rejected" }
// "promoted" = move this prospect into the candidate pool (out of scope for now — just mark status)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const status = String(body.status ?? '').toLowerCase()
    const allowed = ['new', 'reviewed', 'promoted', 'rejected']
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${allowed.join(', ')}` },
        { status: 400 }
      )
    }

    const updated = await db.externalProspect.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(toExternalProspectDTO(updated))
  } catch (err) {
    console.error('[external-prospect PUT] error', err)
    return NextResponse.json({ error: 'Failed to update prospect' }, { status: 500 })
  }
}
