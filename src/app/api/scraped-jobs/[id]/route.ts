import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/scraped-jobs/[id] — dismiss a scraped job
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.scrapedJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.scrapedJob.update({
      where: { id },
      data: { status: 'dismissed' },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[scraped-job DELETE] error', err)
    return NextResponse.json({ error: 'Failed to dismiss job' }, { status: 500 })
  }
}
