import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRedactedProfile } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

function parseArray(v: unknown): string[] {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : []
  } catch {
    return []
  }
}

// POST /api/match-results/[id]/redacted
// Step 6: generate an Oceans-branded redacted profile for the matched candidate.
// Strips all PII and stores the markdown on the candidate record.
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const result = await db.matchResult.findUnique({
      where: { id },
      include: { candidate: true, match: { include: { jobDescription: true } } },
    })
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { candidate, match } = result
    const roleTitle = match.jobDescription?.title ?? 'the role'

    const { markdown, oceanId } = await generateRedactedProfile({
      candidate: {
        headline: candidate.headline,
        outcomes: parseArray(candidate.outcomes),
        skills: parseArray(candidate.skills),
        tools: parseArray(candidate.tools),
        rolesFit: parseArray(candidate.rolesFit),
        workContext: candidate.workContext,
      },
      roleTitle,
      matchReasoning: result.reasoning,
    })

    // Store the redacted profile on the candidate + stamp the oceanId in tags.
    const updated = await db.candidate.update({
      where: { id: candidate.id },
      data: { redactedProfile: markdown },
    })

    await db.activity.create({
      data: {
        agent: 'talent_matcher',
        type: 'redacted_profile',
        message: `Redacted profile generated for ${oceanId} (fit ${roleTitle}).`,
      },
    })

    return NextResponse.json({
      candidateId: candidate.id,
      oceanId,
      markdown,
      redactedProfile: markdown,
    })
  } catch (err) {
    console.error('[redacted] error', err)
    return NextResponse.json({ error: 'Failed to generate redacted profile' }, { status: 500 })
  }
}
