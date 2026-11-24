import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export function createPrismaClient(connectionString: string) {
  // Bound connection acquisition during readiness checks and database outages.
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    enableChannelBinding: true,
  }, { schema: 'public' });
  return new PrismaClient({ adapter });
}
