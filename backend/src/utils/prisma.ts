import { PrismaClient } from '@prisma/client';

// Connection pool configuration
// ESCALABILIDADE: 4 backend replicas x 15 connections each = 60 total (max_connections=500 in PostgreSQL)
// Pool timeout: 20s para evitar timeout em picos de carga
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
