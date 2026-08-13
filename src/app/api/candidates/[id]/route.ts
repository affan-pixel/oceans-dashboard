import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCandidateDTO } from '@/lib/mappers'
import { structureCandidate } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const candidate = await db.candidate.findUnique({ where: { id } })
    if (!candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(toCandidateDTO(candidate))
  } catch (err) {
    console.error('[candidate GET] error', err)
    return NextResponse.json({ error: 'Failed to load candidate' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.candidate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      headline,
      location,
      email,
      phone,
      linkedinUrl,
      githubUrl,
      rawProfile,
      status,
      tags,
    } = body ?? {}

    const update: Record<string, unknown> = {}
    if (typeof name === 'string') update.name = name
    if (typeof headline === 'string') update.headline = headline
    if (typeof location === 'string') update.location = location
    if (email !== undefined) update.email = email
    if (phone !== undefined) update.phone = phone
    if (linkedinUrl !== undefined) update.linkedinUrl = linkedinUrl
    if (githubUrl !== undefined) update.githubUrl = githubUrl
    if (typeof status === 'string') update.status = status
    if (Array.isArray(tags)) update.tags = JSON.stringify(tags)

    // If rawProfile changed, re-run structuring
    if (typeof rawProfile === 'string' && rawProfile !== existing.rawProfile) {
      update.rawProfile = rawProfile
      const structured = await structureCandidate(rawProfile)
      update.outcomes = JSON.stringify(structured.outcomes)
      update.skills = JSON.stringify(structured.skills)
      update.tools = JSON.stringify(structured.tools)
      update.companyStages = JSON.stringify(structured.companyStages)
      update.rolesFit = JSON.stringify(structured.rolesFit)
      update.workContext = structured.workContext
      update.searchBlob = structured.searchBlob
    }

    const updated = await db.candidate.update({ where: { id }, data: update })
    return NextResponse.json(toCandidateDTO(updated))
  } catch (err) {
    console.error('[candidate PUT] error', err)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const existing = await db.candidate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.candidate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[candidate DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete candidate' }, { status: 500 })
  }
}
