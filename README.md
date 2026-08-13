# Oceans — AI Headhunting Platform

AI-powered headhunting platform placing Sri Lankan talent with companies in USA/Europe/Australia. Two AI agents: Customer Finder (job scraping + decision maker finding + outreach) and Talent Matcher (semantic candidate matching).

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Set up the database
bun run db:push
bun run db:generate

# 3. Seed demo data (11 candidates, 6 ICPs, 6 leads)
bun run src/lib/seed.ts

# 4. (Optional) Start the crawl4ai scraping service
pip install crawl4ai aiohttp
cd mini-services/crawl4ai-service
python3 index.py &

# 5. Start the dev server
bun run dev
```

Open http://localhost:3000

## Environment Variables

Create a `.env` file:
```
DATABASE_URL="file:./db/custom.db"
# INTEGRATION_ENCRYPTION_KEY="change-this-in-production-32+chars"
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Database**: Prisma 6 + SQLite (swap to Postgres for production)
- **AI**: z-ai-web-dev-sdk (Claude-equivalent LLM)
- **Scraping**: crawl4ai (Python, port 3031) + RemoteOK API + Jina Reader fallback
- **UI**: Tailwind CSS 4 + shadcn/ui + Framer Motion + Recharts
- **State**: TanStack Query + Zustand

## Project Structure

```
src/
  app/api/          # 34 API route handlers
  app/page.tsx       # Only user-visible route
  lib/ai.ts          # 7 AI functions (parseJD, matchCandidates, findDecisionMaker...)
  lib/integrations/  # 6 scraping sources + 5 app adapters
  components/ocean/   # 7 views + shared components
prisma/schema.prisma  # 13 models
mini-services/crawl4ai-service/  # Python scraper
```

## The 5-Step Pipeline

1. **Scrape** jobs per ICP (RemoteOK API → crawl4ai → Jina Reader → LLM fallback)
2. **Find decision maker** (DuckDuckGo search → real name + LinkedIn URL)
3. **Outreach** (AI-drafted personalised email)
4. **Get JD** (convert scraped posting → structured JD)
5. **Match** (semantic matching against Diver pool)

## Deploying to Netlify

Swap SQLite for Postgres (Neon recommended):
1. Change `provider = "postgresql"` in prisma/schema.prisma
2. Set `DATABASE_URL` to your Neon connection string
3. `bun run db:push` against the new DB
4. Deploy

See `download/oceans-tech-architecture.pdf` for full documentation.

## Built for

Oceans (oceanstalent.com) — Prepared by Affan · Buildin Blocks
