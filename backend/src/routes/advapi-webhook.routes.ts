import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

const router = Router();

/**
 * Webhook endpoint para receber callbacks da ADVAPI
 *
 * A ADVAPI envia os resultados das consultas para este endpoint
 * após processar a busca de publicações do Diário Oficial.
 *
 * Header esperado: X-API-Key: ADVAPI_WEBHOOK_KEY
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validar API Key do webhook
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.ADVAPI_WEBHOOK_KEY;

    if (!expectedKey) {
      appLogger.error('ADVAPI Webhook: ADVAPI_WEBHOOK_KEY não configurada', new Error('Missing config'));
      return res.status(500).json({ error: 'Configuração do webhook ausente' });
    }

    if (apiKey !== expectedKey) {
      appLogger.warn('ADVAPI Webhook: API Key inválida', {
        receivedKey: apiKey ? `${String(apiKey).substring(0, 8)}...` : 'none',
      });
      return res.status(401).json({ error: 'API Key inválida' });
    }

    const payload = req.body;

    appLogger.info('ADVAPI Webhook: Callback recebido', {
      tipo: payload.tipo,
      consultaId: payload.consultaId,
      status: payload.status,
      totalPublicacoes: payload.publicacoes?.length || (payload.publicacao ? 1 : 0),
    });

    // Validar payload
    if (!payload.consultaId && !payload.companyId && !payload.tipo) {
      return res.status(400).json({ error: 'Payload inválido: consultaId, companyId ou tipo necessário' });
    }

    // NOVO FORMATO: tipo: "nova_publicacao" com publicacao única
    if (payload.tipo === 'nova_publicacao' && payload.publicacao) {
      await processNovaPublicacaoCallback(payload);
    }
    // FORMATO LEGADO: status + publicacoes array
    else if (payload.status === 'completed' && payload.publicacoes) {
      // Callback com publicações encontradas
      await processPublicacoesCallback(payload);
    } else if (payload.status === 'failed') {
      // Callback de erro
      await processErrorCallback(payload);
    } else if (payload.status === 'processing') {
      // Callback de progresso
      await processProgressCallback(payload);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    appLogger.error('ADVAPI Webhook: Erro ao processar callback', error as Error);
    return res.status(500).json({ error: 'Erro interno ao processar callback' });
  }
});

/**
 * Processar callback de nova publicação (NOVO FORMATO v2)
 * Recebe uma publicação por vez
 */
async function processNovaPublicacaoCallback(payload: any) {
  const { companyId, advogadoNome, advogadoId, publicacao } = payload;

  appLogger.info('ADVAPI Webhook: Processando nova publicação', {
    companyId,
    advogadoNome,
    numeroProcesso: publicacao?.numeroProcesso,
  });

  if (!companyId || !publicacao) {
    appLogger.warn('ADVAPI Webhook: Dados incompletos no callback', { companyId, publicacao });
    return;
  }

  // Buscar OAB monitorada pelo nome do advogado
  const monitoredOab = await prisma.monitoredOAB.findFirst({
    where: {
      companyId,
      name: { contains: advogadoNome, mode: 'insensitive' },
      status: 'ACTIVE',
    },
  });

  if (!monitoredOab) {
    appLogger.warn('ADVAPI Webhook: OAB monitorada não encontrada', { companyId, advogadoNome });
    return;
  }

  try {
    // Verificar se publicação já existe
    const existing = await prisma.publication.findFirst({
      where: {
        companyId,
        monitoredOabId: monitoredOab.id,
        numeroProcesso: publicacao.numeroProcesso,
      },
    });

    if (existing) {
      appLogger.debug('ADVAPI Webhook: Publicação já existe', { numeroProcesso: publicacao.numeroProcesso });
      return;
    }

    // Criar nova publicação
    const newPub = await prisma.publication.create({
      data: {
        companyId,
        monitoredOabId: monitoredOab.id,
        numeroProcesso: publicacao.numeroProcesso,
        siglaTribunal: publicacao.siglaTribunal,
        dataPublicacao: new Date(publicacao.dataPublicacao),
        tipoComunicacao: publicacao.tipoComunicacao || null,
        textoComunicacao: publicacao.textoComunicacao || null,
      },
    });

    appLogger.info('ADVAPI Webhook: Publicação salva', {
      id: newPub.id,
      numeroProcesso: publicacao.numeroProcesso,
    });

    // Auto-importar se configurado
    if (monitoredOab.autoImport) {
      await autoImportPublication(companyId, newPub.id, publicacao);
    }

    // Atualizar última consulta da OAB
    await prisma.monitoredOAB.update({
      where: { id: monitoredOab.id },
      data: { lastConsultaAt: new Date() },
    });

  } catch (error) {
    appLogger.error('ADVAPI Webhook: Erro ao salvar publicação', error as Error, {
      numeroProcesso: publicacao.numeroProcesso,
    });
  }
}

/**
 * Processar callback com publicações encontradas
 */
async function processPublicacoesCallback(payload: any) {
  const { consultaId, companyId, advogadoOab, ufOab, publicacoes } = payload;

  appLogger.info('ADVAPI Webhook: Processando publicações', {
    consultaId,
    total: publicacoes?.length || 0,
  });

  // Encontrar a consulta no banco
  let consulta = null;
  if (consultaId) {
    consulta = await prisma.oABConsulta.findFirst({
      where: { advApiConsultaId: consultaId },
      include: { monitoredOab: true },
    });
  }

  if (!consulta && companyId && advogadoOab) {
    // Tentar encontrar por empresa e OAB
    const monitoredOab = await prisma.monitoredOAB.findFirst({
      where: { companyId, oab: advogadoOab },
    });

    if (monitoredOab) {
      consulta = await prisma.oABConsulta.findFirst({
        where: {
          monitoredOabId: monitoredOab.id,
          status: 'PROCESSING',
        },
        orderBy: { createdAt: 'desc' },
        include: { monitoredOab: true },
      });
    }
  }

  if (!consulta) {
    appLogger.warn('ADVAPI Webhook: Consulta não encontrada', { consultaId, companyId, advogadoOab });
    return;
  }

  // Salvar publicações
  let savedCount = 0;
  let importedCount = 0;

  for (const pub of publicacoes || []) {
    try {
      // Verificar se já existe
      const existing = await prisma.publication.findFirst({
        where: {
          companyId: consulta.companyId,
          monitoredOabId: consulta.monitoredOabId,
          numeroProcesso: pub.numeroProcesso,
        },
      });

      if (!existing) {
        const newPub = await prisma.publication.create({
          data: {
            companyId: consulta.companyId,
            monitoredOabId: consulta.monitoredOabId,
            numeroProcesso: pub.numeroProcesso,
            siglaTribunal: pub.siglaTribunal || pub.tribunal,
            dataPublicacao: new Date(pub.dataPublicacao),
            tipoComunicacao: pub.tipoComunicacao || pub.tipo || null,
            textoComunicacao: pub.textoComunicacao || pub.texto || null,
          },
        });

        savedCount++;

        // Auto-importar se configurado
        if (consulta.monitoredOab?.autoImport) {
          const imported = await autoImportPublication(consulta.companyId, newPub.id, pub);
          if (imported) importedCount++;
        }
      }
    } catch (pubError) {
      appLogger.error('ADVAPI Webhook: Erro ao salvar publicação', pubError as Error, {
        numeroProcesso: pub.numeroProcesso,
      });
    }
  }

  // Atualizar consulta como concluída
  await prisma.oABConsulta.update({
    where: { id: consulta.id },
    data: {
      status: 'COMPLETED',
      totalPublicacoes: publicacoes?.length || 0,
      importedCount: savedCount,
      completedAt: new Date(),
    },
  });

  // Atualizar última consulta da OAB
  await prisma.monitoredOAB.update({
    where: { id: consulta.monitoredOabId },
    data: {
      lastConsultaAt: new Date(),
      lastConsultaId: consultaId,
    },
  });

  appLogger.info('ADVAPI Webhook: Processamento concluído', {
    consultaId: consulta.id,
    totalPublicacoes: publicacoes?.length || 0,
    savedCount,
    importedCount,
  });
}

/**
 * Processar callback de erro
 */
async function processErrorCallback(payload: any) {
  const { consultaId, companyId, advogadoOab, errorMessage, error } = payload;

  appLogger.error('ADVAPI Webhook: Consulta falhou', new Error(errorMessage || error || 'Unknown error'), {
    consultaId,
    companyId,
  });

  // Encontrar e atualizar a consulta
  let consulta = null;
  if (consultaId) {
    consulta = await prisma.oABConsulta.findFirst({
      where: { advApiConsultaId: consultaId },
    });
  }

  if (consulta) {
    await prisma.oABConsulta.update({
      where: { id: consulta.id },
      data: {
        status: 'FAILED',
        errorMessage: errorMessage || error || 'Erro desconhecido na ADVAPI',
        completedAt: new Date(),
      },
    });
  }
}

/**
 * Processar callback de progresso
 */
async function processProgressCallback(payload: any) {
  const { consultaId, progress, processedCount, totalCount } = payload;

  appLogger.info('ADVAPI Webhook: Progresso', {
    consultaId,
    progress,
    processedCount,
    totalCount,
  });

  // Atualizar status no Redis para polling em tempo real
  // (Já implementado no monitoring.queue.ts)
}

/**
 * Auto-importar publicação como caso
 */
async function autoImportPublication(
  companyId: string,
  publicationId: string,
  pubData: any
): Promise<boolean> {
  try {
    // Verificar se já existe processo com este número
    const existingCase = await prisma.case.findFirst({
      where: { companyId, processNumber: pubData.numeroProcesso },
    });

    if (existingCase) {
      // Apenas marcar como importado
      await prisma.publication.update({
        where: { id: publicationId },
        data: {
          imported: true,
          importedCaseId: existingCase.id,
          importedAt: new Date(),
        },
      });
      return true;
    }

    // Criar cliente genérico
    const client = await prisma.client.create({
      data: {
        companyId,
        name: `Parte - ${pubData.numeroProcesso}`,
        notes: `Cliente criado automaticamente via monitoramento. Tribunal: ${pubData.siglaTribunal || pubData.tribunal}. Aguardando dados completos.`,
      },
    });

    // Criar caso
    const newCase = await prisma.case.create({
      data: {
        companyId,
        clientId: client.id,
        processNumber: pubData.numeroProcesso,
        court: pubData.siglaTribunal || pubData.tribunal,
        subject: pubData.tipoComunicacao || pubData.tipo || 'Processo importado via monitoramento',
        status: 'ACTIVE',
        notes: pubData.textoComunicacao || pubData.texto,
      },
    });

    // Atualizar publicação
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        imported: true,
        importedCaseId: newCase.id,
        importedClientId: client.id,
        importedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    appLogger.error('ADVAPI Webhook: Auto import failed', error as Error, {
      publicationId,
      processNumber: pubData.numeroProcesso,
    });
    return false;
  }
}

export default router;
