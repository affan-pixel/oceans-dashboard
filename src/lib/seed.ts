// Ocean Talent — seed script + importable seedData()
// Run directly with: bun run src/lib/seed.ts
// Or import { seedData } from '@/lib/seed-data' (re-exported there for the API route).

import { db } from './db'

interface SeedCandidate {
  name: string
  headline: string
  location: string
  email: string | null
  phone: string | null
  linkedin: string | null
  github: string | null
  raw: string
  tags: string[]
}

const CANDIDATES: SeedCandidate[] = [
  {
    name: 'Kavindu Perera',
    headline: 'Growth Lead',
    location: 'Colombo, Sri Lanka',
    email: 'kavindu.p@example.com',
    phone: '+94 77 123 4567',
    linkedin: 'https://linkedin.com/in/kavindu-perera',
    github: null,
    raw: `Growth Lead at a Series A SaaS startup (2 yrs). Built the outbound pipeline from zero — designed cold email sequences in Apollo, enriched leads in Clay, ran 10k+ sends/month, booked 40+ demos/month. Ran signal-based prospecting on funding announcements. Owned RevOps reporting in HubSpot. Previously co-founded a B2B lead-gen tool (bootstrapped, 0 to 300 users). Scrappy, generalist, comfortable with zero playbook. Tools: Apollo, Clay, HubSpot, Lemlist, SQL, Postgres, n8n.`,
    tags: ['GTM', 'outbound', 'founder'],
  },
  {
    name: 'Nimasha Fernando',
    headline: 'Full-Stack Engineer',
    location: 'Kandy, Sri Lanka',
    email: 'nimasha.f@example.com',
    phone: '+94 71 222 3344',
    linkedin: 'https://linkedin.com/in/nimasha-fernando',
    github: 'https://github.com/nimasha-f',
    raw: `Full-stack engineer, 5 yrs. Built and shipped a multi-tenant SaaS dashboard solo at a remote-first Series B fintech (React, Next.js, Node, Postgres). Owned the design system and the customer-facing analytics module end-to-end. Migrated a monolith to a modular service architecture. Worked async across US/EU timezones. Comfortable owning a feature from spec to prod. Tools: React, Next.js, TypeScript, Node, Postgres, AWS, Prisma.`,
    tags: ['fullstack', 'fintech', 'remote'],
  },
  {
    name: 'Tharindu Jayasuriya',
    headline: 'Revenue Operations Manager',
    location: 'Colombo, Sri Lanka',
    email: 'tharindu.j@example.com',
    phone: '+94 76 555 7788',
    linkedin: 'https://linkedin.com/in/tharindu-j',
    github: null,
    raw: `RevOps Manager at a Series B edtech (3 yrs). Built the sales funnel model and forecast in HubSpot, automated lead routing with Clay waterfalls, integrated Salesforce with Segment and Stripe. Cut sales cycle by 22% by tightening qualification. Previously an analyst at a scaled fintech. Strong in SQL, dbt, Looker. Cross-functional, comfortable with ambiguity, builder mindset. Tools: HubSpot, Salesforce, Clay, Segment, Stripe, SQL, dbt, Looker.`,
    tags: ['revops', 'edtech', 'data'],
  },
  {
    name: 'Achini Senanayake',
    headline: 'Co-founder & CTO',
    location: 'Galle, Sri Lanka',
    email: 'achini.s@example.com',
    phone: '+94 70 999 0011',
    linkedin: 'https://linkedin.com/in/achini-s',
    github: 'https://github.com/achini-s',
    raw: `Co-founder & CTO of a bootstrapped dev-tools startup (4 yrs, 0 to $40k MRR). Owned everything technical: built the CLI, the web app, the billing system, the docs site. Wrote the outbound engine that landed the first 200 customers. Strong in systems design, DX, and developer marketing. Scrappy, zero-to-one generalist. Tools: Go, TypeScript, React, Stripe, Postgres, Linear, Vercel.`,
    tags: ['founder', 'devtools', 'zero-to-one'],
  },
  {
    name: 'Rashmi Wickramasinghe',
    headline: 'Product Designer',
    location: 'Colombo, Sri Lanka',
    email: 'rashmi.w@example.com',
    phone: '+94 77 444 5566',
    linkedin: 'https://linkedin.com/in/rashmi-w',
    github: null,
    raw: `Product designer, 6 yrs. Led design for a remote-first ecommerce platform (Series A) — owned the checkout redesign that lifted conversion 18%. Built and maintained the design system in Figma, ran weekly customer interviews async with a US team. Previously designer at a scaled SaaS. Comfortable in early-stage ambiguity and shipping fast. Tools: Figma, FigJam, Maze, Notion, Linear, Hotjar.`,
    tags: ['design', 'ecommerce', 'remote'],
  },
  {
    name: 'Sahan Bandara',
    headline: 'Data Engineer',
    location: 'Negombo, Sri Lanka',
    email: 'sahan.b@example.com',
    phone: '+94 78 101 2020',
    linkedin: 'https://linkedin.com/in/sahan-b',
    github: 'https://github.com/sahan-b',
    raw: `Data engineer, 4 yrs. Built the data warehouse and ELT pipelines at a Series C fintech (Snowflake, dbt, Airflow, Python). Owned the analytics engineering workflow and mentored 2 juniors. Migrated reporting from Excel to a self-serve Looker stack. Previously at a growth-stage ecommerce. Strong SQL, Python, distributed systems. Remote-first since 2020. Tools: Snowflake, dbt, Airflow, Python, Looker, BigQuery, Dagster.`,
    tags: ['data', 'fintech', 'remote'],
  },
  {
    name: 'Ishara Gunawardena',
    headline: 'Frontend Engineer',
    location: 'Colombo, Sri Lanka',
    email: 'ishara.g@example.com',
    phone: '+94 71 303 4040',
    linkedin: 'https://linkedin.com/in/ishara-g',
    github: 'https://github.com/ishara-g',
    raw: `Frontend engineer, 3 yrs at a remote-first dev-tools startup (Series A). Owned the marketing site rebuild in Next.js, the in-app onboarding flow, and the docs theme. Shipped a CLI landing page that converted at 6.2%. Strong in React, Next.js, Tailwind, accessibility, and performance. Comfortable owning a feature end-to-end with a US team async. Tools: React, Next.js, Tailwind, TypeScript, Vercel, Linear, Figma.`,
    tags: ['frontend', 'devtools', 'remote'],
  },
  {
    name: 'Dinusha Liyanage',
    headline: 'Customer Success Lead',
    location: 'Maharagama, Sri Lanka',
    email: 'dinusha.l@example.com',
    phone: '+94 75 505 6060',
    linkedin: 'https://linkedin.com/in/dinusha-l',
    github: null,
    raw: `Customer success lead, 5 yrs at a Series B SaaS. Built the onboarding playbook from scratch, owned renewal forecasting in HubSpot, ran weekly business reviews with US/UK enterprise accounts. Lifted net retention from 92% to 108%. Previously support at a scaled fintech. Strong in cross-functional work, async comms, and structured playbooks. Tools: HubSpot, Linear, Notion, Zendesk, Vitally, SQL.`,
    tags: ['cs', 'saas', 'remote'],
  },
  {
    name: 'Amaya Wickramarachchi',
    headline: 'Executive Assistant (EA+)',
    location: 'Colombo, Sri Lanka',
    email: 'amaya.w@example.com',
    phone: '+94 77 787 8888',
    linkedin: 'https://linkedin.com/in/amaya-w',
    github: null,
    raw: `Executive Assistant (EA+), 6 yrs supporting C-suite at a Fortune-500 fintech and later at a Series B SaaS. Owned inbox + calendar for the CEO, ran expense management and invoicing, led recruiting and onboarding for 12 hires, and managed projects end-to-end in Notion + Asana. AI-fluent: built prompt-engineered automation workflows that cut weekly reporting time by 60%. Street-smart, takes initiative, owns the work. Tools: Google Workspace, Notion, Asana, Slack, HubSpot, ChatGPT, Zapier.`,
    tags: ['ea', 'operations', 'ai-fluent'],
  },
  {
    name: 'Sandeep Rajapaksa',
    headline: 'Marketing Ops Specialist',
    location: 'Colombo, Sri Lanka',
    email: 'sandeep.r@example.com',
    phone: '+94 71 606 7070',
    linkedin: 'https://linkedin.com/in/sandeep-r',
    github: null,
    raw: `Marketing Ops Specialist, 4 yrs at a Series A SaaS. Ran paid + organic + lifecycle channels end-to-end. Built the attribution model in HubSpot, automated content workflows with AI (ChatGPT + Jasper), lifted organic traffic 3x in 9 months via SEO, and cut CAC 22% by restructuring Meta Ads campaigns. Strong on Google Analytics, Looker, and lifecycle automation in Customer.io. Tools: HubSpot, Google Ads, Meta Ads, GA4, Customer.io, ChatGPT, Figma.`,
    tags: ['marketing', 'growth', 'ai-fluent'],
  },
  {
    name: 'Priyanka Silva',
    headline: 'FP&A Analyst',
    location: 'Kandy, Sri Lanka',
    email: 'priyanka.s@example.com',
    phone: '+94 76 818 9090',
    linkedin: 'https://linkedin.com/in/priyanka-silva',
    github: null,
    raw: `FP&A Analyst, 5 yrs — 3 at a scaled fintech + 2 at a Series B SaaS. Built the monthly forecasting model, automated reconciliation in Excel + NetSuite, flagged $180k in billing anomalies, and ran scenario modeling for the board. AI-fluent: uses ChatGPT for variance-analysis narratives and anomaly detection. Strong in SQL, QuickBooks, NetSuite, Excel modeling. Tools: Excel, NetSuite, QuickBooks, SQL, Looker, ChatGPT.`,
    tags: ['finance', 'fpa', 'ai-fluent'],
  },
]

function j(v: unknown): string {
  return JSON.stringify(v)
}

export async function seedData(prisma: typeof db) {
  console.log('Seeding Oceans database...')

  // Wipe (order matters for FK constraints)
  await prisma.matchResult.deleteMany()
  await prisma.externalProspect.deleteMany()
  await prisma.scrapedJob.deleteMany()
  await prisma.match.deleteMany()
  await prisma.jobDescription.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.jobTarget.deleteMany()
  await prisma.integration.deleteMany()
  await prisma.activity.deleteMany()

  // Candidates (structured fields left empty here — structured via AI when added through the UI;
  // for the seed we provide a pre-structured blob so matching works out of the box)
  for (const [idx, c] of CANDIDATES.entries()) {
    // Lightweight heuristic pre-structuring so the matcher has something to work with
    // without calling the LLM at seed time. The UI "Re-structure with AI" button calls
    // the real parseJD / structureCandidate flow.
    const lower = c.raw.toLowerCase()
    const tools = Array.from(
      new Set(
        ['Apollo', 'Clay', 'HubSpot', 'Lemlist', 'React', 'Next.js', 'TypeScript', 'Node', 'Postgres', 'AWS', 'Prisma', 'Salesforce', 'Segment', 'Stripe', 'SQL', 'dbt', 'Looker', 'Snowflake', 'Airflow', 'Python', 'Figma', 'Linear', 'Notion', 'Zendesk', 'Vitally', 'Go', 'Vercel', 'BigQuery', 'Dagster', 'Maze', 'Hotjar']
          .filter((t) => lower.includes(t.toLowerCase()))
      )
    )
    // Step 3 taxonomy: alternate port (available now) / lagoon (in pool, not immediately).
    const pool = idx % 2 === 0 ? 'port' : 'lagoon'
    await prisma.candidate.create({
      data: {
        name: c.name,
        headline: c.headline,
        email: c.email,
        phone: c.phone,
        location: c.location,
        linkedinUrl: c.linkedin,
        githubUrl: c.github,
        rawProfile: c.raw,
        outcomes: j([]),
        skills: j([]),
        tools: j(tools),
        companyStages: j([]),
        rolesFit: j([]),
        workContext: '',
        searchBlob: c.raw.toLowerCase(),
        status: 'active',
        tags: j(c.tags),
        pool,
      },
    })
  }
  console.log(`  ${CANDIDATES.length} candidates seeded`)

  // ---------- Role-side ICPs — Oceans' 6 role categories ----------
  // Each ICP drives its own job scraping on LinkedIn / Indeed / Wellfound.
  const JOB_TARGETS = [
    {
      name: 'Executive Assistants (EA+)',
      description: 'AI-fluent executive operators who run operations — inbox, calendar, strategy, project mgmt, AI automation. From $3K/mo.',
      roleTypes: ['Executive Assistant', 'EA+', 'Chief of Staff', 'Operations Coordinator'],
      stages: ['Seed', 'Series A', 'Series B', 'Bootstrapped'],
      industries: ['SaaS', 'Fintech', 'Ecommerce', 'Edtech', 'Dev Tools'],
      regions: ['USA', 'Europe', 'Australia'],
      salaryMinUsd: 36000,
      remoteOnly: true,
      signals: ['ai-fluent', 'owns-the-work', 'street-smart', 'fortune-500-experience'],
      keywords: ['executive assistant', 'EA', 'chief of staff', 'inbox management', 'calendar', 'project management', 'AI automation', 'operations'],
    },
    {
      name: 'Marketing Divers',
      description: 'AI-fluent marketers who run paid, organic, and lifecycle channels — SEO, social, content, attribution.',
      roleTypes: ['Marketing Assistant', 'Marketing Ops Specialist', 'Growth Marketer', 'Content Marketer', 'SEO Specialist'],
      stages: ['Seed', 'Series A', 'Series B'],
      industries: ['SaaS', 'Ecommerce', 'Edtech', 'Dev Tools'],
      regions: ['USA', 'Europe', 'Australia'],
      salaryMinUsd: 45000,
      remoteOnly: true,
      signals: ['ai-marketing-stack', 'optimizes-real-time', 'data-driven'],
      keywords: ['marketing', 'SEO', 'paid ads', 'content', 'lifecycle', 'attribution', 'HubSpot', 'Google Ads', 'Meta Ads'],
    },
    {
      name: 'Finance Divers',
      description: 'AI-fluent finance professionals — bookkeeping, FP&A, modeling, automation. Not just spreadsheets, insights.',
      roleTypes: ['Finance Assistant', 'FP&A Analyst', 'FP&A Manager', 'Bookkeeper', 'Finance Ops Specialist'],
      stages: ['Series A', 'Series B', 'Series C'],
      industries: ['SaaS', 'Fintech', 'Ecommerce'],
      regions: ['USA', 'Europe', 'Australia'],
      salaryMinUsd: 55000,
      remoteOnly: true,
      signals: ['ai-powered-modeling', 'anomaly-detection', 'insights-not-spreadsheets'],
      keywords: ['finance', 'FP&A', 'bookkeeping', 'financial modeling', 'forecasting', 'reconciliation', 'QuickBooks', 'NetSuite', 'Excel'],
    },
    {
      name: 'Operations Divers',
      description: 'Business operations managers who own processes, RevOps, and cross-functional execution.',
      roleTypes: ['Operations Manager', 'RevOps Manager', 'Business Operations Manager', 'BizOps Analyst'],
      stages: ['Series A', 'Series B', 'Series C'],
      industries: ['SaaS', 'Fintech', 'Ecommerce', 'Edtech'],
      regions: ['USA', 'Europe', 'Australia'],
      salaryMinUsd: 65000,
      remoteOnly: true,
      signals: ['process-builder', 'cross-functional', 'systems-thinker'],
      keywords: ['operations', 'RevOps', 'BizOps', 'process', 'HubSpot', 'Salesforce', 'automation', 'workflow'],
    },
    {
      name: 'Customer Success Divers',
      description: 'CS leads who own onboarding, renewals, and net retention. Enterprise + SMB experience.',
      roleTypes: ['Customer Success Manager', 'CS Lead', 'Onboarding Specialist', 'Account Manager'],
      stages: ['Series A', 'Series B', 'Series C'],
      industries: ['SaaS', 'Fintech', 'Edtech'],
      regions: ['USA', 'Europe', 'Australia'],
      salaryMinUsd: 55000,
      remoteOnly: true,
      signals: ['retention-focused', 'playbook-builder', 'relationship-native'],
      keywords: ['customer success', 'CS', 'onboarding', 'renewals', 'net retention', 'account management', 'Gainsight', 'Vitally'],
    },
    {
      name: 'GTM / Sales Divers',
      description: 'Generalist GTM/builders for early-stage — outbound pipelines, signal-based prospecting, scrappy.',
      roleTypes: ['GTM Engineer', 'Growth Lead', 'Founding AE', 'SDR', 'Sales Ops'],
      stages: ['Seed', 'Series A'],
      industries: ['Dev Tools', 'SaaS'],
      regions: ['USA', 'Europe'],
      salaryMinUsd: 80000,
      remoteOnly: true,
      signals: ['scrappy', 'zero-to-one', 'no playbook', 'wear many hats'],
      keywords: ['GTM', 'outbound pipeline', 'cold email', 'signal-based prospecting', 'Clay', 'Apollo', 'Lemlist'],
    },
  ]
  for (const t of JOB_TARGETS) {
    await prisma.jobTarget.create({
      data: {
        name: t.name,
        description: t.description,
        roleTypes: j(t.roleTypes),
        stages: j(t.stages),
        industries: j(t.industries),
        regions: j(t.regions),
        salaryMinUsd: t.salaryMinUsd,
        remoteOnly: t.remoteOnly,
        signals: j(t.signals),
        keywords: j(t.keywords),
        scrapeStatus: 'idle',
      },
    })
  }
  console.log(`  ${JOB_TARGETS.length} role ICPs seeded`)

  // ---------- One pre-parsed, ACTIVE Job Description ("a job I'm looking for") ----------
  const SAMPLE_JD_RAW = `GTM Engineer at a Series A SaaS startup in San Francisco. You will own the outbound pipeline end-to-end, run signal-based prospecting on funding announcements, build cold email sequences from scratch, and work cross-functionally with sales and product. We are a scrappy team of 25, no playbook, zero to one environment. You will wear many hats. Must have: Apollo, Clay, HubSpot. Nice to have: SQL, n8n.`
  await prisma.jobDescription.create({
    data: {
      title: 'GTM Engineer',
      company: 'Northwind Labs',
      rawText: SAMPLE_JD_RAW,
      outcomes: j([
        'own the outbound pipeline end-to-end',
        'run signal-based prospecting on funding announcements',
        'build cold email sequences from scratch',
        'work cross-functionally with sales and product',
      ]),
      mandatorySkills: j(['Apollo', 'Clay', 'HubSpot']),
      niceToHave: j(['SQL', 'n8n']),
      context: 'Series A SaaS startup, team of 25, building out initial go-to-market functions',
      signals: j(['scrappy', 'zero-to-one', 'no playbook', 'wear many hats', 'generalist-builder']),
      searchBlob: SAMPLE_JD_RAW.toLowerCase(),
      isActive: true,
      priority: 'high',
      notes: 'Northwind Labs — placed lookalike from Cohere Tools. Active search, need shortlist by Friday.',
      status: 'parsed',
    },
  })
  console.log('  1 active JD seeded (GTM Engineer @ Northwind Labs)')

  // Activity log
  const activities = [
    { agent: 'customer_finder', type: 'jobs_scraped', message: 'Scraped 6 role ICPs — new postings added to the pipeline.' },
    { agent: 'customer_finder', type: 'dm_found', message: 'Decision maker found for GTM Engineer @ Northwind Labs.' },
    { agent: 'customer_finder', type: 'outreach_sent', message: 'Outreach drafted and sent for GTM Engineer @ Northwind Labs.' },
    { agent: 'talent_matcher', type: 'jd_parsed', message: 'JD parsed: GTM Engineer at Northwind Labs.' },
  ]
  for (const a of activities) {
    await prisma.activity.create({ data: a })
  }
  console.log(`  ${activities.length} activities seeded`)

  console.log('Seed complete.')
}

// When run directly as a script (`bun run src/lib/seed.ts`), execute the seed.
// When imported (by the API route), do nothing — the caller invokes seedData(db).
const isDirectRun = import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  seedData(db)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await db.$disconnect()
    })
}
