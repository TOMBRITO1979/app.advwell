import dotenv from 'dotenv';

dotenv.config();

// SEGURANCA: Validar variaveis criticas antes de exportar config
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv === 'development';

// SEGURANCA: DATABASE_URL obrigatoria em staging/production
if (!process.env.DATABASE_URL && !isDevelopment) {
  console.error('❌ FATAL: DATABASE_URL must be set in staging/production');
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv,

  jwt: {
    secret: process.env.JWT_SECRET || '', // Validated at startup in index.ts
    expiresIn: '15m', // Access token: 15 minutos
    refreshExpiresIn: '7d', // Refresh token: 7 dias
  },

  database: {
    // SEGURANCA: Default so permitido em development
    url: process.env.DATABASE_URL || (isDevelopment ? 'postgresql://postgres:postgres@localhost:5432/advtom' : ''),
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'AdvTom <noreply@advtom.com>',
  },

  urls: {
    api: process.env.API_URL || 'http://localhost:3000',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  datajud: {
    apiKey: process.env.DATAJUD_API_KEY || '',
    baseUrl: 'https://api-publica.datajud.cnj.jus.br',
  },
};
