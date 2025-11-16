import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import crypto from 'crypto';

// Sanitiza email para usar como nome de pasta no S3
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

export const uploadToS3 = async (
  file: Express.Multer.File,
  adminEmail: string
): Promise<{ key: string; url: string }> => {
  // Sanitiza o email para criar pasta segura
  const sanitizedEmail = sanitizeEmailForS3(adminEmail);

  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const key = `${sanitizedEmail}/documents/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return { key, url };
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
