import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// max: 1 — each serverless function instance should hold at most one pooled
// connection; PgBouncer transaction-mode pooling multiplexes many of these
// short-lived connections across Supabase's actual Postgres backends.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
