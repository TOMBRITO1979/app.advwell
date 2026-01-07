import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

export class PortalController {
  /**
   * Retorna os dados do perfil do cliente logado
   * GET /api/portal/profile
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          personType: true,
          cpf: true,
          rg: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          profession: true,
          nationality: true,
          maritalStatus: true,
          birthDate: true,
          stateRegistration: true,
          representativeName: true,
          representativeCpf: true,
          createdAt: true,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(client);
    } catch (error) {
      appLogger.error('Erro ao buscar perfil do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do perfil' });
    }
  }

  /**
   * Retorna os dados públicos do escritório
   * GET /api/portal/company
   */
  async getCompany(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          logo: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Escritório não encontrado' });
      }

      res.json(company);
    } catch (error) {
      appLogger.error('Erro ao buscar dados do escritório:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do escritório' });
    }
  }

  /**
   * Lista os processos do cliente
   * GET /api/portal/cases
   */
  async getCases(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const cases = await prisma.case.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          status: true,
          deadline: true,
          ultimoAndamento: true,
          informarCliente: true,
          createdAt: true,
          updatedAt: true,
          lastSyncedAt: true,
          movements: {
            orderBy: { movementDate: 'desc' },
            take: 1,
            select: {
              id: true,
              movementName: true,
              movementDate: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Formatar resposta com último movimento
      const formattedCases = cases.map(caseItem => ({
        ...caseItem,
        lastMovement: caseItem.movements[0] || null,
        movements: undefined,
      }));

      res.json(formattedCases);
    } catch (error) {
      appLogger.error('Erro ao listar processos do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processos' });
    }
  }

  /**
   * Retorna detalhes de um processo específico
   * GET /api/portal/cases/:id
   */
  async getCaseDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const caseDetails = await prisma.case.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          value: true,
          status: true,
          deadline: true,
          deadlineCompleted: true,
          ultimoAndamento: true,
          informarCliente: true,
          linkProcesso: true,
          aiSummary: true,
          createdAt: true,
          updatedAt: true,
          lastSyncedAt: true,
          parts: {
            select: {
              id: true,
              type: true,
              name: true,
              cpfCnpj: true,
            },
          },
        },
      });

      if (!caseDetails) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      res.json(caseDetails);
    } catch (error) {
      appLogger.error('Erro ao buscar detalhes do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do processo' });
    }
  }

  /**
   * Lista as movimentações de um processo
   * GET /api/portal/cases/:id/movements
   */
  async getCaseMovements(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence ao cliente
      const caseExists = await prisma.case.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: { id: true },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const movements = await prisma.caseMovement.findMany({
        where: {
          caseId: id,
          companyId,
        },
        select: {
          id: true,
          movementCode: true,
          movementName: true,
          movementDate: true,
          description: true,
          createdAt: true,
        },
        orderBy: { movementDate: 'desc' },
      });

      res.json(movements);
    } catch (error) {
      appLogger.error('Erro ao listar movimentações:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * Lista os anúncios ativos do escritório
   * GET /api/portal/announcements
   * Mostra avisos globais (clientId = null) e avisos específicos para o cliente logado
   */
  async getAnnouncements(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const clientId = req.user!.clientId;
      const now = new Date();

      const announcements = await prisma.announcement.findMany({
        where: {
          companyId,
          active: true,
          publishedAt: { lte: now },
          AND: [
            // Filtro de expiração
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
            // Filtro de cliente: global (null) ou específico para este cliente
            {
              OR: [
                { clientId: null },
                { clientId: clientId },
              ],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          publishedAt: true,
          clientId: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },  // URGENT > HIGH > NORMAL > LOW
          { publishedAt: 'desc' },
        ],
      });

      res.json(announcements);
    } catch (error) {
      appLogger.error('Erro ao listar anúncios:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar anúncios' });
    }
  }

  /**
   * Lista os PNJs do cliente
   * GET /api/portal/pnjs
   */
  async getPNJs(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const pnjs = await prisma.pNJ.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          number: true,
          protocol: true,
          title: true,
          description: true,
          status: true,
          openDate: true,
          closeDate: true,
          createdAt: true,
          updatedAt: true,
          movements: {
            orderBy: { date: 'desc' },
            take: 1,
            select: {
              id: true,
              description: true,
              date: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Formatar resposta com último movimento
      const formattedPNJs = pnjs.map(pnj => ({
        ...pnj,
        lastMovement: pnj.movements[0] || null,
        movements: undefined,
      }));

      res.json(formattedPNJs);
    } catch (error) {
      appLogger.error('Erro ao listar PNJs do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processos não judiciais' });
    }
  }

  /**
   * Retorna detalhes de um PNJ específico
   * GET /api/portal/pnjs/:id
   */
  async getPNJDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const pnjDetails = await prisma.pNJ.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: {
          id: true,
          number: true,
          protocol: true,
          title: true,
          description: true,
          status: true,
          openDate: true,
          closeDate: true,
          createdAt: true,
          updatedAt: true,
          parts: {
            select: {
              id: true,
              type: true,
              name: true,
              document: true,
            },
          },
        },
      });

      if (!pnjDetails) {
        return res.status(404).json({ error: 'Processo não judicial não encontrado' });
      }

      res.json(pnjDetails);
    } catch (error) {
      appLogger.error('Erro ao buscar detalhes do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do processo não judicial' });
    }
  }

  /**
   * Lista as movimentações de um PNJ
   * GET /api/portal/pnjs/:id/movements
   */
  async getPNJMovements(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      // Verificar se o PNJ pertence ao cliente
      const pnjExists = await prisma.pNJ.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: { id: true },
      });

      if (!pnjExists) {
        return res.status(404).json({ error: 'Processo não judicial não encontrado' });
      }

      const movements = await prisma.pNJMovement.findMany({
        where: {
          pnjId: id,
        },
        select: {
          id: true,
          description: true,
          date: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { date: 'desc' },
      });

      res.json(movements);
    } catch (error) {
      appLogger.error('Erro ao listar movimentações do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * Retorna estatísticas do dashboard do portal
   * GET /api/portal/dashboard
   */
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;
      const now = new Date();

      // Contagem de processos por status
      const [
        totalCases,
        activeCases,
        pendingCases,
        finishedCases,
        recentMovements,
        activeAnnouncements,
      ] = await Promise.all([
        // Total de processos
        prisma.case.count({
          where: { clientId, companyId },
        }),
        // Processos ativos
        prisma.case.count({
          where: { clientId, companyId, status: 'ACTIVE' },
        }),
        // Processos pendentes
        prisma.case.count({
          where: { clientId, companyId, status: 'PENDENTE' },
        }),
        // Processos finalizados
        prisma.case.count({
          where: { clientId, companyId, status: 'FINISHED' },
        }),
        // Últimas 5 movimentações
        prisma.caseMovement.findMany({
          where: {
            companyId,
            case: { clientId },
          },
          select: {
            id: true,
            movementName: true,
            movementDate: true,
            case: {
              select: {
                processNumber: true,
              },
            },
          },
          orderBy: { movementDate: 'desc' },
          take: 5,
        }),
        // Anúncios ativos (globais + específicos para este cliente)
        prisma.announcement.count({
          where: {
            companyId,
            active: true,
            publishedAt: { lte: now },
            AND: [
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: now } },
                ],
              },
              {
                OR: [
                  { clientId: null },
                  { clientId: clientId },
                ],
              },
            ],
          },
        }),
      ]);

      res.json({
        stats: {
          totalCases,
          activeCases,
          pendingCases,
          finishedCases,
          activeAnnouncements,
        },
        recentMovements: recentMovements.map(m => ({
          id: m.id,
          movementName: m.movementName,
          movementDate: m.movementDate,
          processNumber: m.case.processNumber,
        })),
      });
    } catch (error) {
      appLogger.error('Erro ao buscar dashboard do portal:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
  }

  /**
   * Lista documentos compartilhados do cliente logado
   * GET /api/portal/documents
   */
  async getDocuments(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const { getSignedS3Url } = await import('../utils/s3');

      const documents = await prisma.sharedDocument.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          fileKey: true,
          fileSize: true,
          fileType: true,
          sharedAt: true,
          requiresSignature: true,
          allowDownload: true,
          status: true,
          signedAt: true,
          signatureKey: true,
          viewedAt: true,
          downloadedAt: true,
          uploadedByClient: true,
          uploadedAt: true,
          sharedBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { sharedAt: 'desc' },
      });

      // Gerar URLs assinadas
      const documentsWithUrls = await Promise.all(
        documents.map(async (doc: typeof documents[0]) => ({
          ...doc,
          fileUrl: await getSignedS3Url(doc.fileKey),
          signatureUrl: doc.signatureKey ? await getSignedS3Url(doc.signatureKey) : null,
        }))
      );

      res.json(documentsWithUrls);
    } catch (error) {
      appLogger.error('Erro ao listar documentos do portal:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar documentos' });
    }
  }

  /**
   * Busca detalhes de um documento e marca como visualizado
   * GET /api/portal/documents/:id
   */
  async getDocumentDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const document = await prisma.sharedDocument.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        include: {
          sharedBy: {
            select: { name: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Marcar como visualizado se ainda não foi
      if (!document.viewedAt) {
        await prisma.sharedDocument.update({
          where: { id },
          data: {
            viewedAt: new Date(),
            status: document.status === 'PENDING' ? 'VIEWED' : document.status,
          },
        });
      }

      const { getSignedS3Url } = await import('../utils/s3');
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
      appLogger.error('Erro ao buscar documento do portal:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar documento' });
    }
  }

  /**
   * Registra download do documento
   * POST /api/portal/documents/:id/download
   */
  async downloadDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const document = await prisma.sharedDocument.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      if (!document.allowDownload) {
        return res.status(403).json({ error: 'Download não permitido para este documento' });
      }

      // Registrar download se for o primeiro
      if (!document.downloadedAt) {
        await prisma.sharedDocument.update({
          where: { id },
          data: {
            downloadedAt: new Date(),
            status: document.status === 'PENDING' || document.status === 'VIEWED' ? 'DOWNLOADED' : document.status,
          },
        });
      }

      const { getSignedS3Url } = await import('../utils/s3');
      const signedUrl = await getSignedS3Url(document.fileKey);

      res.json({ downloadUrl: signedUrl });
    } catch (error) {
      appLogger.error('Erro ao registrar download do documento:', error as Error);
      res.status(500).json({ error: 'Erro ao processar download' });
    }
  }

  /**
   * Assinar documento
   * POST /api/portal/documents/:id/sign
   * Body: { signatureImage: base64 string }
   *
   * Esta função:
   * 1. Recebe a imagem da assinatura em base64
   * 2. Baixa o PDF original do S3
   * 3. Insere a assinatura na última página do PDF
   * 4. Faz upload do PDF assinado para S3
   * 5. Atualiza o registro com o novo arquivo
   */
  async signDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { signatureImage } = req.body;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      if (!signatureImage) {
        return res.status(400).json({ error: 'Imagem da assinatura é obrigatória' });
      }

      const document = await prisma.sharedDocument.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      if (!document.requiresSignature) {
        return res.status(400).json({ error: 'Este documento não requer assinatura' });
      }

      if (document.signedAt) {
        return res.status(400).json({ error: 'Documento já foi assinado' });
      }

      // Converter base64 da assinatura para buffer
      const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
      const signatureBuffer = Buffer.from(base64Data, 'base64');

      // Importar funções necessárias
      const { uploadBufferToS3, getObjectFromS3 } = await import('../utils/s3');
      const { PDFDocument, rgb } = await import('pdf-lib');

      // Obter IP e user agent
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const signedAt = new Date();

      let signedFileKey = document.fileKey;
      let signedFileUrl = document.fileUrl;

      // Se for PDF, inserir assinatura no documento
      if (document.fileType === 'application/pdf') {
        try {
          // Baixar PDF original do S3
          const originalPdfBuffer = await getObjectFromS3(document.fileKey);

          // Carregar PDF com pdf-lib
          const pdfDoc = await PDFDocument.load(originalPdfBuffer);

          // Embed a imagem da assinatura
          const signatureImageEmbed = await pdfDoc.embedPng(signatureBuffer);

          // Pegar a última página
          const pages = pdfDoc.getPages();
          const lastPage = pages[pages.length - 1];
          const { width, height } = lastPage.getSize();

          // Dimensões da assinatura (largura fixa, altura proporcional)
          const sigWidth = 150;
          const sigHeight = (signatureImageEmbed.height / signatureImageEmbed.width) * sigWidth;

          // Posição da assinatura (centralizada, parte inferior)
          const sigX = (width - sigWidth) / 2;
          const sigY = 80; // 80 pontos do fundo da página

          // Desenhar a assinatura
          lastPage.drawImage(signatureImageEmbed, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
          });

          // Adicionar texto de validação abaixo da assinatura
          const fontSize = 8;
          const dateStr = signedAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          lastPage.drawText(`Assinado digitalmente por: ${document.client?.name || 'Cliente'}`, {
            x: sigX,
            y: sigY - 15,
            size: fontSize,
            color: rgb(0.3, 0.3, 0.3),
          });

          lastPage.drawText(`Data: ${dateStr} | IP: ${String(clientIp).split(',')[0]}`, {
            x: sigX,
            y: sigY - 25,
            size: fontSize,
            color: rgb(0.3, 0.3, 0.3),
          });

          // Salvar PDF modificado
          const signedPdfBytes = await pdfDoc.save();
          const signedPdfBuffer = Buffer.from(signedPdfBytes);

          // Upload do PDF assinado para S3
          signedFileKey = document.fileKey.replace('.pdf', '-assinado.pdf');
          signedFileUrl = await uploadBufferToS3(signedPdfBuffer, signedFileKey, 'application/pdf');

          appLogger.info('Assinatura inserida no PDF', {
            documentId: id,
            originalKey: document.fileKey,
            signedKey: signedFileKey,
          });
        } catch (pdfError) {
          appLogger.error('Erro ao processar PDF para assinatura:', pdfError as Error);
          // Se falhar, continua sem modificar o PDF (salva assinatura separada)
        }
      }

      // Upload da assinatura separada também (backup)
      const signatureKey = `signatures/${companyId}/${clientId}/${id}-${Date.now()}.png`;
      const signatureUrl = await uploadBufferToS3(signatureBuffer, signatureKey, 'image/png');

      // Atualizar documento com assinatura
      const updated = await prisma.sharedDocument.update({
        where: { id },
        data: {
          signedAt,
          signatureUrl,
          signatureKey,
          signatureIp: String(clientIp).substring(0, 50),
          signatureUserAgent: String(userAgent),
          status: 'SIGNED',
          // Atualizar para o PDF assinado se foi modificado
          ...(signedFileKey !== document.fileKey && {
            fileKey: signedFileKey,
            fileUrl: signedFileUrl,
          }),
        },
      });

      appLogger.info('Documento assinado pelo cliente', {
        documentId: id,
        clientId,
        companyId,
        pdfModified: signedFileKey !== document.fileKey,
      });

      res.json({
        message: 'Documento assinado com sucesso',
        signedAt: updated.signedAt,
      });
    } catch (error) {
      appLogger.error('Erro ao assinar documento:', error as Error);
      res.status(500).json({ error: 'Erro ao assinar documento' });
    }
  }

  /**
   * Upload de documento pelo cliente
   * POST /api/portal/documents/upload
   */
  async uploadDocument(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!clientId || !companyId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      if (!name) {
        return res.status(400).json({ error: 'Nome do documento é obrigatório' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
      }

      // Buscar o cliente para verificar se existe
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Upload para S3
      const { uploadBufferToS3 } = await import('../utils/s3');
      const fileKey = `shared-documents/${companyId}/${clientId}/uploads/${Date.now()}-${req.file.originalname}`;
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
          sharedByUserId: userId, // O próprio cliente
          uploadedByClient: true,
          uploadedAt: new Date(),
          status: 'UPLOADED',
          allowDownload: true,
          requiresSignature: false,
        },
      });

      appLogger.info('Documento enviado pelo cliente', {
        documentId: document.id,
        clientId,
        companyId,
      });

      const { getSignedS3Url } = await import('../utils/s3');
      const signedUrl = await getSignedS3Url(document.fileKey);

      res.status(201).json({
        ...document,
        fileUrl: signedUrl,
      });
    } catch (error) {
      appLogger.error('Erro ao fazer upload de documento pelo cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao enviar documento' });
    }
  }
}

export default new PortalController();
