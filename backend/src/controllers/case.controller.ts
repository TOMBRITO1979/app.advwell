import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import datajudService from '../services/datajud.service';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { AIService } from '../services/ai/ai.service';
import { sendCaseUpdateNotification } from '../utils/email';
import AuditService from '../services/audit.service';
import { auditLogService } from '../services/audit-log.service';
import { Decimal } from '@prisma/client/runtime/library';
import { appLogger } from '../utils/logger';

// Helper para converter Prisma Decimal para number
const toNumber = (value: Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
};

// Função para corrigir timezone de datas (evita que dia 31 vire dia 30)
function fixDateTimezone(dateString: string): Date {
  // Extrai partes da data para evitar problemas de timezone
  // new Date("2025-12-31") interpreta como UTC meia-noite, que no Brasil (UTC-3) é dia anterior
  // Solução: extrair ano/mês/dia e criar Date no fuso local
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  // Cria a data com meio-dia no timezone local para evitar edge cases
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

// Função utilitária para formatar o último movimento
function getUltimoAndamento(movimentos: any[]): string | null {
  if (!movimentos || movimentos.length === 0) return null;

  // Ordena por data decrescente e pega o mais recente
  const sorted = [...movimentos].sort((a, b) =>
    new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );

  const ultimo = sorted[0];
  const data = new Date(ultimo.dataHora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `${ultimo.nome} - ${data}`;
}

// Função para criar/atualizar evento de prazo na agenda
async function syncDeadlineToSchedule(
  caseId: string,
  companyId: string,
  deadline: Date | null,
  processNumber: string,
  clientId: string,
  createdBy: string,
  deadlineResponsibleId?: string | null
): Promise<void> {
  try {
    // Buscar evento existente vinculado a este processo com tipo PRAZO
    const existingEvent = await prisma.scheduleEvent.findFirst({
      where: {
        caseId,
        companyId,
        type: 'PRAZO',
      },
    });

    if (deadline) {
      // Adicionar hora 12:00 para evitar problema de fuso horário
      const deadlineWithTime = new Date(deadline);
      deadlineWithTime.setHours(12, 0, 0, 0);

      if (existingEvent) {
        // Atualizar evento existente
        await prisma.scheduleEvent.update({
          where: { id: existingEvent.id },
          data: {
            date: deadlineWithTime,
            title: `Prazo: ${processNumber}`,
            // Atualizar usuário atribuído se houver responsável pelo prazo
            ...(deadlineResponsibleId !== undefined && {
              assignedUsers: {
                deleteMany: {},
                ...(deadlineResponsibleId && {
                  create: [{ userId: deadlineResponsibleId, companyId }], // TAREFA 4.3
                }),
              },
            }),
          },
        });
      } else {
        // Criar novo evento
        await prisma.scheduleEvent.create({
          data: {
            companyId,
            title: `Prazo: ${processNumber}`,
            type: 'PRAZO',
            priority: 'ALTA',
            date: deadlineWithTime,
            caseId,
            clientId,
            createdBy,
            completed: false,
            // Adicionar usuário atribuído se houver responsável pelo prazo
            ...(deadlineResponsibleId && {
              assignedUsers: {
                create: [{ userId: deadlineResponsibleId, companyId }], // TAREFA 4.3
              },
            }),
          },
        });
      }
    } else {
      // Se o prazo foi removido, excluir o evento
      if (existingEvent) {
        await prisma.scheduleEvent.delete({
          where: { id: existingEvent.id },
        });
      }
    }
  } catch (error) {
    appLogger.error('Erro ao sincronizar prazo com agenda', error as Error);
    // Não lança erro para não interromper o fluxo principal
  }
}

export class CaseController {

  async create(req: AuthRequest, res: Response) {
    try {
      const { clientId, processNumber, court, subject, value, notes, status, deadline, deadlineResponsibleId, informarCliente, linkProcesso } = req.body;
      const companyId = req.user!.companyId;

      // Converter strings vazias em null/undefined
      const cleanValue = value === '' || value === null || value === undefined ? undefined : parseFloat(value);
      const cleanLinkProcesso = linkProcesso === '' ? null : linkProcesso;
      const cleanDeadline = deadline && deadline !== '' ? fixDateTimezone(deadline) : undefined;
      const cleanStatus = status || 'ACTIVE';

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verifica se o cliente pertence à mesma empresa
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verifica se o processo já existe na mesma empresa
      const existingCase = await prisma.case.findFirst({
        where: {
          companyId,
          processNumber
        },
      });

      if (existingCase) {
        return res.status(400).json({ error: 'Número de processo já cadastrado nesta empresa' });
      }

      // Tenta buscar dados do processo no DataJud
      let datajudData = null;
      try {
        datajudData = await datajudService.searchCaseAllTribunals(processNumber);
      } catch (error) {
        appLogger.error('Erro ao buscar no DataJud', error as Error);
      }

      // Formata o último andamento se houver dados do DataJud
      const ultimoAndamento = datajudData?.movimentos
        ? getUltimoAndamento(datajudData.movimentos)
        : null;

      // Cria o processo
      const caseData = await prisma.case.create({
        data: {
          companyId,
          clientId,
          processNumber,
          court: court || datajudData?.tribunal || '',
          subject: sanitizeString(subject || datajudData?.assuntos?.[0]?.nome) || '',
          status: cleanStatus,
          deadline: cleanDeadline,
          ...(deadlineResponsibleId && { deadlineResponsibleId }),
          value: cleanValue,
          notes: sanitizeString(notes),
          ultimoAndamento,
          informarCliente: sanitizeString(informarCliente) || null,
          linkProcesso: cleanLinkProcesso,
          lastSyncedAt: datajudData ? new Date() : null,
        },
      });

      // Se encontrou dados no DataJud, cria as movimentações
      if (datajudData?.movimentos && datajudData.movimentos.length > 0) {
        await prisma.caseMovement.createMany({
          data: datajudData.movimentos.map((mov) => ({
            caseId: caseData.id,
            companyId, // TAREFA 4.3: Isolamento de tenant direto
            movementCode: mov.codigo,
            movementName: mov.nome,
            movementDate: new Date(mov.dataHora),
            description: mov.complementosTabelados
              ?.map((c) => `${c.nome}: ${c.descricao}`)
              .join('; '),
          })),
        });

        // Hook: Gerar resumo automático se configurado
        try {
          const aiConfig = await prisma.aIConfig.findUnique({
            where: { companyId },
          });

          if (aiConfig && aiConfig.enabled && aiConfig.autoSummarize) {
            // Gera resumo em background (não bloqueia resposta)
            AIService.generateCaseSummary(caseData.id, companyId)
              .then(async (result) => {
                if (result.success && result.summary) {
                  await prisma.case.update({
                    where: { id: caseData.id },
                    data: { informarCliente: result.summary },
                  });
                  appLogger.info('Resumo gerado automaticamente para novo processo', {
                    caseId: caseData.id,
                    provider: result.provider,
                    model: result.model
                  });
                }
              })
              .catch((error) => {
                appLogger.error('Erro ao gerar resumo automático', error as Error);
                // Não impede a criação, apenas loga o erro
              });
          }
        } catch (error) {
          appLogger.error('Erro ao verificar configuração de IA', error as Error);
          // Não impede a criação, apenas loga o erro
        }
      }

      // Log de auditoria: processo criado (CaseAuditLog)
      await AuditService.logCaseCreated(
        caseData.id,
        req.user!.userId,
        processNumber
      );

      // Log de auditoria genérico (AuditLog com valores completos)
      await auditLogService.logCaseCreate(caseData, req);

      // Retorna o processo com as movimentações
      const caseWithMovements = await prisma.case.findUnique({
        where: { id: caseData.id },
        include: {
          client: true,
          movements: {
            orderBy: { movementDate: 'desc' },
          },
        },
      });

      res.status(201).json(caseWithMovements);
    } catch (error) {
      appLogger.error('Erro ao criar processo', error as Error);
      res.status(500).json({ error: 'Erro ao criar processo' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '', status = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        companyId,
        ...(status && { status: String(status) }),
        ...(search && {
          OR: [
            { processNumber: { contains: String(search) } },
            { subject: { contains: String(search), mode: 'insensitive' } },
            { client: { name: { contains: String(search), mode: 'insensitive' } } },
          ],
        }),
      };

      const cases = await prisma.case.findMany({
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
            },
          },
          deadlineResponsible: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              movements: true,
            },
          },
        },
      });

      res.json({ data: cases });
    } catch (error) {
      appLogger.error('Erro ao listar processos', error as Error);
      res.status(500).json({ error: 'Erro ao listar processos' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          client: true,
          deadlineResponsible: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          movements: {
            orderBy: { movementDate: 'desc' },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
          parts: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      res.json(caseData);
    } catch (error) {
      appLogger.error('Erro ao buscar processo', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processo' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { court, subject, value, status, deadline, deadlineResponsibleId, notes, informarCliente, linkProcesso } = req.body;

      const oldCaseData = await prisma.case.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          client: true,
          company: true,
          deadlineResponsible: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!oldCaseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Guardar referência para compatibilidade
      const caseData = oldCaseData;

      // Converter deadline se fornecido (null para limpar o campo)
      const cleanDeadline = deadline && deadline !== '' ? fixDateTimezone(deadline) : null;

      // Sanitiza informarCliente se fornecido
      const sanitizedInformarCliente = informarCliente !== undefined ? sanitizeString(informarCliente) : undefined;

      // Verificar se o prazo mudou para resetar o status de cumprido
      const deadlineChanged = deadline !== undefined && (
        (cleanDeadline === null && caseData.deadline !== null) ||
        (cleanDeadline !== null && caseData.deadline === null) ||
        (cleanDeadline !== null && caseData.deadline !== null && cleanDeadline.getTime() !== new Date(caseData.deadline).getTime())
      );

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          court,
          ...(subject !== undefined && { subject: sanitizeString(subject) || '' }),
          value,
          status,
          ...(deadline !== undefined && { deadline: cleanDeadline }),
          ...(deadlineResponsibleId !== undefined && { deadlineResponsibleId: deadlineResponsibleId || null }),
          notes: sanitizeString(notes),
          ...(sanitizedInformarCliente !== undefined && { informarCliente: sanitizedInformarCliente }),
          ...(linkProcesso !== undefined && { linkProcesso }),
          // Se o prazo mudou, resetar o status de cumprido (sincroniza com aba Prazos)
          ...(deadlineChanged && { deadlineCompleted: false, deadlineCompletedAt: null }),
        },
      });

      // Logs de auditoria para campos alterados
      if (status && status !== caseData.status) {
        await AuditService.logStatusChanged(
          id,
          req.user!.userId,
          caseData.status,
          status
        );
      }

      if (deadline !== undefined) {
        const oldDeadline = caseData.deadline;
        const newDeadline = cleanDeadline || null;
        const oldTime = oldDeadline ? new Date(oldDeadline).getTime() : null;
        const newTime = newDeadline ? new Date(newDeadline).getTime() : null;

        if (oldTime !== newTime) {
          await AuditService.logDeadlineChanged(
            id,
            req.user!.userId,
            oldDeadline,
            newDeadline
          );
        }
      }

      if (deadlineResponsibleId !== undefined) {
        const oldResponsibleId = caseData.deadlineResponsibleId;
        const newResponsibleId = deadlineResponsibleId || null;

        if (oldResponsibleId !== newResponsibleId) {
          // Buscar nome do novo responsável se houver
          let newResponsibleName: string | null = null;
          if (newResponsibleId) {
            const newResponsible = await prisma.user.findUnique({
              where: { id: newResponsibleId },
              select: { name: true },
            });
            newResponsibleName = newResponsible?.name || null;
          }

          await AuditService.logDeadlineResponsibleChanged(
            id,
            req.user!.userId,
            caseData.deadlineResponsible?.name || null,
            newResponsibleName
          );
        }
      }

      // Sincronizar prazo com a agenda se o prazo foi alterado
      if (deadline !== undefined) {
        await syncDeadlineToSchedule(
          id,
          companyId!,
          cleanDeadline,
          caseData.processNumber,
          caseData.clientId,
          req.user!.userId,
          deadlineResponsibleId !== undefined ? deadlineResponsibleId : caseData.deadlineResponsibleId
        );
      }

      // Enviar email ao cliente se informarCliente foi atualizado e não está vazio
      if (sanitizedInformarCliente !== undefined &&
          sanitizedInformarCliente &&
          sanitizedInformarCliente.trim() !== '' &&
          sanitizedInformarCliente !== caseData.informarCliente) {

        // Verificar se o cliente tem email
        if (caseData.client.email) {
          try {
            await sendCaseUpdateNotification(
              caseData.client.email,
              caseData.client.name,
              caseData.processNumber,
              sanitizedInformarCliente,
              caseData.company.name
            );
            appLogger.info('Email de atualização enviado para cliente sobre processo', {
              clientEmail: caseData.client.email,
              processNumber: caseData.processNumber
            });
          } catch (emailError) {
            appLogger.error('Erro ao enviar email de notificação', emailError as Error);
            // Não bloqueia a atualização se o email falhar
          }
        } else {
          appLogger.info('Cliente não possui email cadastrado - Notificação não enviada', {
            clientName: caseData.client.name
          });
        }
      }

      // Log de auditoria genérico (AuditLog com valores completos)
      await auditLogService.logCaseUpdate(oldCaseData, updatedCase, req);

      res.json(updatedCase);
    } catch (error) {
      appLogger.error('Erro ao atualizar processo', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar processo' });
    }
  }

  async syncMovements(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Busca dados atualizados no DataJud
      const datajudData = await datajudService.searchCaseAllTribunals(
        caseData.processNumber
      );

      if (!datajudData) {
        return res.status(404).json({ error: 'Processo não encontrado no DataJud' });
      }

      // Deleta movimentações antigas
      await prisma.caseMovement.deleteMany({
        where: { caseId: id },
      });

      // Cria as novas movimentações
      if (datajudData.movimentos && datajudData.movimentos.length > 0) {
        await prisma.caseMovement.createMany({
          data: datajudData.movimentos.map((mov) => ({
            caseId: id,
            companyId: companyId!, // TAREFA 4.3: Isolamento de tenant direto
            movementCode: mov.codigo,
            movementName: mov.nome,
            movementDate: new Date(mov.dataHora),
            description: mov.complementosTabelados
              ?.map((c) => `${c.nome}: ${c.descricao}`)
              .join('; '),
          })),
        });
      }

      // Formata o último andamento
      const ultimoAndamento = datajudData.movimentos
        ? getUltimoAndamento(datajudData.movimentos)
        : null;

      // Atualiza a data de sincronização e o último andamento
      await prisma.case.update({
        where: { id },
        data: {
          lastSyncedAt: new Date(),
          ultimoAndamento,
        },
      });

      // Log de auditoria: sincronização com DataJud
      const movementsCount = datajudData.movimentos?.length || 0;
      await AuditService.logDataJudSync(
        id,
        req.user!.userId,
        movementsCount
      );

      // Hook: Gerar resumo automático se configurado
      try {
        const aiConfig = await prisma.aIConfig.findUnique({
          where: { companyId: companyId! },
        });

        if (aiConfig && aiConfig.enabled && aiConfig.autoSummarize) {
          // Gera resumo em background (não bloqueia resposta)
          AIService.generateCaseSummary(id, companyId!)
            .then(async (result) => {
              if (result.success && result.summary) {
                await prisma.case.update({
                  where: { id },
                  data: { informarCliente: result.summary },
                });
                appLogger.info('Resumo gerado automaticamente para processo', {
                  caseId: id,
                  provider: result.provider,
                  model: result.model
                });
              }
            })
            .catch((error) => {
              appLogger.error('Erro ao gerar resumo automático', error as Error);
              // Não impede a sincronização, apenas loga o erro
            });
        }
      } catch (error) {
        appLogger.error('Erro ao verificar configuração de IA', error as Error);
        // Não impede a sincronização, apenas loga o erro
      }

      // Retorna o processo atualizado
      const updatedCase = await prisma.case.findUnique({
        where: { id },
        include: {
          movements: {
            orderBy: { movementDate: 'desc' },
          },
        },
      });

      res.json(updatedCase);
    } catch (error) {
      appLogger.error('Erro ao sincronizar movimentações', error as Error);
      res.status(500).json({ error: 'Erro ao sincronizar movimentações' });
    }
  }

  async generateSummary(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId!;

      // Verificar se o processo existe e pertence à empresa
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Gerar resumo usando IA
      const result = await AIService.generateCaseSummary(id, companyId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Atualizar o campo informarCliente com o resumo gerado
      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          informarCliente: result.summary,
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

      res.json({
        message: 'Resumo gerado com sucesso',
        case: updatedCase,
        provider: result.provider,
        model: result.model,
      });
    } catch (error) {
      appLogger.error('Erro ao gerar resumo', error as Error);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }

  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar todos os processos com informações do cliente
      const cases = await prisma.case.findMany({
        where: {
          companyId,
        },
        include: {
          client: {
            select: {
              name: true,
              cpf: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Cabeçalho do CSV
      const csvHeader = 'Número do Processo,Cliente,CPF Cliente,Tribunal,Assunto,Valor,Status,Última Sincronização,Data de Cadastro,Observações\n';

      // Linhas do CSV
      const csvRows = cases.map(caseItem => {
        const processNumber = `"${caseItem.processNumber || ''}"`;
        const clientName = `"${caseItem.client?.name || ''}"`;
        const clientCpf = `"${caseItem.client?.cpf || ''}"`;
        const court = `"${caseItem.court || ''}"`;
        const subject = `"${caseItem.subject || ''}"`;
        const value = caseItem.value ? `"R$ ${toNumber(caseItem.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"` : '""';
        const status = `"${caseItem.status || ''}"`;
        const lastSyncedAt = caseItem.lastSyncedAt ? `"${new Date(caseItem.lastSyncedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""';
        const createdAt = `"${new Date(caseItem.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`;
        const notes = `"${(caseItem.notes || '').replace(/"/g, '""')}"`;

        return `${processNumber},${clientName},${clientCpf},${court},${subject},${value},${status},${lastSyncedAt},${createdAt},${notes}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      // Configurar headers para download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=processos_${new Date().toISOString().split('T')[0]}.csv`);

      // Adicionar BOM para Excel reconhecer UTF-8
      res.send('\ufeff' + csv);
    } catch (error) {
      appLogger.error('Erro ao exportar processos', error as Error);
      res.status(500).json({ error: 'Erro ao exportar processos' });
    }
  }

  async importCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Remover BOM se existir
      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      // Parse do CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });

      const results = {
        total: records.length,
        success: 0,
        errors: [] as { line: number; processNumber: string; error: string }[],
      };

      // Processar cada linha
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        const lineNumber = i + 2;

        try {
          // Validar campos obrigatórios
          if (!record['Número do Processo'] || record['Número do Processo'].trim() === '') {
            results.errors.push({
              line: lineNumber,
              processNumber: record['Número do Processo'] || '(vazio)',
              error: 'Número do processo é obrigatório',
            });
            continue;
          }

          if (!record['CPF Cliente'] && !record['Cliente']) {
            results.errors.push({
              line: lineNumber,
              processNumber: record['Número do Processo'],
              error: 'CPF ou Nome do cliente é obrigatório',
            });
            continue;
          }

          // Buscar cliente pelo CPF ou nome
          const client = await prisma.client.findFirst({
            where: {
              companyId,
              OR: [
                { cpf: record['CPF Cliente']?.trim() },
                { name: record['Cliente']?.trim() },
              ],
            },
          });

          if (!client) {
            results.errors.push({
              line: lineNumber,
              processNumber: record['Número do Processo'],
              error: `Cliente não encontrado (CPF: ${record['CPF Cliente'] || 'N/A'}, Nome: ${record['Cliente'] || 'N/A'})`,
            });
            continue;
          }

          // Verificar se processo já existe na empresa
          const existingCase = await prisma.case.findFirst({
            where: {
              companyId,
              processNumber: record['Número do Processo'].trim()
            },
          });

          if (existingCase) {
            results.errors.push({
              line: lineNumber,
              processNumber: record['Número do Processo'],
              error: 'Número de processo já cadastrado nesta empresa',
            });
            continue;
          }

          // Converter valor se existir
          let value = null;
          if (record.Valor) {
            const valueStr = record.Valor.replace(/[R$\s.]/g, '').replace(',', '.');
            value = parseFloat(valueStr);
            if (isNaN(value)) {
              value = null;
            }
          }

          // Criar processo
          await prisma.case.create({
            data: {
              companyId,
              clientId: client.id,
              processNumber: record['Número do Processo'].trim(),
              court: record.Tribunal?.trim() || '',
              subject: record.Assunto?.trim() || '',
              value,
              status: record.Status?.trim() || 'ACTIVE',
              notes: record['Observações']?.trim() || null,
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            line: lineNumber,
            processNumber: record['Número do Processo'] || '(vazio)',
            error: 'Erro ao processar linha', // Safe: no error.message exposure
          });
        }
      }

      res.json({
        message: 'Importação concluída',
        results,
      });
    } catch (error) {
      appLogger.error('Erro ao importar processos', error as Error);
      res.status(500).json({ error: 'Erro ao importar processos' });
    }
  }

  // Lista processos com atualizações pendentes (não reconhecidas pelo advogado)
  async getPendingUpdates(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Busca processos onde:
      // 1. lastSyncedAt não é null (foi sincronizado)
      // 2. lastAcknowledgedAt é null OU lastSyncedAt > lastAcknowledgedAt
      const pendingUpdates = await prisma.case.findMany({
        where: {
          companyId,
          lastSyncedAt: { not: null },
          OR: [
            { lastAcknowledgedAt: null },
            {
              AND: [
                { lastSyncedAt: { not: null } },
                { lastAcknowledgedAt: { not: null } },
              ],
            },
          ],
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
          movements: {
            orderBy: {
              movementDate: 'desc',
            },
            take: 1, // Pega apenas o último movimento
          },
        },
        orderBy: {
          lastSyncedAt: 'desc', // Mais recentes primeiro
        },
      });

      // Filtra apenas os que realmente têm atualização pendente
      const filtered = pendingUpdates.filter(c => {
        if (!c.lastAcknowledgedAt) return true;
        if (!c.lastSyncedAt) return false;
        return c.lastSyncedAt > c.lastAcknowledgedAt;
      });

      res.json(filtered);
    } catch (error) {
      appLogger.error('Erro ao buscar atualizações pendentes', error as Error);
      res.status(500).json({ error: 'Erro ao buscar atualizações pendentes' });
    }
  }

  // Marca um processo como "ciente" (advogado reconheceu a atualização)
  async acknowledgeUpdate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verifica se o processo existe e pertence à empresa
      const existingCase = await prisma.case.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!existingCase) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Atualiza o lastAcknowledgedAt para agora
      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          lastAcknowledgedAt: new Date(),
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

      res.json({
        message: 'Atualização reconhecida com sucesso',
        case: updatedCase,
      });
    } catch (error) {
      appLogger.error('Erro ao reconhecer atualização', error as Error);
      res.status(500).json({ error: 'Erro ao reconhecer atualização' });
    }
  }

  // Busca rápida para autocomplete (apenas campos essenciais)
  // Suporta filtro opcional por clientId para mostrar apenas processos do cliente
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q = '', clientId = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const cases = await prisma.case.findMany({
        where: {
          companyId,
          // Filtro por cliente (se fornecido)
          ...(clientId && { clientId: String(clientId) }),
          // Filtro por texto (se fornecido)
          ...(q && {
            OR: [
              { processNumber: { contains: String(q) } },
              { subject: { contains: String(q), mode: 'insensitive' as const } },
            ],
          }),
        },
        take: 10, // Limitar a 10 resultados
        select: {
          id: true,
          processNumber: true,
          subject: true,
        },
        orderBy: { processNumber: 'asc' },
      });

      res.json(cases);
    } catch (error) {
      appLogger.error('Erro ao buscar processos', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processos' });
    }
  }

  // Lista processos com prazo definido (ordenados por urgência)
  async getDeadlines(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { search = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Calcular data limite para prazos cumpridos (24 horas atrás)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const where: any = {
        companyId,
        deadline: { not: null }, // Apenas processos com prazo definido
        // Excluir prazos cumpridos há mais de 24 horas
        OR: [
          { deadlineCompleted: false }, // Não cumpridos
          {
            deadlineCompleted: true,
            deadlineCompletedAt: { gte: twentyFourHoursAgo } // Cumpridos nas últimas 24h
          },
        ],
        ...(search && {
          AND: [
            {
              OR: [
                { processNumber: { contains: String(search) } },
                { subject: { contains: String(search), mode: 'insensitive' } },
                { client: { name: { contains: String(search), mode: 'insensitive' } } },
              ],
            },
          ],
        }),
      };

      const cases = await prisma.case.findMany({
        where,
        orderBy: [
          { deadlineCompleted: 'asc' }, // Não cumpridos primeiro
          { deadline: 'asc' }, // Ordenar por prazo mais próximo
        ],
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
          deadlineResponsible: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(cases);
    } catch (error) {
      appLogger.error('Erro ao buscar prazos', error as Error);
      res.status(500).json({ error: 'Erro ao buscar prazos' });
    }
  }

  // Marcar prazo como cumprido/não cumprido
  async toggleDeadlineCompleted(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { completed } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se o processo pertence à empresa
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Atualizar status do prazo
      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          deadlineCompleted: completed,
          deadlineCompletedAt: completed ? new Date() : null,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
        },
      });

      res.json(updatedCase);
    } catch (error) {
      appLogger.error('Erro ao atualizar status do prazo', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar status do prazo' });
    }
  }

  // Atualizar prazo do processo
  async updateDeadline(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { deadline, deadlineResponsibleId } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se o processo pertence à empresa
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Corrigir timezone da deadline (evita que dia 06 vire dia 05)
      const fixedDeadline = deadline ? fixDateTimezone(deadline) : null;

      // Atualizar prazo
      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          deadline: fixedDeadline,
          deadlineResponsibleId: deadlineResponsibleId || null,
          // Se o prazo mudou, resetar o status de cumprido
          deadlineCompleted: false,
          deadlineCompletedAt: null,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
          deadlineResponsible: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Sincronizar prazo com a agenda
      await syncDeadlineToSchedule(
        id,
        companyId,
        fixedDeadline,
        caseData.processNumber,
        caseData.clientId,
        req.user!.userId,
        deadlineResponsibleId || null
      );

      res.json(updatedCase);
    } catch (error) {
      appLogger.error('Erro ao atualizar prazo', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar prazo' });
    }
  }

  // Excluir processo
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se o processo pertence à empresa
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Log de auditoria genérico ANTES de excluir (AuditLog com valores completos)
      await auditLogService.logCaseDelete(caseData, req);

      // Excluir o processo (as relações com onDelete: Cascade serão excluídas automaticamente)
      await prisma.case.delete({
        where: { id },
      });

      res.json({ message: 'Processo excluído com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir processo', error as Error);
      res.status(500).json({ error: 'Erro ao excluir processo' });
    }
  }

  // Buscar logs de auditoria de um processo
  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Buscar logs de auditoria
      const auditLogs = await AuditService.getCaseAuditLogs(id);

      res.json(auditLogs);
    } catch (error) {
      appLogger.error('Erro ao buscar logs de auditoria', error as Error);
      res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  }

  // Obter prazos vencendo hoje (para notificação no sidebar)
  async getDeadlinesToday(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Usar query raw SQL para comparar apenas a data (ignorando timezone)
      const cases = await prisma.$queryRaw<Array<{
        id: string;
        processNumber: string;
        subject: string | null;
        deadline: Date;
        clientName: string | null;
      }>>`
        SELECT c.id, c."processNumber", c.subject, c.deadline, cl.name as "clientName"
        FROM cases c
        LEFT JOIN clients cl ON c."clientId" = cl.id
        WHERE c."companyId" = ${companyId}
          AND c."deadlineCompleted" = false
          AND c.deadline IS NOT NULL
          AND DATE(c.deadline) = CURRENT_DATE
        ORDER BY c.deadline ASC
      `;

      res.json({
        count: cases.length,
        cases,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar prazos vencendo hoje', error as Error);
      res.status(500).json({ error: 'Erro ao buscar prazos vencendo hoje' });
    }
  }
}

export default new CaseController();
