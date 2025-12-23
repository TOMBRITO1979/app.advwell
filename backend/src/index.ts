import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { config } from './config';
import routes from './routes';
import { correlationIdMiddleware, requestLoggerMiddleware } from './middleware/request-logger';
// Temporariamente desabilitado - aguardando schema Prisma
// import stripeWebhookRoutes from './routes/stripe-webhook.routes';
import cron from 'node-cron';
import prisma from './utils/prisma';
import { redis, cache } from './utils/redis';
import { enqueueDailySync, getQueueStats } from './queues/sync.queue';
import { getEmailQueueStats } from './queues/email.queue';
import crypto from 'crypto';
import backupEmailService from './services/backup-email.service';
import databaseBackupService from './services/database-backup.service';

// SEGURANCA: Redis store para rate limiting distribuido (compartilhado entre replicas)
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:${prefix}:`,
});

// SEGURANCA: Lista de padroes conhecidos/fracos que devem ser rejeitados
const KNOWN_WEAK_PATTERNS = [
  'default', 'change', 'test', 'example', 'sample',
  'advwell', 'secret123', 'password', 'development',
];

// Security validation at startup
function validateSecurityConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];
  const isDevelopment = config.nodeEnv === 'development';

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  } else {
    // Verificar padroes fracos
    const lowerSecret = jwtSecret.toLowerCase();
    for (const pattern of KNOWN_WEAK_PATTERNS) {
      if (lowerSecret.includes(pattern)) {
        if (!isDevelopment) {
          errors.push(`JWT_SECRET contains known weak pattern: ${pattern}`);
        } else {
          warnings.push(`JWT_SECRET contains weak pattern: ${pattern}`);
        }
        break;
      }
    }
  }

  // Check ENCRYPTION_KEY (validacao detalhada feita em encryption.ts)
  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  if (!encryptionKey || encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters');
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL && !isDevelopment) {
    errors.push('DATABASE_URL must be set in staging/production');
  }

  // Check REDIS (aviso se nao configurado)
  if (!process.env.REDIS_HOST && !isDevelopment) {
    warnings.push('REDIS_HOST not set - using default "redis"');
  }

  // Log results
  if (errors.length > 0) {
    console.error('❌ CRITICAL SECURITY ERRORS:');
    errors.forEach(e => console.error(`   - ${e}`));
    if (!isDevelopment) {
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
// Em produção, apenas o frontend configurado é permitido
const allowedOrigins = config.nodeEnv === 'production'
  ? [config.urls.frontend]
  : [config.urls.frontend, 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
}));

// Correlation ID e Request Logging (deve vir antes de outros middlewares)
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

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
  // SEGURANCA: Content-Security-Policy para prevenir XSS
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Permite estilos inline para emails
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Previne clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [], // Forca HTTPS
    },
  },
  // SEGURANCA: Previne clickjacking
  frameguard: { action: 'deny' },
}));

// Rate limiting global (ajustado para segurança)
// SEGURANCA: Usa Redis store para compartilhar contadores entre replicas
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Ajustado de 500 para 200 (mais seguro contra DDoS)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.', retry_after: 15 * 60 },
  validate: {
    trustProxy: true, // FIXED: App is behind Traefik, must trust proxy headers
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  store: createRedisStore('global'),
});
app.use('/api/', globalLimiter);

// Rate limit mais restritivo para auth (previne brute force)
// SEGURANCA: Usa Redis store - limite compartilhado entre todas as replicas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  validate: {
    trustProxy: true, // FIXED: App is behind Traefik
  },
  store: createRedisStore('auth'),
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate limit para password reset (previne email bombing)
// SEGURANCA: Usa Redis store - limite compartilhado entre todas as replicas
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora
  message: { error: 'Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.' },
  validate: {
    trustProxy: true,
  },
  store: createRedisStore('password-reset'),
});
app.use('/api/auth/forgot-password', passwordResetLimiter);

// Stripe webhook (must be BEFORE express.json() to receive raw body)
// app.use('/api/stripe-webhook', stripeWebhookRoutes);

// Body parser com limite de tamanho
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rotas
app.use('/api', routes);

// SEGURANCA: Health check simplificado (publico) - nao expoe info sensivel
app.get('/health', async (req, res) => {
  let status = 'healthy';

  // Verificar apenas conectividade basica
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    status = 'unhealthy';
  }

  try {
    await redis.ping();
  } catch {
    if (status === 'healthy') status = 'degraded';
  }

  const httpStatus = status === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
  });
});

// SEGURANCA: Health check detalhado (protegido por header ou IP interno)
app.get('/health/detailed', async (req, res) => {
  // Verificar autorizacao: header X-Health-Key ou IP interno
  const healthKey = process.env.HEALTH_CHECK_KEY;
  const requestKey = req.headers['x-health-key'];
  const clientIp = req.ip || req.socket.remoteAddress || '';

  // IPs internos permitidos (Docker, localhost, redes privadas)
  const isInternalIp = clientIp === '127.0.0.1' ||
                       clientIp === '::1' ||
                       clientIp.startsWith('10.') ||
                       clientIp.startsWith('172.') ||
                       clientIp.startsWith('192.168.');

  // Permitir se: tem chave correta OU e IP interno OU nao ha chave configurada (dev)
  if (healthKey && requestKey !== healthKey && !isInternalIp) {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

  // 3. Queue stats (sync queue)
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

  // 3.1 Email queue stats
  try {
    const emailQueueStats = await getEmailQueueStats();
    health.checks.emailQueue = {
      status: 'operational',
      ...emailQueueStats
    };
  } catch (error) {
    health.checks.emailQueue = {
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

  // 5. System info (apenas em dev ou com autorizacao)
  if (config.nodeEnv === 'development' || requestKey === healthKey) {
    health.system = {
      nodeVersion: process.version,
      platform: process.platform,
      environment: config.nodeEnv
    };
  }

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

// Global Error Handler - deve ser o último middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Import logger (evita circular dependency)
  const logger = require('./utils/logger').default;

  // Log estruturado com correlation ID
  logger.error('Unhandled error', {
    category: 'error',
    event: 'unhandled_exception',
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    instanceId: INSTANCE_ID,
    userId: (req as any).user?.userId,
    companyId: (req as any).user?.companyId,
  });

  // Não expor detalhes do erro em produção
  const statusCode = (err as any).statusCode || 500;
  const message = config.nodeEnv === 'production'
    ? 'Erro interno do servidor'
    : err.message;

  res.status(statusCode).json({
    error: message,
    correlationId: req.correlationId, // Para referência em suporte
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// SEGURANCA: Leader election com fencing token para evitar split-brain
const CRON_FENCING_KEY = 'advwell:cron:fencing';
let currentFencingToken: number | null = null;

async function tryBecomeLeader(): Promise<{ isLeader: boolean; fencingToken: number | null }> {
  try {
    // Gerar fencing token unico baseado em timestamp
    const newFencingToken = Date.now();

    // Try to set leader key with NX (only if not exists)
    const result = await redis.set(CRON_LEADER_KEY, INSTANCE_ID, 'EX', CRON_LEADER_TTL, 'NX');
    if (result === 'OK') {
      // Novo lider: definir fencing token
      await redis.set(CRON_FENCING_KEY, newFencingToken.toString(), 'EX', CRON_LEADER_TTL);
      currentFencingToken = newFencingToken;
      return { isLeader: true, fencingToken: newFencingToken };
    }

    // Check if we're already the leader
    const currentLeader = await redis.get(CRON_LEADER_KEY);
    if (currentLeader === INSTANCE_ID) {
      // Refresh TTL e manter fencing token
      await redis.expire(CRON_LEADER_KEY, CRON_LEADER_TTL);
      await redis.expire(CRON_FENCING_KEY, CRON_LEADER_TTL);
      return { isLeader: true, fencingToken: currentFencingToken };
    }

    currentFencingToken = null;
    return { isLeader: false, fencingToken: null };
  } catch (error) {
    console.error('Leader election error:', error);
    currentFencingToken = null;
    return { isLeader: false, fencingToken: null };
  }
}

// SEGURANCA: Verificar se ainda somos o lider valido antes de executar job
async function validateLeadership(): Promise<boolean> {
  if (!currentFencingToken) return false;

  try {
    const storedToken = await redis.get(CRON_FENCING_KEY);
    const storedLeader = await redis.get(CRON_LEADER_KEY);

    // Validar que somos o lider E nosso fencing token e o atual
    return storedLeader === INSTANCE_ID &&
           storedToken === currentFencingToken.toString();
  } catch {
    return false;
  }
}

// Cron job para sincronizar processos - agora usa filas
// Executa às 2h da manhã, mas apenas no líder
cron.schedule('0 2 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    console.log(`[${INSTANCE_ID}] Not leader, skipping daily sync`);
    return;
  }

  // SEGURANCA: Validar lideranca antes de executar
  if (!await validateLeadership()) {
    console.warn(`[${INSTANCE_ID}] Leadership validation failed, aborting sync`);
    return;
  }

  console.log(`[${INSTANCE_ID}] Leader (token=${fencingToken}): Starting daily sync via queue...`);

  try {
    await enqueueDailySync();
    console.log(`[${INSTANCE_ID}] Daily sync jobs enqueued successfully`);
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Error enqueueing daily sync:`, error);
  }
});

// Cron job para enviar backup por email - às 12h e 18h
cron.schedule('0 12,18 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    console.log(`[${INSTANCE_ID}] Not leader, skipping backup email`);
    return;
  }

  // Validar lideranca antes de executar
  if (!await validateLeadership()) {
    console.warn(`[${INSTANCE_ID}] Leadership validation failed, aborting backup email`);
    return;
  }

  console.log(`[${INSTANCE_ID}] Leader (token=${fencingToken}): Starting backup email job...`);

  try {
    await backupEmailService.sendBackupToAllCompanies();
    console.log(`[${INSTANCE_ID}] Backup email job completed`);
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Error in backup email job:`, error);
  }
});

// Cron job para backup do banco de dados - às 03:00 (após sync diário às 02:00)
cron.schedule('0 3 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    console.log(`[${INSTANCE_ID}] Not leader, skipping database backup`);
    return;
  }

  // Validar lideranca antes de executar
  if (!await validateLeadership()) {
    console.warn(`[${INSTANCE_ID}] Leadership validation failed, aborting database backup`);
    return;
  }

  console.log(`[${INSTANCE_ID}] Leader (token=${fencingToken}): Starting database backup job...`);

  try {
    await databaseBackupService.runDailyBackup();
    console.log(`[${INSTANCE_ID}] Database backup job completed`);
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Error in database backup job:`, error);
  }
});

// Refresh leader status every minute
cron.schedule('* * * * *', async () => {
  const { isLeader } = await tryBecomeLeader();
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
