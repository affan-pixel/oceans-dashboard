import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

type Params = { params: Promise<{ id: string }> }

// POST /api/matches/[id]/notify-slack
// Step 7: notify Slack with the opportunity + matched profile + match type + price range.
// Body: { matchResultId, channel? }
// - If SLACK_BOT_TOKEN is set: posts a real Slack message and returns { ok, messageTs, channel }.
// - If not: returns the drafted Block Kit payload + text so the UI can preview it (labeled "draft").
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const matchResultId = String(body.matchResultId ?? '')

    const match = await db.match.findUnique({
      where: { id },
      include: {
        jobDescription: { select: { title: true, company: true } },
        results: {
          where: matchResultId ? { id: matchResultId } : undefined,
          take: 1,
          include: { candidate: { select: { name: true, headline: true, pool: true, redactedProfile: true } } },
          orderBy: { rank: 'asc' },
        },
      },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const result = match.results[0]
    if (!result) return NextResponse.json({ error: 'No match result to notify' }, { status: 400 })

    const jobTitle = match.jobDescription?.title ?? 'a role'
    const company = match.jobDescription?.company ?? 'a US startup'
    const channel = String(body.channel ?? env.slackChannel)

    const matchTypeLabel =
      result.matchType === 'lagoon' ? '🟣 Lagoon' :
      result.matchType === 'market' ? '🟠 Market hire' : '🔵 Port'

    const profilePreview = (result.candidate.redactedProfile ?? '').slice(0, 600) || '_No redacted profile yet — generate one first._'
    const candidateLabel = result.candidate.redactedProfile ? 'Oceans Diver (redacted)' : result.candidate.name

    const text = `🌊 New opportunity match — ${jobTitle} @ ${company}\n${matchTypeLabel} · Fit score ${result.score} · ${result.priceRangeUsd ?? 'price TBD'}\nCandidate: ${candidateLabel}`

    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: `🌊 ${jobTitle} @ ${company}` } },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Match type:* ${matchTypeLabel}\n*Fit score:* ${result.score}/100\n*Price range:* ${result.priceRangeUsd ?? 'TBD'}\n*Reasoning:* ${result.reasoning}` },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Matched profile (${candidateLabel}):*\n${profilePreview}` },
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '✅ Approve' }, style: 'primary', value: `approve:${match.id}:${result.id}` },
          { type: 'button', text: { type: 'plain_text', text: '❌ Reject' }, style: 'danger', value: `reject:${match.id}:${result.id}` },
        ],
      },
    ]

    // No Slack key → return the drafted payload for in-app preview.
    if (!env.slackBotToken) {
      await db.activity.create({
        data: {
          agent: 'talent_matcher',
          type: 'slack_notify_draft',
          message: `Slack notification drafted (no bot token) — ${jobTitle} @ ${company}.`,
        },
      })
      return NextResponse.json({
        ok: false,
        drafted: true,
        channel,
        text,
        blocks,
        message: 'No SLACK_BOT_TOKEN set — message drafted for preview. Add the token to post for real.',
      })
    }

    // Real Slack post.
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.slackBotToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text, blocks }),
      signal: AbortSignal.timeout(15_000),
    })
    const slackData = (await slackRes.json()) as { ok: boolean; error?: string; ts?: string; channel?: string }
    if (!slackData.ok) {
      return NextResponse.json({ error: `Slack error: ${slackData.error ?? 'unknown'}` }, { status: 502 })
    }

    await db.approvalRequest.create({
      data: {
        matchId: match.id,
        matchResultId: result.id,
        candidateId: result.candidateId,
        stage: 'leadership',
        channel: 'slack',
        slackChannel: channel,
        slackMessageTs: slackData.ts ?? null,
        status: 'pending',
      },
    })
    await db.activity.create({
      data: { agent: 'talent_matcher', type: 'slack_notify_sent', message: `Slack notified — ${jobTitle} @ ${company} → #${channel}.` },
    })

    return NextResponse.json({ ok: true, messageTs: slackData.ts, channel })
  } catch (err) {
    console.error('[notify-slack] error', err)
    return NextResponse.json({ error: 'Failed to notify Slack' }, { status: 500 })
  }
}
