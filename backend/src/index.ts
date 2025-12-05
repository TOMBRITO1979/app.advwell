import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
// Temporariamente desabilitado - aguardando schema Prisma
// import stripeWebhookRoutes from './routes/stripe-webhook.routes';
import cron from 'node-cron';
import prisma from './utils/prisma';
import { redis, cache } from './utils/redis';
import { enqueueDailySync, getQueueStats } from './queues/sync.queue';
import crypto from 'crypto';

// Security validation at startup
function validateSecurityConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  } else if (jwtSecret.includes('default') || jwtSecret.includes('change')) {
    warnings.push('JWT_SECRET appears to be a default value - please use a secure random key');
  }

  // Check ENCRYPTION_KEY
  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  if (!encryptionKey || encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters');
  } else if (encryptionKey.includes('default') || encryptionKey.includes('change')) {
    warnings.push('ENCRYPTION_KEY appears to be a default value - please use a secure random key');
  }

  // Log results
  if (errors.length > 0) {
    console.error('❌ CRITICAL SECURITY ERRORS:');
    errors.forEach(e => console.error(`   - ${e}`));
    if (config.nodeEnv === 'production') {
      console.error('⛔ Server startup blocked due to security configuration errors');
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  SECURITY WARNINGS:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Security configuration validated');
  }
}

// Run security validation
validateSecurityConfig();

const app = express();

// Instance ID for cron job leader election
const INSTANCE_ID = process.env.HOSTNAME || `instance-${Math.random().toString(36).substring(7)}`;
const CRON_LEADER_KEY = 'advwell:cron:leader';
const CRON_LEADER_TTL = 120; // 2 minutes

// Trust proxy - necessário quando atrás de Traefik/Nginx
app.set('trust proxy', 1);

// CORS deve vir antes do helmet
app.use(cors({
  origin: [config.urls.frontend, 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middlewares de segurança com headers reforçados
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

// Rate limiting global (ajustado para segurança)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Ajustado de 500 para 200 (mais seguro contra DDoS)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.', retry_after: 15 * 60 },
  validate: {
    trustProxy: false,
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});
app.use('/api/', globalLimiter);

// Rate limit mais restritivo para auth (previne brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  validate: {
    trustProxy: false,
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Stripe webhook (must be BEFORE express.json() to receive raw body)
// app.use('/api/stripe-webhook', stripeWebhookRoutes);

// Body parser com limite de tamanho
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api', routes);

// Enhanced health check with database, redis and queue metrics
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    instanceId: INSTANCE_ID,
    checks: {}
  };

  // 1. Database connectivity check
  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'connected',
      responseTime: `${Date.now() - dbStartTime}ms`
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 2. Redis connectivity check
  try {
    const redisStartTime = Date.now();
    await redis.ping();
    health.checks.redis = {
      status: 'connected',
      responseTime: `${Date.now() - redisStartTime}ms`
    };
  } catch (error) {
    health.status = 'degraded';
    health.checks.redis = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 3. Queue stats
  try {
    const queueStats = await getQueueStats();
    health.checks.queue = {
      status: 'operational',
      ...queueStats
    };
  } catch (error) {
    health.checks.queue = {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 4. Memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
  };

  // 5. System info
  health.system = {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development'
  };

  health.responseTime = `${Date.now() - startTime}ms`;

  const httpStatus = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 : 503;

  res.status(httpStatus).json(health);
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'AdvWell API',
    version: '2.0.0',
    status: 'running',
    instanceId: INSTANCE_ID
  });
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Leader election for cron jobs (only one instance runs cron)
async function tryBecomeLeader(): Promise<boolean> {
  try {
    // Try to set leader key with NX (only if not exists)
    const result = await redis.set(CRON_LEADER_KEY, INSTANCE_ID, 'EX', CRON_LEADER_TTL, 'NX');
    if (result === 'OK') {
      return true;
    }

    // Check if we're already the leader
    const currentLeader = await redis.get(CRON_LEADER_KEY);
    if (currentLeader === INSTANCE_ID) {
      // Refresh TTL
      await redis.expire(CRON_LEADER_KEY, CRON_LEADER_TTL);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Leader election error:', error);
    return false;
  }
}

// Cron job para sincronizar processos - agora usa filas
// Executa às 2h da manhã, mas apenas no líder
cron.schedule('0 2 * * *', async () => {
  const isLeader = await tryBecomeLeader();

  if (!isLeader) {
    console.log(`[${INSTANCE_ID}] Not leader, skipping daily sync`);
    return;
  }

  console.log(`[${INSTANCE_ID}] Leader: Starting daily sync via queue...`);

  try {
    await enqueueDailySync();
    console.log(`[${INSTANCE_ID}] Daily sync jobs enqueued successfully`);
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Error enqueueing daily sync:`, error);
  }
});

// Refresh leader status every minute
cron.schedule('* * * * *', async () => {
  const isLeader = await tryBecomeLeader();
  if (isLeader) {
    console.log(`[${INSTANCE_ID}] Leader status refreshed`);
  }
});

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${config.nodeEnv}`);
  console.log(`🔗 API URL: ${config.urls.api}`);
  console.log(`🆔 Instance ID: ${INSTANCE_ID}`);
});

export default app;
