import PDFDocument from 'pdfkit';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './s3';
import { config } from '../config';
import { appLogger } from './logger';

export const convertToPdf = async (fileKey: string, fileName: string): Promise<Buffer> => {
  appLogger.info('[convertToPdf] Iniciando conversão', { fileName, fileKey });

  // Get file from S3
  const command = new GetObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: fileKey,
  });

  const response = await s3Client.send(command);
  const fileBuffer = await streamToBuffer(response.Body as any);

  appLogger.info('[convertToPdf] Arquivo baixado do S3', { size: fileBuffer.length });

  // Detect file type from extension (use fileKey, not fileName, as fileName may not have extension)
  const extension = fileKey.split('.').pop()?.toLowerCase();
  appLogger.info('[convertToPdf] Extensão detectada', { extension, fileKey });

  // If already PDF, return as is
  if (extension === 'pdf') {
    appLogger.info('[convertToPdf] Arquivo já é PDF, retornando original', { size: fileBuffer.length });
    return fileBuffer;
  }

  // Convert images to PDF
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
    appLogger.info('[convertToPdf] Arquivo é imagem, convertendo para PDF', { extension });
    const pdfBuffer = await imageToPdf(fileBuffer, fileName);
    appLogger.info('[convertToPdf] Conversão concluída', {
      originalSize: fileBuffer.length,
      pdfSize: pdfBuffer.length
    });
    return pdfBuffer;
  }

  // For other formats, return original for now
  appLogger.warn('[convertToPdf] Extensão não suportada, retornando arquivo original', { extension });
  return fileBuffer;
};

const streamToBuffer = async (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const imageToPdf = async (imageBuffer: Buffer, fileName: string): Promise<Buffer> => {
  appLogger.info('[imageToPdf] INÍCIO', { fileName, bufferSize: imageBuffer.length });

  return new Promise((resolve, reject) => {
    try {
      appLogger.info('[imageToPdf] Criando PDFDocument');

      const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: true,
        bufferPages: true,
      });

      appLogger.info('[imageToPdf] PDFDocument criado com sucesso');

      const chunks: Buffer[] = [];
      let chunkCount = 0;

      doc.on('data', (chunk: Buffer) => {
        chunkCount++;
        chunks.push(chunk);
        appLogger.info('[imageToPdf] Chunk recebido', { chunkNumber: chunkCount, chunkSize: chunk.length });
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        appLogger.info('[imageToPdf] PDF FINALIZADO', {
          totalChunks: chunkCount,
          finalBufferSize: pdfBuffer.length
        });
        appLogger.info('[imageToPdf] RESOLVENDO PROMISE', { bufferSize: pdfBuffer.length });
        resolve(pdfBuffer);
      });

      doc.on('error', (error) => {
        appLogger.error('[imageToPdf] ERRO no PDFDocument', error as Error);
        reject(error);
      });

      // Add image to PDF - centered and fit to page
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const margin = 50;

      appLogger.info('[imageToPdf] Adicionando imagem ao PDF', { imageSize: imageBuffer.length });
      appLogger.info('[imageToPdf] Configuração de página A4', {
        pageWidth,
        pageHeight,
        margin
      });

      doc.image(imageBuffer, margin, margin, {
        fit: [pageWidth - 2 * margin, pageHeight - 2 * margin],
        align: 'center',
        valign: 'center',
      });

      appLogger.info('[imageToPdf] Imagem adicionada com sucesso, finalizando documento');

      // Finalize PDF
      doc.end();

      appLogger.info('[imageToPdf] doc.end() chamado, aguardando evento end');
    } catch (error) {
      appLogger.error('[imageToPdf] ERRO CAPTURADO no try-catch', error as Error);
      reject(error);
    }
  });
};
