import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';
import { uploadToS3, deleteFromS3, getSignedS3Url } from '../utils/s3';
import { parse } from 'csv-parse/sync';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';

export class PNJController {
  /**
   * Listar PNJs com paginação e busca
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '', status = '', clientId = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        companyId,
        ...(search && {
          OR: [
            { number: { contains: String(search), mode: 'insensitive' as const } },
            { protocol: { contains: String(search), mode: 'insensitive' as const } },
            { title: { contains: String(search), mode: 'insensitive' as const } },
            { client: { name: { contains: String(search), mode: 'insensitive' as const } } },
            { client: { cpf: { contains: String(search), mode: 'insensitive' as const } } },
            { client: { phone: { contains: String(search), mode: 'insensitive' as const } } },
          ],
        }),
        ...(status && status !== 'ALL' && { status: String(status) }),
        ...(clientId && { clientId: String(clientId) }),
      };

      const [pnjs, total] = await Promise.all([
        prisma.pNJ.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                cpf: true,
                phone: true,
              },
            },
            _count: {
              select: {
                parts: true,
                movements: true,
              },
            },
          },
        }),
        prisma.pNJ.count({ where }),
      ]);

      res.json({
        data: pnjs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar PNJs:', error as Error);
      res.status(500).json({ error: 'Erro ao listar PNJs' });
    }
  }

  /**
   * Buscar PNJ por ID com partes e andamentos
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          parts: {
            orderBy: { createdAt: 'asc' },
          },
          movements: {
            orderBy: { date: 'desc' },
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Gerar URLs assinadas para documentos do S3
      if (pnj.documents && pnj.documents.length > 0) {
        const documentsWithUrls = await Promise.all(
          pnj.documents.map(async (doc) => {
            if (doc.storageType === 'upload' && doc.fileKey) {
              try {
                const signedUrl = await getSignedS3Url(doc.fileKey);
                return { ...doc, fileUrl: signedUrl };
              } catch (error) {
                return doc;
              }
            }
            return doc;
          })
        );
        return res.json({ ...pnj, documents: documentsWithUrls });
      }

      res.json(pnj);
    } catch (error) {
      appLogger.error('Erro ao buscar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar PNJ' });
    }
  }

  /**
   * Criar novo PNJ
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { number, protocol, title, description, status, clientId, openDate } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validação: número e título são obrigatórios
      if (!number || !number.trim()) {
        return res.status(400).json({ error: 'Número é obrigatório' });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      // Verificar se cliente existe (se informado)
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId },
        });
        if (!client) {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
      }

      const pnj = await prisma.pNJ.create({
        data: {
          companyId,
          number: number.trim(),
          protocol: protocol?.trim() || null,
          title: sanitizeString(title) || title.trim(),
          description: sanitizeString(description) || null,
          status: status || 'ACTIVE',
          clientId: clientId || null,
          openDate: openDate ? new Date(openDate) : new Date(),
          createdBy: userId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(pnj);
    } catch (error) {
      appLogger.error('Erro ao criar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao criar PNJ' });
    }
  }

  /**
   * Atualizar PNJ
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { number, protocol, title, description, status, clientId, openDate, closeDate } = req.body;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação: número e título são obrigatórios
      if (!number || !number.trim()) {
        return res.status(400).json({ error: 'Número é obrigatório' });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      // Verificar se cliente existe (se informado)
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId: companyId! },
        });
        if (!client) {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
      }

      const updatedPNJ = await prisma.pNJ.update({
        where: { id },
        data: {
          number: number.trim(),
          protocol: protocol?.trim() || null,
          title: sanitizeString(title) || title.trim(),
          description: sanitizeString(description) || null,
          status: status || pnj.status,
          clientId: clientId || null,
          openDate: openDate ? new Date(openDate) : pnj.openDate,
          closeDate: closeDate ? new Date(closeDate) : (status === 'CLOSED' ? new Date() : null),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json(updatedPNJ);
    } catch (error) {
      appLogger.error('Erro ao atualizar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar PNJ' });
    }
  }

  /**
   * Deletar PNJ
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      await prisma.pNJ.delete({
        where: { id },
      });

      res.json({ message: 'PNJ deletado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao deletar PNJ' });
    }
  }

  // ============================================================================
  // PARTES DO PNJ
  // ============================================================================

  /**
   * Adicionar parte ao PNJ
   */
  async addPart(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { name, document, type, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da parte é obrigatório' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Tipo da parte é obrigatório' });
      }

      const part = await prisma.pNJPart.create({
        data: {
          pnjId: id,
          companyId: companyId!, // ISSUE 2 FIX: Isolamento direto de tenant
          name: sanitizeString(name) || name.trim(),
          document: document?.trim() || null,
          type,
          notes: sanitizeString(notes) || null,
        },
      });

      res.status(201).json(part);
    } catch (error) {
      appLogger.error('Erro ao adicionar parte ao PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao adicionar parte' });
    }
  }

  /**
   * Atualizar parte do PNJ
   */
  async updatePart(req: AuthRequest, res: Response) {
    try {
      const { id, partId } = req.params;
      const companyId = req.user!.companyId;
      const { name, document, type, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se a parte existe
      const part = await prisma.pNJPart.findFirst({
        where: {
          id: partId,
          pnjId: id,
        },
      });

      if (!part) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      // Validação
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da parte é obrigatório' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Tipo da parte é obrigatório' });
      }

      const updatedPart = await prisma.pNJPart.update({
        where: { id: partId },
        data: {
          name: sanitizeString(name) || name.trim(),
          document: document?.trim() || null,
          type,
          notes: sanitizeString(notes) || null,
        },
      });

      res.json(updatedPart);
    } catch (error) {
      appLogger.error('Erro ao atualizar parte do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar parte' });
    }
  }

  /**
   * Remover parte do PNJ
   */
  async removePart(req: AuthRequest, res: Response) {
    try {
      const { id, partId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se a parte existe
      const part = await prisma.pNJPart.findFirst({
        where: {
          id: partId,
          pnjId: id,
        },
      });

      if (!part) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      await prisma.pNJPart.delete({
        where: { id: partId },
      });

      res.json({ message: 'Parte removida com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover parte do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao remover parte' });
    }
  }

  // ============================================================================
  // ANDAMENTOS DO PNJ
  // ============================================================================

  /**
   * Adicionar andamento ao PNJ
   */
  async addMovement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { date, description, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação
      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Descrição do andamento é obrigatória' });
      }

      const movement = await prisma.pNJMovement.create({
        data: {
          pnjId: id,
          companyId: companyId!, // ISSUE 2 FIX: Isolamento direto de tenant
          date: date ? new Date(date) : new Date(),
          description: sanitizeString(description) || description.trim(),
          notes: sanitizeString(notes) || null,
          createdBy: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(movement);
    } catch (error) {
      appLogger.error('Erro ao adicionar andamento ao PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao adicionar andamento' });
    }
  }

  /**
   * Atualizar andamento do PNJ
   */
  async updateMovement(req: AuthRequest, res: Response) {
    try {
      const { id, movementId } = req.params;
      const companyId = req.user!.companyId;
      const { date, description, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se o andamento existe
      const movement = await prisma.pNJMovement.findFirst({
        where: {
          id: movementId,
          pnjId: id,
        },
      });

      if (!movement) {
        return res.status(404).json({ error: 'Andamento não encontrado' });
      }

      // Validação
      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Descrição do andamento é obrigatória' });
      }

      const updatedMovement = await prisma.pNJMovement.update({
        where: { id: movementId },
        data: {
          date: date ? new Date(date) : movement.date,
          description: sanitizeString(description) || description.trim(),
          notes: sanitizeString(notes) || null,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json(updatedMovement);
    } catch (error) {
      appLogger.error('Erro ao atualizar andamento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar andamento' });
    }
  }

  /**
   * Remover andamento do PNJ
   */
  async removeMovement(req: AuthRequest, res: Response) {
    try {
      const { id, movementId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se o andamento existe
      const movement = await prisma.pNJMovement.findFirst({
        where: {
          id: movementId,
          pnjId: id,
        },
      });

      if (!movement) {
        return res.status(404).json({ error: 'Andamento não encontrado' });
      }

      await prisma.pNJMovement.delete({
        where: { id: movementId },
      });

      res.json({ message: 'Andamento removido com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover andamento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao remover andamento' });
    }
  }

  // ============================================================================
  // DOCUMENTOS DO PNJ
  // ============================================================================

  /**
   * Listar documentos do PNJ
   */
  async listDocuments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      const documents = await prisma.pNJDocument.findMany({
        where: {
          pnjId: id,
          companyId: companyId!,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Gerar URLs assinadas para documentos do S3
      const documentsWithUrls = await Promise.all(
        documents.map(async (doc) => {
          if (doc.storageType === 'upload' && doc.fileKey) {
            try {
              const signedUrl = await getSignedS3Url(doc.fileKey);
              return { ...doc, fileUrl: signedUrl };
            } catch (error) {
              appLogger.error('Erro ao gerar URL assinada:', error as Error);
              return doc;
            }
          }
          return doc;
        })
      );

      res.json(documentsWithUrls);
    } catch (error) {
      appLogger.error('Erro ao listar documentos do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao listar documentos' });
    }
  }

  /**
   * Upload de documento para o PNJ
   */
  async uploadDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { name, description } = req.body;
      const file = req.file;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      if (!file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
      }

      // Upload para S3
      const { key, url } = await uploadToS3(file, companyId);

      // Criar registro no banco
      const document = await prisma.pNJDocument.create({
        data: {
          pnjId: id,
          companyId,
          name: sanitizeString(name) || file.originalname,
          description: sanitizeString(description) || null,
          storageType: 'upload',
          fileUrl: url,
          fileKey: key,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedBy: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Documento PNJ uploaded', { documentId: document.id, pnjId: id, companyId });

      res.status(201).json(document);
    } catch (error) {
      appLogger.error('Erro ao fazer upload de documento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao fazer upload do documento' });
    }
  }

  /**
   * Adicionar link externo como documento do PNJ
   */
  async addExternalLink(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { name, description, externalUrl, externalType } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (!externalUrl || !externalUrl.trim()) {
        return res.status(400).json({ error: 'URL é obrigatória' });
      }

      // Criar registro no banco
      const document = await prisma.pNJDocument.create({
        data: {
          pnjId: id,
          companyId,
          name: sanitizeString(name) || name.trim(),
          description: sanitizeString(description) || null,
          storageType: 'link',
          externalUrl: externalUrl.trim(),
          externalType: externalType || 'other',
          uploadedBy: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Link externo PNJ adicionado', { documentId: document.id, pnjId: id, companyId });

      res.status(201).json(document);
    } catch (error) {
      appLogger.error('Erro ao adicionar link externo do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao adicionar link' });
    }
  }

  /**
   * Deletar documento do PNJ
   */
  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const { id, documentId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se o documento existe
      const document = await prisma.pNJDocument.findFirst({
        where: {
          id: documentId,
          pnjId: id,
          companyId: companyId!,
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Se for upload, deletar do S3
      if (document.storageType === 'upload' && document.fileKey) {
        await deleteFromS3(document.fileKey);
      }

      // Deletar do banco
      await prisma.pNJDocument.delete({
        where: { id: documentId },
      });

      appLogger.info('Documento PNJ deletado', { documentId, pnjId: id, companyId });

      res.json({ message: 'Documento removido com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar documento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao remover documento' });
    }
  }

  // ============================================================================
  // EXPORTAÇÃO E IMPORTAÇÃO CSV
  // ============================================================================

  /**
   * Exportar PNJs para CSV
   */
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { status, search } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Build where clause
      const where: any = { companyId };

      if (status && String(status).toLowerCase() !== 'all') {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { number: { contains: search as string, mode: 'insensitive' } },
          { title: { contains: search as string, mode: 'insensitive' } },
          { protocol: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const pnjs = await prisma.pNJ.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              name: true,
            },
          },
          parts: true,
          movements: {
            orderBy: { date: 'desc' },
            take: 1, // Apenas o último andamento
          },
        },
      });

      // Helper to escape CSV fields
      const escapeCSV = (value: string | null | undefined): string => {
        if (!value) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Helper to format date
      const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
      };

      // CSV Header
      const csvHeader = 'Numero,Protocolo,Titulo,Descricao,Status,Data Abertura,Data Encerramento,Cliente,Partes,Ultimo Andamento\n';

      // Status labels
      const statusLabels: Record<string, string> = {
        ACTIVE: 'Ativo',
        ARCHIVED: 'Arquivado',
        CLOSED: 'Encerrado',
      };

      // CSV Rows
      const csvRows = pnjs.map((pnj) => {
        const number = escapeCSV(pnj.number);
        const protocol = escapeCSV(pnj.protocol);
        const title = escapeCSV(pnj.title);
        const description = escapeCSV(pnj.description);
        const status = statusLabels[pnj.status] || pnj.status;
        const openDate = formatDate(pnj.openDate);
        const closeDate = formatDate(pnj.closeDate);
        const clientName = escapeCSV(pnj.client?.name);
        const parts = escapeCSV(pnj.parts?.map(p => p.name).join('; '));
        const lastMovement = escapeCSV(pnj.movements?.[0]?.description);

        return `${number},${protocol},${title},${description},${status},${openDate},${closeDate},${clientName},${parts},${lastMovement}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=pnj_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv); // BOM for Excel UTF-8 recognition
    } catch (error) {
      appLogger.error('Erro ao exportar PNJs para CSV:', error as Error);
      res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
  }

  /**
   * Importar PNJs via CSV
   */
  async importCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      // Detectar delimitador (vírgula ou ponto e vírgula)
      const firstLine = csvContent.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter,
      }) as Record<string, string>[];

      if (!records || records.length === 0) {
        return res.status(400).json({ error: 'Arquivo CSV vazio ou inválido' });
      }

      const MAX_CSV_ROWS = 500;
      if (records.length > MAX_CSV_ROWS) {
        return res.status(400).json({
          error: 'Arquivo muito grande',
          message: `O arquivo contém ${records.length} registros. O máximo permitido é ${MAX_CSV_ROWS} registros por importação.`,
          maxRows: MAX_CSV_ROWS,
          currentRows: records.length,
        });
      }

      const jobId = await enqueueCsvImport('import-pnj', companyId, userId, csvContent, records.length);

      res.status(202).json({
        message: 'Importação iniciada. O processamento ocorre em segundo plano.',
        jobId,
        totalRows: records.length,
        statusUrl: `/api/pnj/import/status/${jobId}`,
      });
    } catch (error: any) {
      appLogger.error('Erro ao iniciar importação de PNJs', error as Error);
      res.status(500).json({ error: 'Erro ao iniciar importação de PNJs' });
    }
  }

  async getImportStatus(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const status = await getImportStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: 'Job não encontrado ou expirado' });
      }

      res.json(status);
    } catch (error) {
      appLogger.error('Erro ao buscar status de importação', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status de importação' });
    }
  }
}

export default new PNJController();
