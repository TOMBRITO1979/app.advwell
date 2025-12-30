import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';
import * as pdfStyles from '../utils/pdfStyles';

// Listar documentos jurídicos
export const listLegalDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, signerId, page = 1, limit = 50 } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { content: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    if (clientId) {
      where.clientId = String(clientId);
    }

    if (signerId) {
      where.signerId = String(signerId);
    }

    const [documents, total] = await Promise.all([
      prisma.legalDocument.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
              rg: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              profession: true,
              maritalStatus: true,
              birthDate: true,
              personType: true,
            },
          },
          signer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.legalDocument.count({ where }),
    ]);

    res.json({
      data: documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    appLogger.error('Erro ao listar documentos:', error as Error);
    res.status(500).json({ error: 'Erro ao listar documentos jurídicos' });
  }
};

// Buscar documento por ID
export const getLegalDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.legalDocument.findFirst({
      where: { id, companyId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
            rg: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            profession: true,
            maritalStatus: true,
            birthDate: true,
            personType: true,
          },
        },
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json(document);
  } catch (error) {
    appLogger.error('Erro ao buscar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
};

// Criar documento jurídico
export const createLegalDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, documentDate, clientId, signerId } = req.body;
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    if (!companyId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }

    // Verificar se o cliente existe
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    // Verificar se o assinante existe
    if (signerId) {
      const signer = await prisma.user.findFirst({
        where: { id: signerId, companyId },
      });
      if (!signer) {
        return res.status(404).json({ error: 'Assinante não encontrado' });
      }
    }

    const document = await prisma.legalDocument.create({
      data: {
        companyId,
        title: sanitizeString(title) || title,
        content: sanitizeString(content) || content,
        documentDate: documentDate ? new Date(documentDate) : new Date(),
        clientId: clientId || null,
        signerId: signerId || null,
        createdBy: userId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        signer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(document);
  } catch (error) {
    appLogger.error('Erro ao criar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao criar documento jurídico' });
  }
};

// Atualizar documento jurídico
export const updateLegalDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, documentDate, clientId, signerId } = req.body;
    const companyId = req.user!.companyId;

    const existingDocument = await prisma.legalDocument.findFirst({
      where: { id, companyId },
    });

    if (!existingDocument) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Verificar se o cliente existe
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    // Verificar se o assinante existe
    if (signerId) {
      const signer = await prisma.user.findFirst({
        where: { id: signerId, companyId },
      });
      if (!signer) {
        return res.status(404).json({ error: 'Assinante não encontrado' });
      }
    }

    const document = await prisma.legalDocument.update({
      where: { id },
      data: {
        ...(title && { title: sanitizeString(title) || title }),
        ...(content && { content: sanitizeString(content) || content }),
        ...(documentDate && { documentDate: new Date(documentDate) }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(signerId !== undefined && { signerId: signerId || null }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        signer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(document);
  } catch (error) {
    appLogger.error('Erro ao atualizar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
};

// Excluir documento jurídico
export const deleteLegalDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.legalDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    await prisma.legalDocument.delete({
      where: { id },
    });

    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao excluir documento:', error as Error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
};

// Gerar PDF do documento
export const generatePDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.legalDocument.findFirst({
      where: { id, companyId },
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

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const filename = `documento_${document.id.substring(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;

    // ==================== HEADER MODERNO DA EMPRESA ====================
    if (document.company) {
      // Barra verde no topo
      doc.rect(0, 0, pageWidth, 8).fill(pdfStyles.colors.primary);

      doc.y = 25;
      doc.fillColor(pdfStyles.colors.primary)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(document.company.name, { align: 'center' });

      doc.fillColor(pdfStyles.colors.gray).fontSize(10).font('Helvetica');

      if (document.company.cnpj) {
        doc.text(`CNPJ: ${document.company.cnpj}`, { align: 'center' });
      }

      if (document.company.address || document.company.city || document.company.state) {
        const addressParts = [];
        if (document.company.address) addressParts.push(document.company.address);
        if (document.company.city) addressParts.push(document.company.city);
        if (document.company.state) addressParts.push(document.company.state);
        if (document.company.zipCode) addressParts.push(`CEP: ${document.company.zipCode}`);
        doc.text(addressParts.join(' - '), { align: 'center' });
      }

      const contactParts = [];
      if (document.company.phone) contactParts.push(`Tel: ${document.company.phone}`);
      if (document.company.email) contactParts.push(document.company.email);
      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), { align: 'center' });
      }

      doc.moveDown(1);
      doc.strokeColor(pdfStyles.colors.primary)
         .lineWidth(2)
         .moveTo(margin, doc.y)
         .lineTo(pageWidth - margin, doc.y)
         .stroke();
      doc.moveDown(1.5);
    }

    // ==================== TÍTULO DO DOCUMENTO ====================
    doc.fillColor(pdfStyles.colors.black)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(document.title.toUpperCase(), { align: 'center' });
    doc.moveDown(2);

    // ==================== CONTEÚDO DO DOCUMENTO ====================
    doc.fillColor(pdfStyles.colors.black)
       .fontSize(12)
       .font('Helvetica')
       .text(document.content, {
         align: 'justify',
         lineGap: 5,
       });

    doc.moveDown(3);

    // ==================== DATA ====================
    const documentDate = new Date(document.documentDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const cidade = document.company?.city || 'Local';
    doc.fontSize(12).font('Helvetica').text(`${cidade}, ${documentDate}`, { align: 'center' });

    doc.moveDown(4);

    // ==================== ASSINATURA ====================
    if (document.signer) {
      doc.strokeColor(pdfStyles.colors.grayDark)
         .lineWidth(1)
         .moveTo(pageWidth / 2 - 100, doc.y)
         .lineTo(pageWidth / 2 + 100, doc.y)
         .stroke();

      doc.moveDown(0.3);
      doc.fillColor(pdfStyles.colors.black)
         .font('Helvetica-Bold')
         .text(document.signer.name, { align: 'center' });

      doc.font('Helvetica').fontSize(10).fillColor(pdfStyles.colors.gray);
      if (document.signer.email) {
        doc.text(document.signer.email, { align: 'center' });
      }
    }

    // ==================== RODAPÉ ====================
    const footerY = doc.page.height - 40;
    doc.strokeColor(pdfStyles.colors.grayLight)
       .lineWidth(1)
       .moveTo(margin, footerY - 10)
       .lineTo(pageWidth - margin, footerY - 10)
       .stroke();

    doc.fillColor(pdfStyles.colors.gray)
       .fontSize(8)
       .font('Helvetica')
       .text(
         `Documento gerado em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
         margin,
         footerY,
         { align: 'center', width: pageWidth - margin * 2 }
       );

    doc.end();
  } catch (error) {
    appLogger.error('Erro ao gerar PDF:', error as Error);
    res.status(500).json({ error: 'Erro ao gerar PDF do documento' });
  }
};

// Revisar documento com IA
export const reviewWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Buscar documento
    const document = await prisma.legalDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Buscar configuração de IA da empresa
    const aiConfig = await prisma.aIConfig.findUnique({
      where: { companyId },
    });

    if (!aiConfig || !aiConfig.enabled) {
      return res.status(400).json({
        error: 'Configuração de IA não encontrada ou desabilitada. Configure a IA em Configurações > IA.'
      });
    }

    // Importar serviço de IA
    const { AIService } = require('../services/ai/ai.service');

    // Obter provider de IA
    const provider = await AIService.getProvider(companyId);

    if (!provider) {
      return res.status(400).json({
        error: 'IA não configurada para esta empresa. Configure em Config. IA.'
      });
    }

    // Prompt para revisão e correção
    const prompt = `Você é um revisor profissional de textos jurídicos. Analise o documento abaixo e:

1. Identifique erros de digitação, concordância verbal, concordância de gênero e pontuação
2. Forneça o texto CORRIGIDO completo

Documento a ser revisado:

Título: ${document.title}

Conteúdo:
${document.content}

Responda EXATAMENTE neste formato JSON (sem markdown, apenas o JSON puro):
{
  "erros": [
    {"tipo": "tipo do erro", "original": "texto original", "correcao": "correção sugerida"}
  ],
  "sugestoes": ["sugestão 1", "sugestão 2"],
  "textoCorrigido": "O texto completo do documento com todas as correções aplicadas"
}

Se não houver erros, retorne erros como array vazio e textoCorrigido igual ao original.`;

    const reviewText = await provider.generateText(prompt);

    // Tentar parsear o JSON da resposta
    let review: any = { erros: [], sugestoes: [], textoCorrigido: document.content };
    try {
      // Remover possíveis marcadores de código markdown
      const cleanJson = reviewText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      review = JSON.parse(cleanJson);
    } catch (parseError) {
      // Se não conseguir parsear, retorna o texto como está
      review = {
        erros: [],
        sugestoes: [],
        textoCorrigido: document.content,
        reviewText: reviewText // Texto original da IA para debug
      };
    }

    res.json({
      documentId: document.id,
      title: document.title,
      originalContent: document.content,
      review,
    });
  } catch (error: any) {
    appLogger.error('Erro ao revisar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao revisar documento com IA. Tente novamente.' });
  }
};

// Buscar qualificação completa do cliente
export const getClientQualification = async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const companyId = req.user!.companyId;

    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Montar qualificação completa
    let qualification = client.name;

    if (client.personType === 'JURIDICA') {
      // Pessoa Jurídica
      const parts = [];
      parts.push(`pessoa jurídica de direito privado`);
      if (client.cpf) parts.push(`inscrita no CNPJ sob o nº ${client.cpf}`);
      if (client.stateRegistration) parts.push(`Inscrição Estadual nº ${client.stateRegistration}`);
      if (client.address) {
        const addressParts = [client.address];
        if (client.city) addressParts.push(client.city);
        if (client.state) addressParts.push(client.state);
        if (client.zipCode) addressParts.push(`CEP ${client.zipCode}`);
        parts.push(`com sede em ${addressParts.join(', ')}`);
      }
      if (client.representativeName) {
        parts.push(`neste ato representada por ${client.representativeName}`);
        if (client.representativeCpf) parts.push(`CPF nº ${client.representativeCpf}`);
      }
      qualification += `, ${parts.join(', ')}`;
    } else {
      // Pessoa Física
      const parts = [];
      if (client.maritalStatus) parts.push(client.maritalStatus.toLowerCase());
      if (client.profession) parts.push(client.profession.toLowerCase());
      if (client.cpf) parts.push(`inscrito(a) no CPF sob o nº ${client.cpf}`);
      if (client.rg) parts.push(`RG nº ${client.rg}`);
      if (client.address) {
        const addressParts = [client.address];
        if (client.city) addressParts.push(client.city);
        if (client.state) addressParts.push(client.state);
        if (client.zipCode) addressParts.push(`CEP ${client.zipCode}`);
        parts.push(`residente e domiciliado(a) em ${addressParts.join(', ')}`);
      }
      if (parts.length > 0) {
        qualification += `, ${parts.join(', ')}`;
      }
    }

    res.json({
      clientId: client.id,
      name: client.name,
      qualification,
    });
  } catch (error) {
    appLogger.error('Erro ao buscar qualificação:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar qualificação do cliente' });
  }
};
