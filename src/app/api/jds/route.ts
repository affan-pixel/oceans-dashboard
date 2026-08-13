import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJdDTO } from '@/lib/mappers'
import { parseJD } from '@/lib/ai'

export async function GET() {
  try {
    const jds = await db.jobDescription.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(jds.map(toJdDTO))
  } catch (err) {
    console.error('[jds GET] error', err)
    return NextResponse.json({ error: 'Failed to load job descriptions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      company = null,
      rawText,
      isActive = false,
      priority = 'medium',
      notes = null,
      targetId = null,
      source = 'sales_team',
    } = body ?? {}

    if (!title || !rawText) {
      return NextResponse.json(
        { error: 'Missing required fields: title, rawText' },
        { status: 400 }
      )
    }
    // Validate source against allowed values (prevents arbitrary data injection)
    const allowedSources = ['agent', 'sales_team', 'client']
    const safeSource = allowedSources.includes(source as string) ? (source as string) : 'sales_team'

    const structured = await parseJD(rawText)

    const created = await db.jobDescription.create({
      data: {
        title: structured.title || title,
        company: company ?? null,
        rawText,
        outcomes: JSON.stringify(structured.outcomes),
        mandatorySkills: JSON.stringify(structured.mandatorySkills),
        niceToHave: JSON.stringify(structured.niceToHave),
        context: structured.context,
        signals: JSON.stringify(structured.signals),
        searchBlob: structured.searchBlob,
        status: 'parsed',
        isActive: Boolean(isActive),
        priority: typeof priority === 'string' && priority ? priority : 'medium',
        notes: typeof notes === 'string' ? notes : null,
        targetId: typeof targetId === 'string' && targetId ? targetId : null,
        source: safeSource,
      },
    })

    // Activity log
    const activityMsg = `JD parsed: ${created.title}${created.company ? ' at ' + created.company : ''}.`
    await db.activity.create({
      data: {
        agent: 'talent_matcher',
        type: 'jd_parsed',
        message: activityMsg,
      },
    })

    return NextResponse.json(toJdDTO(created), { status: 201 })
  } catch (err) {
    console.error('[jds POST] error', err)
    return NextResponse.json({ error: 'Failed to create job description' }, { status: 500 })
  }
}
