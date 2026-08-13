import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toBriefDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const brief = await db.brief.findUnique({ where: { id } })
    if (!brief) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(toBriefDTO(brief))
  } catch (err) {
    console.error('[brief GET] error', err)
    return NextResponse.json({ error: 'Failed to load brief' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.brief.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, content, type, linkedJdId } = body ?? {}

    const data: Record<string, unknown> = {}
    if (typeof title === 'string') data.title = title
    if (typeof content === 'string') data.content = content
    if (typeof type === 'string' && type) data.type = type
    if (linkedJdId === null || (typeof linkedJdId === 'string' && linkedJdId)) {
      data.linkedJdId = linkedJdId
    }

    const updated = await db.brief.update({ where: { id }, data })
    return NextResponse.json(toBriefDTO(updated))
  } catch (err) {
    console.error('[brief PUT] error', err)
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.brief.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.brief.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[brief DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete brief' }, { status: 500 })
  }
}
