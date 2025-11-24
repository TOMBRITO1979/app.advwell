import { PrismaClient } from '@prisma/client';

// Connection pool configuration
// With 3 backend replicas, 10 connections each = 30 total (max_connections=300 in PostgreSQL)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['query', 'info', 'warn', 'error'],
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log('Disconnecting Prisma client...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default prisma;
