import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaVersion?: string
}

// Bust the cached client when the Prisma schema version changes (e.g. after
// `bun run db:push` adds new models). Without this, the dev server keeps a
// stale PrismaClient instance that doesn't know about new models like
// JobTarget / Brief.
const SCHEMA_VERSION = 'v7-agent1-tracking'

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION
) {
  try {
    void globalForPrisma.prisma.$disconnect()
  } catch {
    // ignore
  }
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

globalForPrisma.prisma = db
globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION
