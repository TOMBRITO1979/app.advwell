import PDFDocument from 'pdfkit';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './s3';
import { config } from '../config';

export const convertToPdf = async (fileKey: string, fileName: string): Promise<Buffer> => {
  console.log(`🔍 [convertToPdf] Iniciando conversão - fileName: ${fileName}, fileKey: ${fileKey}`);

  // Get file from S3
  const command = new GetObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: fileKey,
  });

  const response = await s3Client.send(command);
  const fileBuffer = await streamToBuffer(response.Body as any);

  console.log(`📦 [convertToPdf] Arquivo baixado do S3 - Tamanho: ${fileBuffer.length} bytes`);

  // Detect file type from extension (use fileKey, not fileName, as fileName may not have extension)
  const extension = fileKey.split('.').pop()?.toLowerCase();
  console.log(`🔎 [convertToPdf] Extensão detectada: "${extension}" (de fileKey: ${fileKey})`);

  // If already PDF, return as is
  if (extension === 'pdf') {
    console.log(`✅ [convertToPdf] Arquivo já é PDF, retornando original (${fileBuffer.length} bytes)`);
    return fileBuffer;
  }

  // Convert images to PDF
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
    console.log(`🖼️  [convertToPdf] Arquivo é imagem (${extension}), convertendo para PDF...`);
    const pdfBuffer = await imageToPdf(fileBuffer, fileName);
    console.log(`✅ [convertToPdf] Conversão concluída - Buffer original: ${fileBuffer.length} bytes → Buffer PDF: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  }

  // For other formats, return original for now
  console.log(`⚠️  [convertToPdf] Extensão não suportada (${extension}), retornando arquivo original`);
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
  console.log(`📝 [imageToPdf] INÍCIO - fileName: ${fileName}, imageBuffer: ${imageBuffer.length} bytes`);

  return new Promise((resolve, reject) => {
    try {
      console.log(`🔧 [imageToPdf] Criando PDFDocument...`);

      const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: true,
        bufferPages: true,
      });

      console.log(`✅ [imageToPdf] PDFDocument criado com sucesso`);

      const chunks: Buffer[] = [];
      let chunkCount = 0;

      doc.on('data', (chunk: Buffer) => {
        chunkCount++;
        chunks.push(chunk);
        console.log(`📦 [imageToPdf] Chunk ${chunkCount} recebido - Tamanho: ${chunk.length} bytes`);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`✅ [imageToPdf] PDF FINALIZADO - Total de chunks: ${chunkCount}, Buffer final: ${pdfBuffer.length} bytes`);
        console.log(`🎉 [imageToPdf] RESOLVENDO PROMISE com buffer de ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });

      doc.on('error', (error) => {
        console.error(`❌ [imageToPdf] ERRO no PDFDocument:`, error);
        reject(error);
      });

      // Add image to PDF - centered and fit to page
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const margin = 50;

      console.log(`🖼️  [imageToPdf] Adicionando imagem ao PDF - Tamanho da imagem: ${imageBuffer.length} bytes`);
      console.log(`📐 [imageToPdf] Página A4: ${pageWidth}x${pageHeight} pts, Margem: ${margin} pts`);

      doc.image(imageBuffer, margin, margin, {
        fit: [pageWidth - 2 * margin, pageHeight - 2 * margin],
        align: 'center',
        valign: 'center',
      });

      console.log(`✅ [imageToPdf] Imagem adicionada com sucesso, finalizando documento...`);

      // Finalize PDF
      doc.end();

      console.log(`🔄 [imageToPdf] doc.end() chamado, aguardando evento 'end'...`);
    } catch (error) {
      console.error(`❌ [imageToPdf] ERRO CAPTURADO no try-catch:`, error);
      reject(error);
    }
  });
};
