import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// A small per-instance cap (not 1 — that serializes concurrent requests
// within the same warm instance and risks request timeouts under load) so
// many warm serverless instances together stay well under the PgBouncer
// transaction-mode pooler's much higher connection ceiling.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 5 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
