import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { uploadBufferToS3, getSignedS3Url, deleteFromS3 } from '../utils/s3';
import { appLogger } from '../utils/logger';
import * as pdfStyles from '../utils/pdfStyles';
import { canUploadFile, invalidateStorageCache } from '../services/storage.service';

/**
 * Controller para documentos compartilhados entre escritório e cliente
 * Usado pelo admin/advogado para gerenciar documentos do cliente
 */
export class SharedDocumentController {
  /**
   * Lista documentos compartilhados de um cliente
   * GET /api/clients/:clientId/shared-documents
   */
  async listByClient(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const documents = await prisma.sharedDocument.findMany({
        where: { clientId, companyId },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { sharedAt: 'desc' },
      });

      // Gerar URLs assinadas para download
      const documentsWithUrls = await Promise.all(
        documents.map(async (doc: typeof documents[0]) => {
          const signedFileUrl = await getSignedS3Url(doc.fileKey);
          const signedSignatureUrl = doc.signatureKey
            ? await getSignedS3Url(doc.signatureKey)
            : null;

          return {
            ...doc,
            fileUrl: signedFileUrl,
            signatureUrl: signedSignatureUrl,
          };
        })
      );

      res.json(documentsWithUrls);
    } catch (error) {
      appLogger.error('Erro ao listar documentos compartilhados', error as Error);
      res.status(500).json({ error: 'Erro ao listar documentos compartilhados' });
    }
  }

  /**
   * Compartilhar documento com cliente (upload)
   * POST /api/clients/:clientId/shared-documents
   */
  async share(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const { name, description, requiresSignature = false, allowDownload = true } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!name) {
        return res.status(400).json({ error: 'Nome do documento é obrigatório' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verificar limite de armazenamento antes do upload
      const storageCheck = await canUploadFile(companyId, req.file.size);
      if (!storageCheck.allowed) {
        appLogger.warn('Upload bloqueado - limite de armazenamento excedido', {
          companyId,
          fileSize: req.file.size,
        });
        return res.status(413).json({
          error: 'Limite de armazenamento excedido',
          message: storageCheck.message,
        });
      }

      // Upload para S3 (path unificado com Document)
      const fileKey = `companies/${companyId}/clients/${clientId}/documents/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await uploadBufferToS3(req.file.buffer, fileKey, req.file.mimetype);

      // Criar registro no banco
      const document = await prisma.sharedDocument.create({
        data: {
          companyId,
          clientId,
          name,
          description: description || null,
          fileUrl,
          fileKey,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          sharedByUserId: userId,
          requiresSignature: requiresSignature === true || requiresSignature === 'true',
          allowDownload: allowDownload !== false && allowDownload !== 'false',
          status: 'PENDING',
        },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      appLogger.info('Documento compartilhado com cliente', {
        documentId: document.id,
        clientId,
        companyId,
        userId,
      });

      // Retornar com URL assinada
      const signedFileUrl = await getSignedS3Url(document.fileKey);

      res.status(201).json({
        ...document,
        fileUrl: signedFileUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao compartilhar documento', error as Error);
      res.status(500).json({ error: 'Erro ao compartilhar documento' });
    }
  }

  /**
   * Buscar documento por ID
   * GET /api/shared-documents/:id
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const document = await prisma.sharedDocument.findFirst({
        where: { id, companyId },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Gerar URLs assinadas
      const signedFileUrl = await getSignedS3Url(document.fileKey);
      const signedSignatureUrl = document.signatureKey
        ? await getSignedS3Url(document.signatureKey)
        : null;

      res.json({
        ...document,
        fileUrl: signedFileUrl,
        signatureUrl: signedSignatureUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar documento compartilhado', error as Error);
      res.status(500).json({ error: 'Erro ao buscar documento' });
    }
  }

  /**
   * Excluir documento compartilhado
   * DELETE /api/shared-documents/:id
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const document = await prisma.sharedDocument.findFirst({
        where: { id, companyId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Deletar arquivo do S3
      try {
        await deleteFromS3(document.fileKey);
        if (document.signatureKey) {
          await deleteFromS3(document.signatureKey);
        }
      } catch (s3Error) {
        appLogger.warn('Erro ao deletar arquivo do S3', { error: s3Error, fileKey: document.fileKey });
      }

      // Deletar do banco
      await prisma.sharedDocument.delete({
        where: { id },
      });

      appLogger.info('Documento compartilhado excluído', {
        documentId: id,
        companyId,
      });

      res.json({ message: 'Documento excluído com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir documento compartilhado', error as Error);
      res.status(500).json({ error: 'Erro ao excluir documento' });
    }
  }

  /**
   * Compartilhar documento existente (da aba Documentos) com cliente
   * POST /api/clients/:clientId/shared-documents/from-existing
   */
  async shareFromExisting(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const { documentId, name, description, requiresSignature = false, allowDownload = true } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!documentId) {
        return res.status(400).json({ error: 'ID do documento é obrigatório' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Buscar o documento existente
      const existingDoc = await prisma.document.findFirst({
        where: { id: documentId, companyId },
      });

      if (!existingDoc) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      if (!existingDoc.fileKey || !existingDoc.fileUrl) {
        return res.status(400).json({ error: 'Este documento não possui arquivo para compartilhar' });
      }

      // Criar registro de documento compartilhado referenciando o mesmo arquivo
      const document = await prisma.sharedDocument.create({
        data: {
          companyId,
          clientId,
          name: name || existingDoc.name,
          description: description || existingDoc.description,
          fileUrl: existingDoc.fileUrl,
          fileKey: existingDoc.fileKey,
          fileSize: existingDoc.fileSize || 0,
          fileType: existingDoc.fileType || 'application/octet-stream',
          sharedByUserId: userId,
          requiresSignature: requiresSignature === true || requiresSignature === 'true',
          allowDownload: allowDownload !== false && allowDownload !== 'false',
          status: 'PENDING',
        },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      appLogger.info('Documento existente compartilhado com cliente', {
        documentId: document.id,
        sourceDocumentId: documentId,
        clientId,
        companyId,
        userId,
      });

      // Retornar com URL assinada
      const signedFileUrl = await getSignedS3Url(document.fileKey);

      res.status(201).json({
        ...document,
        fileUrl: signedFileUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao compartilhar documento existente', error as Error);
      res.status(500).json({ error: 'Erro ao compartilhar documento' });
    }
  }

  /**
   * Compartilhar documento jurídico (LegalDocument) com cliente - gera PDF
   * POST /api/clients/:clientId/shared-documents/from-legal
   */
  async shareFromLegal(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const { legalDocumentId, name, description, requiresSignature = false, allowDownload = true } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!legalDocumentId) {
        return res.status(400).json({ error: 'ID do documento jurídico é obrigatório' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Buscar o documento jurídico
      const legalDoc = await prisma.legalDocument.findFirst({
        where: { id: legalDocumentId, companyId },
        include: {
          client: true,
          signer: true,
          company: {
            select: {
              name: true,
              cnpj: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
      });

      if (!legalDoc) {
        return res.status(404).json({ error: 'Documento jurídico não encontrado' });
      }

      // Gerar PDF em buffer
      const PDFDocument = require('pdfkit');
      const pdfDoc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4',
      });

      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

      const pdfPromise = new Promise<Buffer>((resolve, reject) => {
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
      });

      // Dimensões da página A4
      const pageWidth = 595.28;
      const margin = 50;

      // Header da empresa
      if (legalDoc.company) {
        pdfDoc.rect(0, 0, pageWidth, 8).fill(pdfStyles.colors.primary);
        pdfDoc.y = 25;
        pdfDoc.fillColor(pdfStyles.colors.primary)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text(legalDoc.company.name, { align: 'center' });

        pdfDoc.fillColor(pdfStyles.colors.gray).fontSize(10).font('Helvetica');

        if (legalDoc.company.cnpj) {
          pdfDoc.text(`CNPJ: ${legalDoc.company.cnpj}`, { align: 'center' });
        }

        if (legalDoc.company.address || legalDoc.company.city || legalDoc.company.state) {
          const addressParts = [];
          if (legalDoc.company.address) addressParts.push(legalDoc.company.address);
          if (legalDoc.company.city) addressParts.push(legalDoc.company.city);
          if (legalDoc.company.state) addressParts.push(legalDoc.company.state);
          if (legalDoc.company.zipCode) addressParts.push(`CEP: ${legalDoc.company.zipCode}`);
          pdfDoc.text(addressParts.join(' - '), { align: 'center' });
        }

        const contactParts = [];
        if (legalDoc.company.phone) contactParts.push(`Tel: ${legalDoc.company.phone}`);
        if (legalDoc.company.email) contactParts.push(legalDoc.company.email);
        if (contactParts.length > 0) {
          pdfDoc.text(contactParts.join(' | '), { align: 'center' });
        }

        pdfDoc.moveDown(0.5);
        pdfDoc.strokeColor(pdfStyles.colors.primary)
           .lineWidth(2)
           .moveTo(margin, pdfDoc.y)
           .lineTo(pageWidth - margin, pdfDoc.y)
           .stroke();
        pdfDoc.moveDown(1);
      }

      // Título
      pdfDoc.fillColor(pdfStyles.colors.black)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(legalDoc.title.toUpperCase(), { align: 'center' });
      pdfDoc.moveDown(1.5);

      // Conteúdo - usando texto simples (sem formatação complexa para simplificar)
      pdfDoc.fillColor(pdfStyles.colors.black)
         .fontSize(11)
         .font('Helvetica')
         .text(legalDoc.content || '', { align: 'justify', lineGap: 3 });

      // Data e assinatura
      if (legalDoc.signer) {
        pdfDoc.moveDown(2);
        const documentDate = new Date(legalDoc.documentDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        const cidade = legalDoc.company?.city || 'Local';
        pdfDoc.fontSize(11).font('Helvetica').text(`${cidade}, ${documentDate}`, { align: 'center' });

        pdfDoc.moveDown(2.5);
        pdfDoc.strokeColor(pdfStyles.colors.grayDark)
           .lineWidth(1)
           .moveTo(pageWidth / 2 - 100, pdfDoc.y)
           .lineTo(pageWidth / 2 + 100, pdfDoc.y)
           .stroke();

        pdfDoc.moveDown(0.3);
        pdfDoc.fillColor(pdfStyles.colors.black)
           .font('Helvetica-Bold')
           .text(legalDoc.signer.name, { align: 'center' });

        pdfDoc.font('Helvetica').fontSize(10).fillColor(pdfStyles.colors.gray);
        if (legalDoc.signer.email) {
          pdfDoc.text(legalDoc.signer.email, { align: 'center' });
        }
      }

      pdfDoc.end();

      // Aguardar geração do PDF
      const pdfBuffer = await pdfPromise;

      // Upload para S3 (path unificado com Document)
      const fileKey = `companies/${companyId}/clients/${clientId}/documents/${Date.now()}-${legalDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const fileUrl = await uploadBufferToS3(pdfBuffer, fileKey, 'application/pdf');

      // Criar registro de documento compartilhado
      const document = await prisma.sharedDocument.create({
        data: {
          companyId,
          clientId,
          name: name || legalDoc.title,
          description: description || `Documento jurídico: ${legalDoc.title}`,
          fileUrl,
          fileKey,
          fileSize: pdfBuffer.length,
          fileType: 'application/pdf',
          sharedByUserId: userId,
          requiresSignature: requiresSignature === true || requiresSignature === 'true',
          allowDownload: allowDownload !== false && allowDownload !== 'false',
          status: 'PENDING',
        },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      appLogger.info('Documento jurídico compartilhado com cliente (PDF)', {
        documentId: document.id,
        legalDocumentId,
        clientId,
        companyId,
        userId,
      });

      // Retornar com URL assinada
      const signedFileUrl = await getSignedS3Url(document.fileKey);

      res.status(201).json({
        ...document,
        fileUrl: signedFileUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao compartilhar documento jurídico', error as Error);
      res.status(500).json({ error: 'Erro ao compartilhar documento jurídico' });
    }
  }

  /**
   * Marcar documento enviado por cliente como baixado/visualizado pelo escritório
   * PUT /api/shared-documents/:id/download-from-client
   */
  async downloadFromClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const document = await prisma.sharedDocument.findFirst({
        where: { id, companyId, uploadedByClient: true },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Atualizar status para DOWNLOADED se ainda estava UPLOADED
      if (document.status === 'UPLOADED') {
        await prisma.sharedDocument.update({
          where: { id },
          data: {
            status: 'DOWNLOADED',
            downloadedAt: new Date(),
          },
        });
      }

      // Retornar URL assinada para download
      const signedFileUrl = await getSignedS3Url(document.fileKey);

      res.json({
        ...document,
        status: 'DOWNLOADED',
        downloadedAt: new Date(),
        fileUrl: signedFileUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao baixar documento do cliente', error as Error);
      res.status(500).json({ error: 'Erro ao baixar documento' });
    }
  }

  /**
   * Atualizar configurações do documento
   * PUT /api/shared-documents/:id
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, requiresSignature, allowDownload } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const document = await prisma.sharedDocument.findFirst({
        where: { id, companyId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      const updated = await prisma.sharedDocument.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(requiresSignature !== undefined && {
            requiresSignature: requiresSignature === true || requiresSignature === 'true',
          }),
          ...(allowDownload !== undefined && {
            allowDownload: allowDownload !== false && allowDownload !== 'false',
          }),
        },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Retornar com URL assinada
      const signedFileUrl = await getSignedS3Url(updated.fileKey);

      res.json({
        ...updated,
        fileUrl: signedFileUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar documento compartilhado', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar documento' });
    }
  }

  /**
   * Listar todos os documentos enviados por clientes (para o escritório)
   * GET /api/shared-documents/uploaded-by-clients
   */
  async listUploadedByClients(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const documents = await prisma.sharedDocument.findMany({
        where: {
          companyId,
          uploadedByClient: true,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      // Gerar URLs assinadas para cada documento
      const documentsWithUrls = await Promise.all(
        documents.map(async (doc) => ({
          ...doc,
          fileUrl: await getSignedS3Url(doc.fileKey),
        }))
      );

      res.json(documentsWithUrls);
    } catch (error) {
      appLogger.error('Erro ao listar documentos enviados por clientes', error as Error);
      res.status(500).json({ error: 'Erro ao listar documentos' });
    }
  }
}

export default new SharedDocumentController();
