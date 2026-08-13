import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toJdDTO } from '@/lib/mappers'
import { parseJD } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

// POST /api/scraped-jobs/[id]/convert-to-jd — promote a scraped job into a JD (source: agent)
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await db.scrapedJob.findUnique({ where: { id } })
    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Build a raw JD text from the scraped posting + run parseJD
    const rawText = `${job.title} at ${job.company}.${job.location ? ` Based in ${job.location}.` : ''} ${job.snippet} Salary: ${job.salaryText || 'competitive'}.`

    const structured = await parseJD(rawText)

    const jd = await db.jobDescription.create({
      data: {
        title: job.title,
        company: job.company,
        rawText,
        outcomes: JSON.stringify(structured.outcomes),
        mandatorySkills: JSON.stringify(structured.mandatorySkills),
        niceToHave: JSON.stringify(structured.niceToHave),
        context: structured.context,
        signals: JSON.stringify(structured.signals),
        searchBlob: structured.searchBlob,
        status: 'parsed',
        isActive: false,
        priority: 'medium',
        source: 'agent',
        targetId: job.jobTargetId,
      },
    })

    await db.scrapedJob.update({
      where: { id },
      data: { status: 'converted', jdId: jd.id },
    })

    await db.activity.create({
      data: {
        agent: 'customer_finder',
        type: 'scraped_job_converted',
        message: `Scraped job converted to JD: ${jd.title} at ${jd.company}.`,
      },
    })

    return NextResponse.json({ jd: toJdDTO(jd) }, { status: 201 })
  } catch (err) {
    console.error('[scraped-job convert] error', err)
    return NextResponse.json({ error: 'Failed to convert scraped job' }, { status: 500 })
  }
}
