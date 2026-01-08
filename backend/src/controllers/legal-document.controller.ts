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
          parties: {
            orderBy: { createdAt: 'asc' },
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
        parties: {
          orderBy: { createdAt: 'asc' },
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

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
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

// Helper para renderizar texto com formatação markdown no PDF
const renderFormattedText = (doc: any, text: string, options: any = {}) => {
  const { align = 'justify', lineGap = 3 } = options;
  const pageWidth = 595.28;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Regex para encontrar formatações markdown
  // **__texto__** ou __**texto**__ = negrito + sublinhado
  // **texto** = negrito
  // __texto__ = sublinhado
  const formatRegex = /(\*\*__(.+?)__\*\*|__\*\*(.+?)\*\*__|__(.+?)__|(?<!\*)\*\*(.+?)\*\*(?!\*))/g;

  // Dividir texto em parágrafos
  const paragraphs = text.split(/\n\n+/);

  paragraphs.forEach((paragraph, pIndex) => {
    if (pIndex > 0) {
      doc.moveDown(0.8);
    }

    // Dividir parágrafo em linhas para melhor controle
    const lines = paragraph.split(/\n/);

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        doc.moveDown(0.3);
      }

      // Encontrar todos os segmentos formatados e não formatados
      const segments: { text: string; bold: boolean; underline: boolean }[] = [];
      let lastIndex = 0;
      let match;

      // Regex que não captura sequências de apenas underscores (linhas de assinatura)
      const lineFormatRegex = /(\*\*__([^_]+?)__\*\*|__\*\*([^_]+?)\*\*__|__([^_]+?)__|\*\*([^*]+?)\*\*)/g;

      while ((match = lineFormatRegex.exec(line)) !== null) {
        // Adicionar texto antes do match
        if (match.index > lastIndex) {
          segments.push({
            text: line.substring(lastIndex, match.index),
            bold: false,
            underline: false,
          });
        }

        // Determinar o tipo de formatação
        const fullMatch = match[0];
        let content = '';
        let bold = false;
        let underline = false;

        if (match[2] || match[3]) {
          // **__texto__** ou __**texto**__ = negrito + sublinhado
          content = match[2] || match[3];
          bold = true;
          underline = true;
        } else if (match[4]) {
          // __texto__ = sublinhado
          content = match[4];
          underline = true;
        } else if (match[5]) {
          // **texto** = negrito
          content = match[5];
          bold = true;
        }

        segments.push({ text: content, bold, underline });
        lastIndex = match.index + fullMatch.length;
      }

      // Adicionar texto restante
      if (lastIndex < line.length) {
        segments.push({
          text: line.substring(lastIndex),
          bold: false,
          underline: false,
        });
      }

      // Se não há segmentos, é uma linha vazia ou sem formatação
      if (segments.length === 0) {
        segments.push({ text: line, bold: false, underline: false });
      }

      // Renderizar cada segmento
      let xPos = margin;
      const startY = doc.y;

      segments.forEach((segment, sIndex) => {
        if (!segment.text) return;

        // Definir fonte
        const fontName = segment.bold ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(fontName).fontSize(11);

        // Calcular largura do texto
        const textWidth = doc.widthOfString(segment.text);

        // Para o primeiro segmento, usar o método text normal para iniciar a linha
        if (sIndex === 0) {
          doc.text(segment.text, margin, doc.y, {
            continued: segments.length > 1,
            align: segments.length === 1 ? align : 'left',
            lineGap,
            width: contentWidth,
          });
        } else {
          doc.text(segment.text, {
            continued: sIndex < segments.length - 1,
          });
        }

        // Desenhar sublinhado se necessário
        if (segment.underline) {
          const currentX = doc.x - textWidth;
          const currentY = doc.y + 2;
          doc.save()
             .strokeColor('#000000')
             .lineWidth(0.5)
             .moveTo(currentX, currentY)
             .lineTo(currentX + textWidth, currentY)
             .stroke()
             .restore();
        }
      });
    });
  });

  // Restaurar fonte padrão
  doc.font('Helvetica').fontSize(11);
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
    const doc = new PDFDocument({
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      size: 'A4',
    });

    const filename = `documento_${document.id.substring(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // Dimensões da página A4
    const pageWidth = 595.28;
    const margin = 50;

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

      doc.moveDown(0.5);
      doc.strokeColor(pdfStyles.colors.primary)
         .lineWidth(2)
         .moveTo(margin, doc.y)
         .lineTo(pageWidth - margin, doc.y)
         .stroke();
      doc.moveDown(1);
    }

    // ==================== TÍTULO DO DOCUMENTO ====================
    doc.fillColor(pdfStyles.colors.black)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(document.title.toUpperCase(), { align: 'center' });
    doc.moveDown(1.5);

    // ==================== CONTEÚDO DO DOCUMENTO ====================
    doc.fillColor(pdfStyles.colors.black);

    // Usar função de renderização com suporte a markdown (negrito, sublinhado)
    if (document.content) {
      renderFormattedText(doc, document.content, { align: 'justify', lineGap: 3 });
    }

    // ==================== DATA E ASSINATURA (só se tiver assinante) ====================
    if (document.signer) {
      doc.moveDown(2);

      // Data
      const documentDate = new Date(document.documentDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const cidade = document.company?.city || 'Local';
      doc.fontSize(11).font('Helvetica').text(`${cidade}, ${documentDate}`, { align: 'center' });

      doc.moveDown(2.5);

      // Linha de assinatura
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

    // Finalizar documento (sem rodapé por enquanto para testar)
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

    // Importar serviço de IA
    const { AIService } = require('../services/ai/ai.service');

    // Obter contexto do provider de IA (suporta config própria ou compartilhada)
    let aiContext: any;
    try {
      aiContext = await AIService.getProviderContext(companyId);
    } catch (error: any) {
      if (error.message?.startsWith('LIMIT_EXCEEDED:')) {
        return res.status(400).json({
          error: error.message.replace('LIMIT_EXCEEDED:', ''),
          needsRecharge: true,
        });
      }
      throw error;
    }

    if (!aiContext) {
      return res.status(400).json({
        error: 'IA não configurada para esta empresa. Configure sua própria chave API ou solicite acesso compartilhado.'
      });
    }

    const provider = aiContext.provider;

    // Prompt para revisão e criação de documentos jurídicos
    const contentIsEmpty = !document.content || document.content.trim().length < 100;

    let prompt: string;

    if (contentIsEmpty) {
      // MODO CRIAÇÃO - documento vazio ou com pouco conteúdo
      prompt = `VOCÊ É UMA ADVOGADA ESPECIALISTA EM REDAÇÃO DE DOCUMENTOS JURÍDICOS.

SUA TAREFA: CRIAR um documento jurídico completo do tipo "${document.title}".

${document.content && document.content.trim().length > 0 ? `QUALIFICAÇÃO DAS PARTES (mantenha no início do documento):
${document.content}

` : ''}INSTRUÇÕES OBRIGATÓRIAS:
1. Crie um documento "${document.title}" COMPLETO e PROFISSIONAL
2. NÃO INCLUA O TÍTULO NO INÍCIO DO DOCUMENTO - o título "${document.title}" já será inserido automaticamente pelo sistema
3. Comece diretamente com o corpo do documento (preâmbulo, qualificação das partes, etc.)
4. O documento deve ter estrutura adequada com todas as cláusulas necessárias
5. Use linguagem jurídica formal em português brasileiro
6. Inclua todos os elementos típicos deste tipo de documento
7. O documento deve ter qualidade de um advogado com notável saber jurídico
8. NÃO diga que não pode criar ou que precisa de mais informações
9. CRIE o documento modelo completo agora

FORMATAÇÃO OBRIGATÓRIA:
- Os NOMES DAS PARTES devem estar em **negrito** (use **NOME** no texto)
- NUNCA use underscore (_) no documento. Para linhas use apenas HÍFENS (-)
- Exemplo de nome formatado: **JOÃO DA SILVA**

FORMATAÇÃO DAS ASSINATURAS (MUITO IMPORTANTE):
- Cada bloco de assinatura deve estar ALINHADO À ESQUERDA
- Formato OBRIGATÓRIO para cada assinatura (com quebra de linha):

--------------------------------------------------
**NOME DA PESSOA**

- Deixe uma linha em branco entre cada bloco de assinatura
- A linha de hífens deve ter 50 caracteres
- O nome deve estar em negrito e na linha ABAIXO da linha de hífens
- NÃO coloque tudo na mesma linha

Responda APENAS com este JSON (sem markdown):
{
  "erros": [],
  "sugestoes": [],
  "textoCorrigido": "COLE AQUI O DOCUMENTO COMPLETO QUE VOCÊ CRIOU (SEM O TÍTULO)"
}`;
    } else {
      // MODO REVISÃO - documento com conteúdo para revisar
      prompt = `Você é uma revisora profissional de textos jurídicos de um escritório de advocacia.

DOCUMENTO PARA REVISÃO:
Tipo: ${document.title}
Conteúdo:
${document.content}

TAREFA: Revise o documento buscando:
1. Erros de digitação
2. Erros de gramática e concordância
3. Pontuação incorreta
4. Terminologias jurídicas inadequadas para este tipo de documento
5. Problemas de estrutura

DIRETRIZES:
- Corrija todos os erros encontrados
- Mantenha o estilo original do autor
- Use português brasileiro formal

Responda APENAS com este JSON (sem markdown):
{
  "erros": [{"tipo": "tipo do erro", "original": "texto errado", "correcao": "texto correto"}],
  "sugestoes": ["sugestão 1", "sugestão 2"],
  "textoCorrigido": "O documento completo com todas as correções aplicadas"
}

Se não houver erros, retorne erros como array vazio e textoCorrigido igual ao original.`;
    }

    const aiResponse = await provider.generateTextWithUsage(prompt);

    // Salvar uso de tokens no banco de dados
    if (aiResponse.usage && companyId) {
      try {
        await prisma.aITokenUsage.create({
          data: {
            aiConfigId: aiContext.aiConfigId,
            companyId: companyId,
            operation: contentIsEmpty ? 'generate_document' : 'review_document',
            promptTokens: aiResponse.usage.promptTokens,
            completionTokens: aiResponse.usage.completionTokens,
            totalTokens: aiResponse.usage.totalTokens,
            model: aiContext.model,
            provider: aiContext.providerType,
            metadata: { documentId: document.id, title: document.title, isShared: aiContext.isShared },
          },
        });

        // Atualizar uso compartilhado se aplicável
        if (aiContext.isShared && aiContext.shareId) {
          await AIService.updateSharedUsage(aiContext.shareId, aiResponse.usage.totalTokens);
        }
      } catch (saveError) {
        appLogger.error('Erro ao salvar uso de tokens:', saveError as Error);
        // Não falha a operação por erro ao salvar métricas
      }
    }

    // Tentar parsear o JSON da resposta
    let review: any = { erros: [], sugestoes: [], textoCorrigido: document.content };
    try {
      // Remover possíveis marcadores de código markdown
      const cleanJson = aiResponse.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      review = JSON.parse(cleanJson);
      // Substituir underscores por hífens em linhas (3 ou mais underscores seguidos)
      if (review.textoCorrigido) {
        review.textoCorrigido = review.textoCorrigido.replace(/_{3,}/g, (match: string) => '-'.repeat(match.length));
      }
    } catch (parseError) {
      // Se não conseguir parsear, retorna o texto como está
      review = {
        erros: [],
        sugestoes: [],
        textoCorrigido: document.content,
        reviewText: aiResponse.text // Texto original da IA para debug
      };
    }

    res.json({
      documentId: document.id,
      title: document.title,
      originalContent: document.content,
      review,
      tokenUsage: aiResponse.usage,
    });
  } catch (error: any) {
    appLogger.error('Erro ao revisar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao revisar documento com IA. Tente novamente.' });
  }
};

// Gerar ou revisar documento com IA (sem precisar salvar antes)
export const generateOrReviewWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, mode } = req.body; // mode: 'generate' ou 'review'
    const companyId = req.user!.companyId;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    // Importar serviço de IA
    const { AIService } = require('../services/ai/ai.service');

    // Obter contexto do provider de IA (suporta config própria ou compartilhada)
    let aiContext: any;
    try {
      aiContext = await AIService.getProviderContext(companyId);
    } catch (error: any) {
      if (error.message?.startsWith('LIMIT_EXCEEDED:')) {
        return res.status(400).json({
          error: error.message.replace('LIMIT_EXCEEDED:', ''),
          needsRecharge: true,
        });
      }
      throw error;
    }

    if (!aiContext) {
      return res.status(400).json({
        error: 'IA não configurada para esta empresa. Configure sua própria chave API ou solicite acesso compartilhado.'
      });
    }

    const provider = aiContext.provider;

    let prompt: string;

    if (mode === 'generate') {
      // MODO CRIAÇÃO
      prompt = `VOCÊ É UMA ADVOGADA ESPECIALISTA EM REDAÇÃO DE DOCUMENTOS JURÍDICOS.

SUA TAREFA: CRIAR um documento jurídico completo do tipo "${title}".

${content && content.trim().length > 0 ? `QUALIFICAÇÃO DAS PARTES (mantenha no início do documento):
${content}

` : ''}INSTRUÇÕES OBRIGATÓRIAS:
1. Crie um documento "${title}" COMPLETO e PROFISSIONAL
2. NÃO INCLUA O TÍTULO NO INÍCIO DO DOCUMENTO - o título "${title}" já será inserido automaticamente pelo sistema
3. Comece diretamente com o corpo do documento (preâmbulo, qualificação das partes, etc.)
4. O documento deve ter estrutura adequada com todas as cláusulas necessárias
5. Use linguagem jurídica formal em português brasileiro
6. Inclua todos os elementos típicos deste tipo de documento
7. O documento deve ter qualidade de um advogado com notável saber jurídico
8. NÃO diga que não pode criar ou que precisa de mais informações
9. CRIE o documento modelo completo agora

FORMATAÇÃO OBRIGATÓRIA:
- Os NOMES DAS PARTES devem estar em **negrito** (use **NOME** no texto)
- NUNCA use underscore (_) no documento. Para linhas use apenas HÍFENS (-)
- Exemplo de nome formatado: **JOÃO DA SILVA**

FORMATAÇÃO DAS ASSINATURAS (MUITO IMPORTANTE):
- Cada bloco de assinatura deve estar ALINHADO À ESQUERDA
- Formato OBRIGATÓRIO para cada assinatura (com quebra de linha):

--------------------------------------------------
**NOME DA PESSOA**

- Deixe uma linha em branco entre cada bloco de assinatura
- A linha de hífens deve ter 50 caracteres
- O nome deve estar em negrito e na linha ABAIXO da linha de hífens
- NÃO coloque tudo na mesma linha

Responda APENAS com este JSON (sem markdown):
{
  "erros": [],
  "sugestoes": [],
  "textoCorrigido": "COLE AQUI O DOCUMENTO COMPLETO QUE VOCÊ CRIOU (SEM O TÍTULO)"
}`;
    } else {
      // MODO REVISÃO
      if (!content || content.trim().length < 50) {
        return res.status(400).json({
          error: 'Para revisar, o documento precisa ter conteúdo (mínimo 50 caracteres)'
        });
      }

      prompt = `Você é uma revisora profissional de textos jurídicos de um escritório de advocacia.

DOCUMENTO PARA REVISÃO:
Tipo: ${title}
Conteúdo:
${content}

TAREFA: Revise o documento buscando:
1. Erros de digitação
2. Erros de gramática e concordância
3. Pontuação incorreta
4. Terminologias jurídicas inadequadas para este tipo de documento
5. Problemas de estrutura

DIRETRIZES:
- Corrija todos os erros encontrados
- Mantenha o estilo original do autor
- Use português brasileiro formal

Responda APENAS com este JSON (sem markdown):
{
  "erros": [{"tipo": "tipo do erro", "original": "texto errado", "correcao": "texto correto"}],
  "sugestoes": ["sugestão 1", "sugestão 2"],
  "textoCorrigido": "O documento completo com todas as correções aplicadas"
}

Se não houver erros, retorne erros como array vazio e textoCorrigido igual ao original.`;
    }

    const aiResponse = await provider.generateTextWithUsage(prompt);

    // Salvar uso de tokens no banco de dados
    if (aiResponse.usage && companyId) {
      try {
        await prisma.aITokenUsage.create({
          data: {
            aiConfigId: aiContext.aiConfigId,
            companyId: companyId,
            operation: mode === 'generate' ? 'generate_document' : 'review_document',
            promptTokens: aiResponse.usage.promptTokens,
            completionTokens: aiResponse.usage.completionTokens,
            totalTokens: aiResponse.usage.totalTokens,
            model: aiContext.model,
            provider: aiContext.providerType,
            metadata: { title, mode, isShared: aiContext.isShared },
          },
        });

        // Atualizar uso compartilhado se aplicável
        if (aiContext.isShared && aiContext.shareId) {
          await AIService.updateSharedUsage(aiContext.shareId, aiResponse.usage.totalTokens);
        }
      } catch (saveError) {
        appLogger.error('Erro ao salvar uso de tokens:', saveError as Error);
        // Não falha a operação por erro ao salvar métricas
      }
    }

    // Tentar parsear o JSON da resposta
    let review: any = { erros: [], sugestoes: [], textoCorrigido: content || '' };
    try {
      const cleanJson = aiResponse.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      review = JSON.parse(cleanJson);
      // Substituir underscores por hífens em linhas (3 ou mais underscores seguidos)
      if (review.textoCorrigido) {
        review.textoCorrigido = review.textoCorrigido.replace(/_{3,}/g, (match: string) => '-'.repeat(match.length));
      }
    } catch (parseError) {
      review = {
        erros: [],
        sugestoes: [],
        textoCorrigido: content || '',
        reviewText: aiResponse.text
      };
    }

    res.json({
      title,
      originalContent: content || '',
      mode,
      review,
      tokenUsage: aiResponse.usage,
    });
  } catch (error: any) {
    appLogger.error('Erro ao gerar/revisar documento:', error as Error);
    res.status(500).json({ error: 'Erro ao processar documento com IA. Tente novamente.' });
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

// ==================== PARTES DO DOCUMENTO ====================

// Listar partes de um documento
export const listDocumentParties = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    // Verificar se o documento existe
    const document = await prisma.legalDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const parties = await prisma.legalDocumentParty.findMany({
      where: { legalDocumentId: documentId, companyId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(parties);
  } catch (error) {
    appLogger.error('Erro ao listar partes:', error as Error);
    res.status(500).json({ error: 'Erro ao listar partes do documento' });
  }
};

// Adicionar parte ao documento
export const addDocumentParty = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { name, type, cpfCnpj, oab, email, phone, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Nome da parte é obrigatório' });
    }

    // Verificar se o documento existe
    const document = await prisma.legalDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const party = await prisma.legalDocumentParty.create({
      data: {
        legalDocumentId: documentId,
        companyId,
        name: sanitizeString(name) || name,
        type: type || 'OUTRO',
        cpfCnpj: cpfCnpj ? sanitizeString(cpfCnpj) : null,
        oab: oab ? sanitizeString(oab) : null,
        email: email ? sanitizeString(email) : null,
        phone: phone ? sanitizeString(phone) : null,
        notes: notes ? sanitizeString(notes) : null,
      },
    });

    res.status(201).json(party);
  } catch (error) {
    appLogger.error('Erro ao adicionar parte:', error as Error);
    res.status(500).json({ error: 'Erro ao adicionar parte ao documento' });
  }
};

// Atualizar parte do documento
export const updateDocumentParty = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, partyId } = req.params;
    const { name, type, cpfCnpj, oab, email, phone, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    // Verificar se a parte existe
    const existingParty = await prisma.legalDocumentParty.findFirst({
      where: { id: partyId, legalDocumentId: documentId, companyId },
    });

    if (!existingParty) {
      return res.status(404).json({ error: 'Parte não encontrada' });
    }

    const party = await prisma.legalDocumentParty.update({
      where: { id: partyId },
      data: {
        ...(name && { name: sanitizeString(name) || name }),
        ...(type && { type }),
        ...(cpfCnpj !== undefined && { cpfCnpj: cpfCnpj ? sanitizeString(cpfCnpj) : null }),
        ...(oab !== undefined && { oab: oab ? sanitizeString(oab) : null }),
        ...(email !== undefined && { email: email ? sanitizeString(email) : null }),
        ...(phone !== undefined && { phone: phone ? sanitizeString(phone) : null }),
        ...(notes !== undefined && { notes: notes ? sanitizeString(notes) : null }),
      },
    });

    res.json(party);
  } catch (error) {
    appLogger.error('Erro ao atualizar parte:', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar parte do documento' });
  }
};

// Remover parte do documento
export const removeDocumentParty = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, partyId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    // Verificar se a parte existe
    const party = await prisma.legalDocumentParty.findFirst({
      where: { id: partyId, legalDocumentId: documentId, companyId },
    });

    if (!party) {
      return res.status(404).json({ error: 'Parte não encontrada' });
    }

    await prisma.legalDocumentParty.delete({
      where: { id: partyId },
    });

    res.json({ message: 'Parte removida com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao remover parte:', error as Error);
    res.status(500).json({ error: 'Erro ao remover parte do documento' });
  }
};
