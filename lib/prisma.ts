import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

let prisma: PrismaClient;

// Global Prisma instance for development to avoid hot-reloading pool exhaustion
const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  if (connectionString?.startsWith('prisma://') || connectionString?.startsWith('prisma+postgres://')) {
    prisma = new PrismaClient({
      accelerateUrl: connectionString,
    });
  } else if (connectionString) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  } else {
    // Fallback during build when environment variables are not available
    prisma = new PrismaClient({
      accelerateUrl: 'prisma+postgres://localhost:51213/?api_key=fallback',
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
