import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import datajudService from '../services/datajud.service';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { AIService } from '../services/ai/ai.service';

// Função utilitária para formatar o último movimento
function getUltimoAndamento(movimentos: any[]): string | null {
  if (!movimentos || movimentos.length === 0) return null;

  // Ordena por data decrescente e pega o mais recente
  const sorted = [...movimentos].sort((a, b) =>
    new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );

  const ultimo = sorted[0];
  const data = new Date(ultimo.dataHora).toLocaleDateString('pt-BR');
  return `${ultimo.nome} - ${data}`;
}

export class CaseController {

  async create(req: AuthRequest, res: Response) {
    try {
      const { clientId, processNumber, court, subject, value, notes, status, deadline, informarCliente, linkProcesso } = req.body;
      const companyId = req.user!.companyId;

      // Converter strings vazias em null/undefined
      const cleanValue = value === '' || value === null || value === undefined ? undefined : parseFloat(value);
      const cleanLinkProcesso = linkProcesso === '' ? null : linkProcesso;
      const cleanDeadline = deadline && deadline !== '' ? new Date(deadline) : undefined;
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

      // Verifica se o processo já existe
      const existingCase = await prisma.case.findUnique({
        where: { processNumber },
      });

      if (existingCase) {
        return res.status(400).json({ error: 'Número de processo já cadastrado' });
      }

      // Tenta buscar dados do processo no DataJud
      let datajudData = null;
      try {
        datajudData = await datajudService.searchCaseAllTribunals(processNumber);
      } catch (error) {
        console.error('Erro ao buscar no DataJud:', error);
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
                  console.log(`Resumo gerado automaticamente para novo processo ${caseData.id} usando ${result.provider}/${result.model}`);
                }
              })
              .catch((error) => {
                console.error('Erro ao gerar resumo automático:', error);
                // Não impede a criação, apenas loga o erro
              });
          }
        } catch (error) {
          console.error('Erro ao verificar configuração de IA:', error);
          // Não impede a criação, apenas loga o erro
        }
      }

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
      console.error('Erro ao criar processo:', error);
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
          _count: {
            select: {
              movements: true,
            },
          },
        },
      });

      res.json({ data: cases });
    } catch (error) {
      console.error('Erro ao listar processos:', error);
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
      console.error('Erro ao buscar processo:', error);
      res.status(500).json({ error: 'Erro ao buscar processo' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { court, subject, value, status, deadline, notes, informarCliente, linkProcesso } = req.body;

      const caseData = await prisma.case.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!caseData) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Converter deadline se fornecido
      const cleanDeadline = deadline && deadline !== '' ? new Date(deadline) : undefined;

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          court,
          ...(subject !== undefined && { subject: sanitizeString(subject) || '' }),
          value,
          status,
          ...(deadline !== undefined && { deadline: cleanDeadline }),
          notes: sanitizeString(notes),
          ...(informarCliente !== undefined && { informarCliente: sanitizeString(informarCliente) }),
          ...(linkProcesso !== undefined && { linkProcesso }),
        },
      });

      res.json(updatedCase);
    } catch (error) {
      console.error('Erro ao atualizar processo:', error);
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
                console.log(`Resumo gerado automaticamente para processo ${id} usando ${result.provider}/${result.model}`);
              }
            })
            .catch((error) => {
              console.error('Erro ao gerar resumo automático:', error);
              // Não impede a sincronização, apenas loga o erro
            });
        }
      } catch (error) {
        console.error('Erro ao verificar configuração de IA:', error);
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
      console.error('Erro ao sincronizar movimentações:', error);
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
      console.error('Erro ao gerar resumo:', error);
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
        const value = caseItem.value ? `"R$ ${caseItem.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"` : '""';
        const status = `"${caseItem.status || ''}"`;
        const lastSyncedAt = caseItem.lastSyncedAt ? `"${new Date(caseItem.lastSyncedAt).toLocaleString('pt-BR')}"` : '""';
        const createdAt = `"${new Date(caseItem.createdAt).toLocaleDateString('pt-BR')}"`;
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
      console.error('Erro ao exportar processos:', error);
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

          // Verificar se processo já existe
          const existingCase = await prisma.case.findUnique({
            where: { processNumber: record['Número do Processo'].trim() },
          });

          if (existingCase) {
            results.errors.push({
              line: lineNumber,
              processNumber: record['Número do Processo'],
              error: 'Número de processo já cadastrado',
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
            error: error.message || 'Erro desconhecido',
          });
        }
      }

      res.json({
        message: 'Importação concluída',
        results,
      });
    } catch (error) {
      console.error('Erro ao importar processos:', error);
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
      console.error('Erro ao buscar atualizações pendentes:', error);
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
      console.error('Erro ao reconhecer atualização:', error);
      res.status(500).json({ error: 'Erro ao reconhecer atualização' });
    }
  }

  // Busca rápida para autocomplete (apenas campos essenciais)
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const cases = await prisma.case.findMany({
        where: {
          companyId,
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
      console.error('Erro ao buscar processos:', error);
      res.status(500).json({ error: 'Erro ao buscar processos' });
    }
  }
}

export default new CaseController();
