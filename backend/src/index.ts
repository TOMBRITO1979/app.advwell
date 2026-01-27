import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { config } from './config';
import routes from './routes';
import { correlationIdMiddleware, requestLoggerMiddleware } from './middleware/request-logger';
import cron from 'node-cron';
import prisma from './utils/prisma';
import { redis, cache } from './utils/redis';
import { enqueueDailySync, getQueueStats } from './queues/sync.queue';
import { enqueueDailyMonitoring } from './queues/monitoring.queue';
import { getEmailQueueStats } from './queues/email.queue';
import { getWhatsAppQueueStats } from './queues/whatsapp.queue';
import { getCsvImportQueueStats } from './queues/csv-import.queue';
import crypto from 'crypto';
import backupEmailService from './services/backup-email.service';
import databaseBackupService from './services/database-backup.service';
import auditCleanupService from './services/audit-cleanup.service';
import { processAppointmentReminders } from './jobs/appointment-reminder.job';
import { processDocumentRequestReminders } from './jobs/document-request-reminder.job';
import { processAccountsPayableReminders } from './jobs/accounts-payable-reminder.job';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { csrfProtection, getCsrfToken } from './middleware/csrf';
import { appLogger } from './utils/logger';

// ============================================
// TAREFA 3.3: Global Exception Handlers
// Captura exceções não tratadas para evitar crashes silenciosos
// ============================================

// Handler para exceções síncronas não capturadas
process.on('uncaughtException', (error: Error) => {
  appLogger.error('UNCAUGHT EXCEPTION - Shutting down...', error, {
    type: 'uncaughtException',
    fatal: true,
  });

  // Dar tempo para logs serem escritos antes de encerrar
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handler para promessas rejeitadas sem catch
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));

  appLogger.error('UNHANDLED REJECTION', error, {
    type: 'unhandledRejection',
    promise: String(promise),
  });

  // Em produção, encerrar o processo para evitar estado inconsistente
  // O orquestrador (Docker Swarm) irá reiniciar o container
  if (config.nodeEnv === 'production') {
    appLogger.warn('Scheduling shutdown due to unhandled rejection in production');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

// Handler para sinais de encerramento (graceful shutdown)
const gracefulShutdown = async (signal: string) => {
  appLogger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Fechar conexões Redis
    await redis.quit();
    appLogger.info('Redis connection closed');

    // Desconectar Prisma
    await prisma.$disconnect();
    appLogger.info('Database connection closed');

    appLogger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    appLogger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================

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
    appLogger.error('CRITICAL SECURITY ERRORS', undefined, { errors });
    if (!isDevelopment) {
      appLogger.error('Server startup blocked due to security configuration errors');
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    appLogger.warn('Security warnings detected', { warnings });
  }

  if (errors.length === 0 && warnings.length === 0) {
    appLogger.info('Security configuration validated');
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
app.set('trust proxy', true);

// Helper para extrair IP real do cliente (atrás de Traefik)
const getClientIp = (req: express.Request): string => {
  // X-Real-IP é setado pelo Traefik
  const realIp = req.headers['x-real-ip'] as string;
  if (realIp) return realIp;

  // X-Forwarded-For pode ter múltiplos IPs: client, proxy1, proxy2
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0]; // Primeiro IP é o cliente real
  }

  return req.ip || '0.0.0.0';
};

// CORS deve vir antes do helmet
// Em produção, permite frontend, portal e qualquer subdomain *.advwell.pro
const allowedOriginsStatic = config.nodeEnv === 'production'
  ? [config.urls.frontend, config.urls.portal]
  : [config.urls.frontend, config.urls.portal, 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: curl, postman, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Verifica se é uma origem estática permitida
    if (allowedOriginsStatic.includes(origin)) {
      return callback(null, true);
    }

    // Verifica se é um subdomain válido de advwell.pro (para portal de clientes)
    // Padrão: https://{subdomain}.advwell.pro
    const subdomainPattern = /^https:\/\/[a-z0-9-]+\.advwell\.pro$/;
    if (subdomainPattern.test(origin)) {
      return callback(null, true);
    }

    // Em desenvolvimento, permite localhost
    if (config.nodeEnv !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }

    // Origem não permitida
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-csrf-token'],
}));

// Cookie parser (necessario para CSRF Double Submit Cookie)
app.use(cookieParser());

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
  max: 500, // Ajustado para 500 requisições por 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.', retry_after: 15 * 60 },
  keyGenerator: getClientIp, // Usa IP real do cliente
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
  keyGenerator: getClientIp, // Usa IP real do cliente
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
  keyGenerator: getClientIp, // Usa IP real do cliente
  store: createRedisStore('password-reset'),
});
app.use('/api/auth/forgot-password', passwordResetLimiter);

// Stripe webhook - DEVE vir ANTES do express.json() para receber raw body
// O webhook está em /api/subscription/webhook, configurado em subscription.routes.ts
// com express.raw() inline. Usamos um middleware condicional para pular o json parser.
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

// Body parser com limite de tamanho (exceto para webhook que já foi tratado acima)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// TAREFA 12: CSRF Protection
// Valida Origin/Referer + Double Submit Cookie para operacoes de escrita
app.use(csrfProtection);

// Endpoint para obter token CSRF (SPAs devem chamar antes de operacoes de escrita)
app.get('/api/csrf-token', getCsrfToken);

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

  // 3.2 WhatsApp queue stats
  try {
    const whatsappQueueStats = await getWhatsAppQueueStats();
    health.checks.whatsappQueue = {
      status: 'operational',
      ...whatsappQueueStats
    };
  } catch (error) {
    health.checks.whatsappQueue = {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 3.3 CSV Import queue stats
  try {
    const csvImportQueueStats = await getCsvImportQueueStats();
    health.checks.csvImportQueue = {
      status: 'operational',
      ...csvImportQueueStats
    };
  } catch (error) {
    health.checks.csvImportQueue = {
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

// TAREFA 3.1: Error handlers centralizados
app.use(notFoundHandler);
app.use(errorHandler);

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
    appLogger.error('Leader election error', error as Error);
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

// TAREFA 4.2: Flag para desabilitar cron jobs (util para workers dedicados)
const CRON_ENABLED = process.env.ENABLE_CRON !== 'false';

// Timezone fixo para São Paulo - todos os cron jobs rodam neste timezone
const CRON_TIMEZONE = 'America/Sao_Paulo';

if (!CRON_ENABLED) {
  appLogger.info('Cron jobs DISABLED via ENABLE_CRON=false', { instanceId: INSTANCE_ID });
}

// Cron job para sincronizar processos via DataJud - às 20:00 (São Paulo)
// Executa uma vez ao dia para buscar atualizações no CNJ
CRON_ENABLED && cron.schedule('0 20 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping daily sync', { instanceId: INSTANCE_ID });
    return;
  }

  // SEGURANCA: Validar lideranca antes de executar
  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting sync', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting daily sync via queue', { instanceId: INSTANCE_ID, fencingToken });

  try {
    await enqueueDailySync();
    appLogger.info('Daily sync jobs enqueued successfully', { instanceId: INSTANCE_ID });
  } catch (error) {
    appLogger.error('Error enqueueing daily sync', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Cron job para monitoramento de OAB via ADVAPI - às 02:00 (São Paulo)
// ADVAPI responde 24h, rodamos de madrugada para distribuir carga
CRON_ENABLED && cron.schedule('0 2 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping OAB monitoring', { instanceId: INSTANCE_ID });
    return;
  }

  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting OAB monitoring', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting daily OAB monitoring', { instanceId: INSTANCE_ID, fencingToken });

  try {
    await enqueueDailyMonitoring();
    appLogger.info('Daily OAB monitoring jobs enqueued successfully', { instanceId: INSTANCE_ID });
  } catch (error) {
    appLogger.error('Error enqueueing OAB monitoring', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Cron job para enviar backup por email - às 12h e 18h (São Paulo)
CRON_ENABLED && cron.schedule('0 12,18 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping backup email', { instanceId: INSTANCE_ID });
    return;
  }

  // Validar lideranca antes de executar
  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting backup email', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting backup email job', { instanceId: INSTANCE_ID, fencingToken });

  try {
    await backupEmailService.sendBackupToAllCompanies();
    appLogger.info('Backup email job completed', { instanceId: INSTANCE_ID });
  } catch (error) {
    appLogger.error('Error in backup email job', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Cron job para backup do banco de dados - às 03:00 São Paulo (após sync diário às 02:00)
CRON_ENABLED && cron.schedule('0 3 * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping database backup', { instanceId: INSTANCE_ID });
    return;
  }

  // Validar lideranca antes de executar
  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting database backup', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting database backup job', { instanceId: INSTANCE_ID, fencingToken });

  try {
    await databaseBackupService.runDailyBackup();
    appLogger.info('Database backup job completed', { instanceId: INSTANCE_ID });
  } catch (error) {
    appLogger.error('Error in database backup job', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// AUDITORIA: Limpeza semanal de logs de auditoria (Domingos 04:00 AM São Paulo)
// Remove logs com mais de 365 dias para conformidade LGPD e performance
CRON_ENABLED && cron.schedule('0 4 * * 0', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping audit cleanup', { instanceId: INSTANCE_ID });
    return;
  }

  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting audit cleanup', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting audit log cleanup', { instanceId: INSTANCE_ID, fencingToken });

  try {
    const result = await auditCleanupService.cleanupOldLogs();
    appLogger.info('Audit cleanup completed', { instanceId: INSTANCE_ID, deletedCount: result.deletedCount });
  } catch (error) {
    appLogger.error('Error in audit cleanup', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// WHATSAPP: Lembretes automáticos de consulta - a cada hora
// Verifica eventos das próximas 24h e envia lembretes via WhatsApp
CRON_ENABLED && cron.schedule('0 * * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping appointment reminders', { instanceId: INSTANCE_ID });
    return;
  }

  if (!await validateLeadership()) {
    appLogger.warn('Leadership validation failed, aborting appointment reminders', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting appointment reminder job', { instanceId: INSTANCE_ID, fencingToken });

  try {
    const result = await processAppointmentReminders();
    appLogger.info('Appointment reminder job completed', {
      instanceId: INSTANCE_ID,
      processed: result.processed,
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    appLogger.error('Error in appointment reminder job', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Document request reminders - runs every hour
CRON_ENABLED && cron.schedule('0 * * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping document request reminders', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting document request reminder job', { instanceId: INSTANCE_ID, fencingToken });

  try {
    const result = await processDocumentRequestReminders();
    appLogger.info('Document request reminder job completed', {
      instanceId: INSTANCE_ID,
      processed: result.processed,
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    appLogger.error('Error in document request reminder job', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Accounts payable reminders - runs every hour
CRON_ENABLED && cron.schedule('0 * * * *', async () => {
  const { isLeader, fencingToken } = await tryBecomeLeader();

  if (!isLeader) {
    appLogger.debug('Not leader, skipping accounts payable reminders', { instanceId: INSTANCE_ID });
    return;
  }

  appLogger.info('Starting accounts payable reminder job', { instanceId: INSTANCE_ID, fencingToken });

  try {
    const result = await processAccountsPayableReminders();
    appLogger.info('Accounts payable reminder job completed', {
      instanceId: INSTANCE_ID,
      processed: result.processed,
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    appLogger.error('Error in accounts payable reminder job', error as Error, { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Refresh leader status every minute
CRON_ENABLED && cron.schedule('* * * * *', async () => {
  const { isLeader } = await tryBecomeLeader();
  if (isLeader) {
    appLogger.debug('Leader status refreshed', { instanceId: INSTANCE_ID });
  }
}, { timezone: CRON_TIMEZONE });

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  appLogger.info('Server started', {
    port: PORT,
    environment: config.nodeEnv,
    apiUrl: config.urls.api,
    instanceId: INSTANCE_ID,
  });
});

export default app;
