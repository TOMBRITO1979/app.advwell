import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { appLogger } from './logger';
import crypto from 'crypto';

// Sanitiza email para usar como nome de pasta no S3 (mantido para retrocompatibilidade)
// Remove caracteres especiais e substitui @ por -at-
export const sanitizeEmailForS3 = (email: string): string => {
  return email
    .toLowerCase()
    .replace(/@/g, '-at-')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// Upload usando companyId (novo formato recomendado)
export const uploadToS3 = async (
  file: Express.Multer.File,
  companyId: string
): Promise<{ key: string; url: string }> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  // Novo formato: companies/{companyId}/documents/{uuid}.{ext}
  const key = `companies/${companyId}/documents/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // AUDITORIA: Server-Side Encryption para proteção de dados em repouso
    ServerSideEncryption: 'AES256',
  });

  await s3Client.send(command);

  const url = `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return { key, url };
};

// Deletar arquivo do S3
export const deleteFromS3 = async (key: string): Promise<boolean> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3BucketName,
      Key: key,
    });

    await s3Client.send(command);
    appLogger.info('Arquivo deletado do S3', { key });
    return true;
  } catch (error) {
    appLogger.error('Erro ao deletar arquivo do S3', error as Error, { key });
    return false;
  }
};

export const getSignedS3Url = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const getSignedS3DownloadUrl = async (key: string, filename: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
