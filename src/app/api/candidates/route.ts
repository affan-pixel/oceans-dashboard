import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCandidateDTO } from '@/lib/mappers'
import { structureCandidate } from '@/lib/ai'

export async function GET() {
  try {
    const candidates = await db.candidate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(candidates.map(toCandidateDTO))
  } catch (err) {
    console.error('[candidates GET] error', err)
    return NextResponse.json({ error: 'Failed to load candidates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      headline,
      location,
      email = null,
      phone = null,
      linkedinUrl = null,
      githubUrl = null,
      rawProfile,
      tags = [],
    } = body ?? {}

    if (!name || !headline || !location || !rawProfile) {
      return NextResponse.json(
        { error: 'Missing required fields: name, headline, location, rawProfile' },
        { status: 400 }
      )
    }

    // Run AI structuring
    const structured = await structureCandidate(rawProfile)

    const created = await db.candidate.create({
      data: {
        name,
        headline,
        location,
        email: email ?? null,
        phone: phone ?? null,
        linkedinUrl: linkedinUrl ?? null,
        githubUrl: githubUrl ?? null,
        rawProfile,
        outcomes: JSON.stringify(structured.outcomes),
        skills: JSON.stringify(structured.skills),
        tools: JSON.stringify(structured.tools),
        companyStages: JSON.stringify(structured.companyStages),
        rolesFit: JSON.stringify(structured.rolesFit),
        workContext: structured.workContext,
        searchBlob: structured.searchBlob,
        status: 'active',
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      },
    })

    return NextResponse.json(toCandidateDTO(created), { status: 201 })
  } catch (err) {
    console.error('[candidates POST] error', err)
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
  }
}
