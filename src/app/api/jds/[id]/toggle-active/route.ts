import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJdDTO } from '@/lib/mappers'

type Params = { params: Promise<{ id: string }> }

// Convenience endpoint for the "mark as looking for this" button.
// Toggles isActive and returns the updated JobDescriptionDTO.
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.jobDescription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await db.jobDescription.update({
      where: { id },
      data: { isActive: !existing.isActive },
    })

    return NextResponse.json(toJdDTO(updated))
  } catch (err) {
    console.error('[jd toggle-active] error', err)
    return NextResponse.json({ error: 'Failed to toggle active state' }, { status: 500 })
  }
}
