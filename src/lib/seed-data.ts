// Re-export so the API route can import seedData via '@/lib/seed-data'
// (keeps the seed script runnable as `bun run src/lib/seed.ts`).
export { seedData } from './seed'
