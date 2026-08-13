import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toBriefDTO } from '@/lib/mappers'

export async function GET() {
  try {
    const briefs = await db.brief.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(briefs.map(toBriefDTO))
  } catch (err) {
    console.error('[briefs GET] error', err)
    return NextResponse.json({ error: 'Failed to load briefs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { title, content, type = 'note', linkedJdId } = body ?? {}

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      )
    }

    const created = await db.brief.create({
      data: {
        title: title.trim(),
        content,
        type: typeof type === 'string' && type ? type : 'note',
        linkedJdId:
          typeof linkedJdId === 'string' && linkedJdId ? linkedJdId : null,
      },
    })

    return NextResponse.json(toBriefDTO(created), { status: 201 })
  } catch (err) {
    console.error('[briefs POST] error', err)
    return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 })
  }
}
