import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { uploadToS3 } from '../utils/s3';
import AuditService from '../services/audit.service';
import { appLogger } from '../utils/logger';
import { canUploadFile, invalidateStorageCache } from '../services/storage.service';

// Listar documentos com filtros e paginação
export const listDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, storageType, page = 1, limit = 50 } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { companyId };

    // Filtro por busca (nome do documento)
    if (search) {
      where.name = { contains: String(search), mode: 'insensitive' };
    }

    // Filtro por cliente
    if (clientId) {
      where.clientId = String(clientId);
    }

    // Filtro por processo
    if (caseId) {
      where.caseId = String(caseId);
    }

    // Filtro por tipo de armazenamento
    if (storageType && (storageType === 'upload' || storageType === 'link')) {
      where.storageType = storageType;
    }

    const documents = await prisma.document.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
          case: {
            select: {
              id: true,
              processNumber: true,
              subject: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

    // Gera URLs assinadas para documentos do tipo 'upload'
    const { getSignedS3Url } = await import('../utils/s3');
    const documentsWithSignedUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.storageType === 'upload' && doc.fileKey) {
          const signedUrl = await getSignedS3Url(doc.fileKey);
          return {
            ...doc,
            fileUrl: signedUrl,
          };
        }
        return doc;
      })
    );

    res.json({ data: documentsWithSignedUrls });
  } catch (error: any) {
    appLogger.error('Erro ao listar documentos', error as Error);
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
};

// Buscar documento por ID
export const getDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.document.findFirst({
      where: { id, companyId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Se for upload no S3, gera URL assinada (válida por 1 hora)
    if (document.storageType === 'upload' && document.fileKey) {
      const { getSignedS3Url } = await import('../utils/s3');
      const signedUrl = await getSignedS3Url(document.fileKey);

      return res.json({
        ...document,
        fileUrl: signedUrl, // Substitui URL pública por URL assinada
      });
    }

    res.json(document);
  } catch (error: any) {
    appLogger.error('Erro ao buscar documento', error as Error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
};

// Criar novo documento
export const createDocument = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      clientId,
      name,
      description,
      storageType,
      fileUrl,
      fileKey,
      fileSize,
      fileType,
      externalUrl,
      externalType,
    } = req.body;

    const companyId = req.user!.companyId!;
    const uploadedBy = req.user!.userId;

    // Validações
    if (!name) {
      return res.status(400).json({ error: 'Nome do documento é obrigatório' });
    }

    if (!storageType || (storageType !== 'upload' && storageType !== 'link')) {
      return res.status(400).json({ error: 'Tipo de armazenamento inválido' });
    }

    // Deve ter caseId OU clientId
    if (!caseId && !clientId) {
      return res.status(400).json({ error: 'É necessário informar um cliente ou processo' });
    }

    if (caseId && clientId) {
      return res.status(400).json({ error: 'Informe apenas um: cliente ou processo' });
    }

    // Validações específicas por tipo de armazenamento
    if (storageType === 'upload' && !fileUrl) {
      return res.status(400).json({ error: 'URL do arquivo é obrigatória para upload' });
    }

    if (storageType === 'link' && !externalUrl) {
      return res.status(400).json({ error: 'URL externa é obrigatória para link' });
    }

    // Verificar se cliente/processo pertencem à empresa do usuário
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    if (caseId) {
      const caseRecord = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });
      if (!caseRecord) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }
    }

    const document = await prisma.document.create({
      data: {
        companyId,
        caseId: caseId || null,
        clientId: clientId || null,
        name,
        description: description || null,
        storageType,
        fileUrl: fileUrl || null,
        fileKey: fileKey || null,
        fileSize: fileSize || null,
        fileType: fileType || null,
        externalUrl: externalUrl || null,
        externalType: externalType || null,
        uploadedBy,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log de auditoria: documento adicionado (apenas se vinculado a um processo)
    if (caseId) {
      await AuditService.logDocumentAdded(
        caseId,
        req.user!.userId,
        name,
        storageType
      );
    }

    res.status(201).json(document);
  } catch (error: any) {
    appLogger.error('Erro ao criar documento', error as Error);
    res.status(500).json({ error: 'Erro ao criar documento' });
  }
};

// Atualizar documento
export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      externalUrl,
      externalType,
    } = req.body;

    const companyId = req.user!.companyId;

    // Verificar se documento existe e pertence à empresa
    const existingDocument = await prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!existingDocument) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Apenas atualizar campos editáveis
    const document = await prisma.document.update({
      where: { id },
      data: {
        name: name || existingDocument.name,
        description: description !== undefined ? description : existingDocument.description,
        externalUrl: externalUrl !== undefined ? externalUrl : existingDocument.externalUrl,
        externalType: externalType !== undefined ? externalType : existingDocument.externalType,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(document);
  } catch (error: any) {
    appLogger.error('Erro ao atualizar documento', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
};

// Excluir documento
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Verificar se documento existe e pertence à empresa
    const document = await prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Log de auditoria: documento removido (apenas se vinculado a um processo)
    if (document.caseId) {
      await AuditService.logDocumentDeleted(
        document.caseId,
        req.user!.userId,
        document.name
      );
    }

    // Se for upload, excluir arquivo do S3
    if (document.storageType === 'upload' && document.fileKey) {
      const { deleteFromS3 } = await import('../utils/s3');
      await deleteFromS3(document.fileKey);
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error: any) {
    appLogger.error('Erro ao excluir documento', error as Error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
};

// Buscar documentos unificados (Document + SharedDocument) por cliente
export const getUnifiedDocumentsByClient = async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const companyId = req.user!.companyId;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório' });
    }

    // Verificar se cliente pertence à empresa
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar documentos da tabela Document
    const documents = await prisma.document.findMany({
      where: { companyId, clientId },
      include: {
        client: { select: { id: true, name: true, cpf: true } },
        case: { select: { id: true, processNumber: true, subject: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Buscar documentos da tabela SharedDocument
    const sharedDocuments = await prisma.sharedDocument.findMany({
      where: { companyId, clientId },
      include: {
        client: { select: { id: true, name: true, cpf: true } },
        sharedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gerar URLs assinadas
    const { getSignedS3Url } = await import('../utils/s3');

    // Processar documentos
    const processedDocuments = await Promise.all(
      documents.map(async (doc) => {
        let fileUrl = doc.fileUrl;
        if (doc.storageType === 'upload' && doc.fileKey) {
          fileUrl = await getSignedS3Url(doc.fileKey);
        }
        return {
          ...doc,
          fileUrl,
          source: 'upload' as const,
          sourceLabel: 'Upload Interno',
        };
      })
    );

    // Processar shared documents
    const processedSharedDocs = await Promise.all(
      sharedDocuments.map(async (doc) => {
        let fileUrl = doc.fileUrl;
        if (doc.fileKey) {
          fileUrl = await getSignedS3Url(doc.fileKey);
        }
        return {
          id: doc.id,
          name: doc.name,
          description: doc.description,
          storageType: 'upload' as const,
          fileUrl,
          fileKey: doc.fileKey,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          createdAt: doc.createdAt,
          client: doc.client,
          user: doc.sharedBy,
          status: doc.status,
          requiresSignature: doc.requiresSignature,
          signedAt: doc.signedAt,
          uploadedByClient: doc.uploadedByClient,
          source: 'shared' as const,
          sourceLabel: doc.uploadedByClient ? 'Enviado pelo Cliente' : 'Compartilhado',
        };
      })
    );

    // Combinar e ordenar por data
    const allDocuments = [...processedDocuments, ...processedSharedDocs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      data: allDocuments,
      summary: {
        total: allDocuments.length,
        uploads: processedDocuments.length,
        shared: processedSharedDocs.length,
      }
    });
  } catch (error: any) {
    appLogger.error('Erro ao buscar documentos unificados', error as Error);
    res.status(500).json({ error: 'Erro ao buscar documentos unificados' });
  }
};

// Buscar documentos por cliente ou processo (para autocomplete)
export const searchDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, caseId } = req.query;
    const companyId = req.user!.companyId;

    if (!clientId && !caseId) {
      return res.status(400).json({ error: 'É necessário informar clientId ou caseId' });
    }

    const where: any = { companyId };

    if (clientId) {
      where.clientId = String(clientId);
    }

    if (caseId) {
      where.caseId = String(caseId);
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gera URLs assinadas para documentos do tipo 'upload'
    const { getSignedS3Url } = await import('../utils/s3');
    const documentsWithSignedUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.storageType === 'upload' && doc.fileKey) {
          const signedUrl = await getSignedS3Url(doc.fileKey);
          return {
            ...doc,
            fileUrl: signedUrl,
          };
        }
        return doc;
      })
    );

    res.json(documentsWithSignedUrls);
  } catch (error: any) {
    appLogger.error('Erro ao buscar documentos', error as Error);
    res.status(500).json({ error: 'Erro ao buscar documentos' });
  }
};

// Baixar documento (convertido para PDF)
export const getDownloadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Se for link externo, não conseguimos converter - retorna a URL externa
    if (document.storageType === 'link') {
      return res.json({ downloadUrl: document.externalUrl });
    }

    // Se for upload no S3, converte para PDF e retorna
    if (document.storageType === 'upload' && document.fileKey) {
      const { convertToPdf } = await import('../utils/pdfConverter');

      appLogger.info('Convertendo documento para PDF', { documentName: document.name });
      const pdfBuffer = await convertToPdf(document.fileKey, document.name);

      // Define o nome do arquivo PDF
      const pdfFileName = document.name.replace(/\.[^/.]+$/, '') + '.pdf';

      // Retorna o PDF diretamente
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      appLogger.info('PDF gerado com sucesso', { fileName: pdfFileName, sizeBytes: pdfBuffer.length });
      return res.send(pdfBuffer);
    }

    res.status(400).json({ error: 'Documento sem arquivo válido' });
  } catch (error: any) {
    appLogger.error('Erro ao converter documento para PDF', error as Error);
    res.status(500).json({ error: 'Erro ao converter documento para PDF' });
  }
};

// Upload de arquivo para S3
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const {
      caseId,
      clientId,
      name,
      description,
    } = req.body;

    const companyId = req.user!.companyId!;
    const uploadedBy = req.user!.userId;

    // Validações
    if (!name) {
      return res.status(400).json({ error: 'Nome do documento é obrigatório' });
    }

    // Deve ter caseId OU clientId
    if (!caseId && !clientId) {
      return res.status(400).json({ error: 'É necessário informar um cliente ou processo' });
    }

    if (caseId && clientId) {
      return res.status(400).json({ error: 'Informe apenas um: cliente ou processo' });
    }

    // Verificar se cliente/processo pertencem à empresa do usuário
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    if (caseId) {
      const caseRecord = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });
      if (!caseRecord) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }
    }

    // Verificar limite de armazenamento antes do upload
    const storageCheck = await canUploadFile(companyId, file.size);
    if (!storageCheck.allowed) {
      appLogger.warn('Upload bloqueado - limite de armazenamento excedido', {
        companyId,
        fileSize: file.size,
        currentUsage: storageCheck.currentUsage.toString(),
        limit: storageCheck.limit.toString(),
      });
      return res.status(413).json({
        error: 'Limite de armazenamento excedido',
        message: storageCheck.message,
        currentUsage: storageCheck.currentUsage.toString(),
        limit: storageCheck.limit.toString(),
        remainingBytes: storageCheck.remainingBytes.toString(),
      });
    }

    // Upload para S3 organizado por entidade
    let key: string;
    let url: string;

    if (clientId) {
      // Upload organizado por cliente
      const { uploadToS3Organized } = await import('../utils/s3');
      appLogger.info('Fazendo upload de arquivo (organizado por cliente)', {
        fileName: file.originalname,
        sizeBytes: file.size,
        s3Path: `companies/${companyId}/clients/${clientId}/documents/`
      });
      ({ key, url } = await uploadToS3Organized(file, companyId, 'client', clientId));
    } else if (caseId) {
      // Upload organizado por processo
      const { uploadToS3Organized } = await import('../utils/s3');
      appLogger.info('Fazendo upload de arquivo (organizado por processo)', {
        fileName: file.originalname,
        sizeBytes: file.size,
        s3Path: `companies/${companyId}/cases/${caseId}/documents/`
      });
      ({ key, url } = await uploadToS3Organized(file, companyId, 'case', caseId));
    } else {
      // Fallback para formato antigo (não deveria acontecer devido às validações)
      appLogger.info('Fazendo upload de arquivo (formato legado)', {
        fileName: file.originalname,
        sizeBytes: file.size,
        s3Path: `companies/${companyId}/documents/`
      });
      ({ key, url } = await uploadToS3(file, companyId));
    }
    appLogger.info('Arquivo enviado para S3 com sucesso', { s3Key: key });

    // Criar registro no banco
    const document = await prisma.document.create({
      data: {
        companyId,
        caseId: caseId || null,
        clientId: clientId || null,
        name,
        description: description || null,
        storageType: 'upload',
        fileUrl: url,
        fileKey: key,
        fileSize: file.size,
        fileType: file.mimetype,
        externalUrl: null,
        externalType: null,
        uploadedBy,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    appLogger.info('Documento criado no banco', { documentId: document.id });

    // Invalidar cache de storage da empresa
    await invalidateStorageCache(companyId);

    res.status(201).json(document);
  } catch (error: any) {
    appLogger.error('Erro ao fazer upload de documento', error as Error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
};
