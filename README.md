# Oceans — AI Headhunting Platform

Places Sri Lankan talent with companies in the USA / Europe / Australia. Two
agents: **Customer Finder** (job scraping → decision maker → outreach) and
**Talent Matcher** (semantic candidate matching → redacted profile → approval →
prospect email).

## Quick Start

```bash
npm ci
npm run db:push
npm run db:generate
npm run dev
```

Open http://localhost:3000. Seed demo data from the "Seed" button in the topbar,
or `POST /api/seed` with `ENABLE_SEED_ENDPOINT=true`.

Optional real-page scraping service:

```bash
pip install crawl4ai aiohttp
python3 mini-services/crawl4ai-service/index.py &
```

## Environment

Copy `.env.example` to `.env`. Every API key is optional and each feature
degrades gracefully without it — except two:

| Variable | Why it's required |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `CRON_SECRET` | Authenticates the scheduled recheck. Without it the aging signal never advances (see below). |

## The aging model — read this before deploying

The core signal is **job persistence**: a remote role that stays posted for weeks
is a company that cannot fill it, and that is the moment to call them. Every job
carries `firstSeenAt`, `lastSeenAt`, `lastCheckedAt`, `timesSeen`, `ageBand`
(`fresh → week → month → quarter → stuck`) and `stillLive`.

Those fields only move if something re-visits each posting on a schedule.
`.github/workflows/job-recheck.yml` does that — it calls
`GET /api/cron/recheck` three times a day, 40 postings per run, least-recently-
checked first.

**Set these two repo secrets or the schedule is a no-op:**

```bash
gh secret set APP_URL     --body "https://<your-railway-domain>"
gh secret set CRON_SECRET --body "<same value as the app's CRON_SECRET>"
```

Prefer Railway's own cron? Point a cron service at the same endpoint with the
same bearer token — the endpoint is the contract, the scheduler is swappable.

## Tech Stack

- **Framework** — Next.js 16 (App Router) + TypeScript 5
- **Database** — Prisma 6 + Postgres
- **AI** — `z-ai-web-dev-sdk` (`glm-4.6` by default, via `ZAI_MODEL`)
- **Scraping** — crawl4ai (Python, port 3031) → RemoteOK API → Jina Reader → LLM fallback
- **UI** — Tailwind CSS 4 + shadcn/ui + Framer Motion + Recharts
- **State** — TanStack Query + Zustand

## Project Structure

```
src/
  app/api/                 # API route handlers
  app/api/cron/recheck/    # scheduled aging/persistence check (bearer auth)
  lib/agent1.ts            # age bands + lead scoring
  lib/recheck.ts           # recheck engine, shared by the UI button and the cron
  lib/ai.ts                # parseJD, matchCandidates, findDecisionMaker, …
  lib/integrations/        # apify, clay, slack, hubspot, instantly
  components/ocean/views/  # dashboard, ICPs, pipeline, JDs, Divers, matches, integrations
prisma/schema.prisma       # 10 models
mini-services/crawl4ai-service/
```

## The pipeline

1. **Scrape** jobs per role ICP (RemoteOK → crawl4ai → Jina Reader → LLM fallback)
2. **Categorize** — role, seniority, skills, timezone
3. **Find decision maker** — real name + LinkedIn URL
4. **Score** — age band, poster type, DM found (see `lib/agent1.ts`)
5. **Match** against the Diver pool (Port = available now, Lagoon = in pool)
6. **Redacted profile** — Oceans-branded, PII stripped
7. **Slack** — opportunity + profile + match type + price band
8. **Leadership approval** — `ApprovalRequest`, in-app or via Slack button
9. **Prospect email** — HubSpot single-send, or Instantly for sequenced volume

## Built for

Oceans (oceanstalent.com) — Prepared by Affan · Buildin Blocks
