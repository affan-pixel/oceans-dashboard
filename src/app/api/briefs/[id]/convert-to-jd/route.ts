import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toBriefDTO, toJdDTO } from '@/lib/mappers'
import { parseJD } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

// Convert a brief's freeform content into a structured JobDescription.
// - Uses brief.content as the raw JD text.
// - Calls parseJD(content) to structure it.
// - Creates a new JobDescription (isActive=false by default).
// - Links the brief back to the new JD via linkedJdId.
// - Returns both the new JD and the updated brief.
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const brief = await db.brief.findUnique({ where: { id } })
    if (!brief) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!brief.content || !brief.content.trim()) {
      return NextResponse.json(
        { error: 'Brief content is empty — nothing to convert' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const overrideTitle =
      typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : null
    const overrideCompany =
      typeof body?.company === 'string' && body.company.trim() ? body.company.trim() : null

    const structured = await parseJD(brief.content)
    const finalTitle = overrideTitle || structured.title || brief.title
    const finalCompany = overrideCompany ?? null

    const [created, updatedBrief] = await db.$transaction(async (tx) => {
      const jd = await tx.jobDescription.create({
        data: {
          title: finalTitle,
          company: finalCompany,
          rawText: brief.content,
          outcomes: JSON.stringify(structured.outcomes),
          mandatorySkills: JSON.stringify(structured.mandatorySkills),
          niceToHave: JSON.stringify(structured.niceToHave),
          context: structured.context,
          signals: JSON.stringify(structured.signals),
          searchBlob: structured.searchBlob,
          status: 'parsed',
          isActive: false,
          priority: 'medium',
          notes: null,
          targetId: null,
        },
      })

      const updated = await tx.brief.update({
        where: { id: brief.id },
        data: { linkedJdId: jd.id },
      })

      await tx.activity.create({
        data: {
          agent: 'talent_matcher',
          type: 'jd_parsed',
          message: `Brief converted to JD: ${jd.title}.`,
        },
      })

      return [jd, updated] as const
    })

    return NextResponse.json(
      { jd: toJdDTO(created), brief: toBriefDTO(updatedBrief) },
      { status: 201 }
    )
  } catch (err) {
    console.error('[brief convert-to-jd] error', err)
    return NextResponse.json({ error: 'Failed to convert brief to JD' }, { status: 500 })
  }
}
