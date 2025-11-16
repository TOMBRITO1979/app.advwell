import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-this',
    expiresIn: '7d',
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/advtom',
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
