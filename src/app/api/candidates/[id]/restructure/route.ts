import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCandidateDTO } from '@/lib/mappers'
import { structureCandidate } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.candidate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const structured = await structureCandidate(existing.rawProfile)
    const updated = await db.candidate.update({
      where: { id },
      data: {
        outcomes: JSON.stringify(structured.outcomes),
        skills: JSON.stringify(structured.skills),
        tools: JSON.stringify(structured.tools),
        companyStages: JSON.stringify(structured.companyStages),
        rolesFit: JSON.stringify(structured.rolesFit),
        workContext: structured.workContext,
        searchBlob: structured.searchBlob,
      },
    })

    return NextResponse.json(toCandidateDTO(updated))
  } catch (err) {
    console.error('[candidate restructure] error', err)
    return NextResponse.json({ error: 'Failed to restructure candidate' }, { status: 500 })
  }
}
