import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJobTargetDTO } from '@/lib/mappers'

// Normalise an array-ish value from the client into a clean string[].
function toArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter((x) => x.length > 0)
  }
  if (typeof v === 'string' && v.trim()) {
    // allow comma-separated strings as a convenience
    return v
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((x) => x.length > 0)
  }
  return []
}

export async function GET() {
  try {
    const targets = await db.jobTarget.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { scrapedJobs: { where: { status: 'new' } } } },
      },
    })
    return NextResponse.json(
      targets.map((t) => ({
        ...toJobTargetDTO(t),
        scrapedJobsCount: t._count.scrapedJobs,
      }))
    )
  } catch (err) {
    console.error('[job-targets GET] error', err)
    return NextResponse.json({ error: 'Failed to load job targets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      name,
      description = null,
      roleTypes,
      stages,
      industries,
      regions,
      salaryMinUsd,
      remoteOnly = true,
      signals,
      keywords,
    } = body ?? {}

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const created = await db.jobTarget.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        roleTypes: JSON.stringify(toArray(roleTypes)),
        stages: JSON.stringify(toArray(stages)),
        industries: JSON.stringify(toArray(industries)),
        regions: JSON.stringify(toArray(regions)),
        salaryMinUsd:
          typeof salaryMinUsd === 'number' && Number.isFinite(salaryMinUsd)
            ? salaryMinUsd
            : null,
        remoteOnly: typeof remoteOnly === 'boolean' ? remoteOnly : true,
        signals: JSON.stringify(toArray(signals)),
        keywords: JSON.stringify(toArray(keywords)),
      },
    })

    await db.activity.create({
      data: {
        agent: 'system',
        type: 'job_target_created',
        message: `Job target defined: ${created.name}.`,
      },
    })

    return NextResponse.json(toJobTargetDTO(created), { status: 201 })
  } catch (err) {
    console.error('[job-targets POST] error', err)
    return NextResponse.json({ error: 'Failed to create job target' }, { status: 500 })
  }
}
