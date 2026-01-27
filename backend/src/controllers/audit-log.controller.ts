import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { auditLogService } from '../services/audit-log.service';
import { AuditEntityType, AuditAction } from '@prisma/client';
import { appLogger } from '../utils/logger';
import PDFDocument from 'pdfkit';

/**
 * Lista logs de auditoria
 * Admin: vê todos da empresa
 * User: vê apenas seus próprios logs
 */
export const list = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const {
      entityType,
      action,
      userId: filterUserId,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const pagination = {
      page: parseInt(page as string, 10) || 1,
      limit: Math.min(parseInt(limit as string, 10) || 20, 100), // Max 100
    };

    // Ajustar endDate para incluir o final do dia (23:59:59.999)
    let parsedEndDate: Date | undefined;
    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      parsedEndDate.setHours(23, 59, 59, 999);
    }

    const filters = {
      entityType: entityType as AuditEntityType | undefined,
      action: action as AuditAction | undefined,
      userId: filterUserId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: parsedEndDate,
      search: search as string | undefined,
    };

    // Usuários não-admin só veem seus próprios logs
    if (role === 'USER') {
      const result = await auditLogService.getByUser(userId, companyId, filters, pagination);
      return res.json(result);
    }

    // Admin e Super Admin veem todos os logs da empresa
    const result = await auditLogService.getByCompany(companyId, filters, pagination);
    res.json(result);
  } catch (error) {
    appLogger.error('Error listing audit logs:', error as Error);
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
};

/**
 * Lista apenas os logs do usuário atual
 */
export const getMyLogs = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.userId;
    const {
      entityType,
      action,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const pagination = {
      page: parseInt(page as string, 10) || 1,
      limit: Math.min(parseInt(limit as string, 10) || 20, 100),
    };

    const filters = {
      entityType: entityType as AuditEntityType | undefined,
      action: action as AuditAction | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await auditLogService.getByUser(userId, companyId, filters, pagination);
    res.json(result);
  } catch (error) {
    appLogger.error('Error fetching my audit logs:', error as Error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

/**
 * Lista logs de uma entidade específica (cliente ou processo)
 */
export const getByEntity = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const { type, entityId } = req.params;

    // Valida o tipo de entidade
    if (!['CLIENT', 'CASE'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid entity type. Use CLIENT or CASE.' });
    }

    const entityType = type.toUpperCase() as AuditEntityType;

    // Busca os logs
    let logs = await auditLogService.getByEntity(entityType, entityId, companyId);

    // Se usuário comum, filtra apenas seus logs
    if (role === 'USER') {
      logs = logs.filter((log) => log.userId === userId);
    }

    res.json(logs);
  } catch (error) {
    appLogger.error('Error fetching entity audit logs:', error as Error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

/**
 * Exporta logs em CSV
 */
export const exportCSV = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const {
      entityType,
      action,
      userId: filterUserId,
      startDate,
      endDate,
    } = req.query;

    const filters = {
      entityType: entityType as AuditEntityType | undefined,
      action: action as AuditAction | undefined,
      userId: role === 'USER' ? userId : (filterUserId as string | undefined),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    // Busca todos os logs (até 10000 para export)
    const pagination = { page: 1, limit: 10000 };

    const result = role === 'USER'
      ? await auditLogService.getByUser(userId, companyId, filters, pagination)
      : await auditLogService.getByCompany(companyId, filters, pagination);

    // Monta o CSV
    const headers = [
      'Data/Hora',
      'Usuario',
      'Acao',
      'Entidade',
      'Nome',
      'Descricao',
      'Campos Alterados',
      'IP',
    ];

    const actionLabels: Record<string, string> = {
      CREATE: 'Criacao',
      UPDATE: 'Atualizacao',
      DELETE: 'Exclusao',
    };

    const entityLabels: Record<string, string> = {
      CLIENT: 'Cliente',
      CASE: 'Processo',
      SCHEDULE_EVENT: 'Agenda',
    };

    const rows = result.logs.map((log) => {
      const date = new Date(log.createdAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });

      return [
        date,
        log.userName || 'N/A',
        actionLabels[log.action] || log.action,
        entityLabels[log.entityType] || log.entityType,
        log.entityName || 'N/A',
        log.description || 'N/A',
        log.changedFields.join('; '),
        log.ipAddress || 'N/A',
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Envia o arquivo
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send('\ufeff' + csv); // BOM para Excel
  } catch (error) {
    appLogger.error('Error exporting audit logs:', error as Error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
};

/**
 * Exporta logs em PDF
 */
export const exportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const {
      entityType,
      action,
      userId: filterUserId,
      startDate,
      endDate,
      userName: filterUserName,
    } = req.query;

    // Ajustar endDate para incluir o final do dia
    let parsedEndDate: Date | undefined;
    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      parsedEndDate.setHours(23, 59, 59, 999);
    }

    const filters = {
      entityType: entityType as AuditEntityType | undefined,
      action: action as AuditAction | undefined,
      userId: role === 'USER' ? userId : (filterUserId as string | undefined),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: parsedEndDate,
    };

    // Busca todos os logs (até 10000 para export)
    const pagination = { page: 1, limit: 10000 };

    const result = role === 'USER'
      ? await auditLogService.getByUser(userId, companyId, filters, pagination)
      : await auditLogService.getByCompany(companyId, filters, pagination);

    const actionLabels: Record<string, string> = {
      CREATE: 'Criação',
      UPDATE: 'Atualização',
      DELETE: 'Exclusão',
    };

    const entityLabels: Record<string, string> = {
      CLIENT: 'Cliente',
      CASE: 'Processo',
      SCHEDULE_EVENT: 'Agenda',
      ACCOUNT_PAYABLE: 'Conta a Pagar',
    };

    // Monta subtítulo com filtros aplicados
    const filterParts: string[] = [];
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string).toLocaleDateString('pt-BR') : '';
      const end = endDate ? new Date(endDate as string).toLocaleDateString('pt-BR') : '';
      if (start && end) {
        filterParts.push(`Período: ${start} a ${end}`);
      } else if (start) {
        filterParts.push(`A partir de: ${start}`);
      } else if (end) {
        filterParts.push(`Até: ${end}`);
      }
    }
    if (filterUserName) {
      filterParts.push(`Usuário: ${filterUserName}`);
    }
    if (entityType) {
      filterParts.push(`Entidade: ${entityLabels[entityType as string] || entityType}`);
    }
    if (action) {
      filterParts.push(`Ação: ${actionLabels[action as string] || action}`);
    }

    const subtitle = filterParts.length > 0
      ? `${filterParts.join(' | ')} | Total: ${result.logs.length} registros`
      : `Total: ${result.logs.length} registros`;

    // Criar PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.pdf`
    );

    doc.pipe(res);

    // Título
    doc.fontSize(18).font('Helvetica-Bold').text('Logs de Auditoria', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(subtitle, { align: 'center' });
    doc.moveDown(0.5);

    // Data de geração
    const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    doc.fontSize(8).text(`Gerado em: ${generatedAt}`, { align: 'right' });
    doc.moveDown(1);

    // Cabeçalho da tabela
    const startX = 40;
    const colWidths = [90, 100, 70, 80, 150, 200, 80]; // Data, Usuário, Ação, Entidade, Nome, Descrição, IP
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Nome', 'Descrição', 'IP'];

    let currentY = doc.y;

    // Desenha cabeçalho
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 18).fill('#43A047');
    doc.fill('#ffffff').fontSize(8).font('Helvetica-Bold');

    let currentX = startX + 3;
    headers.forEach((header, i) => {
      doc.text(header, currentX, currentY + 5, { width: colWidths[i] - 6, lineBreak: false });
      currentX += colWidths[i];
    });

    currentY += 18;
    doc.fill('#000000').font('Helvetica');

    // Linhas de dados
    const rowHeight = 35;
    let rowIndex = 0;

    for (const log of result.logs) {
      // Verifica se precisa de nova página
      if (currentY + rowHeight > doc.page.height - 40) {
        doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
        currentY = 40;

        // Redesenha cabeçalho
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 18).fill('#43A047');
        doc.fill('#ffffff').fontSize(8).font('Helvetica-Bold');

        currentX = startX + 3;
        headers.forEach((header, i) => {
          doc.text(header, currentX, currentY + 5, { width: colWidths[i] - 6, lineBreak: false });
          currentX += colWidths[i];
        });

        currentY += 18;
        doc.fill('#000000').font('Helvetica');
        rowIndex = 0;
      }

      // Fundo alternado
      if (rowIndex % 2 === 0) {
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f3f4f6');
      }

      doc.fill('#000000').fontSize(7);

      const date = new Date(log.createdAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });

      const rowData = [
        date,
        (log.userName || 'N/A').substring(0, 20),
        actionLabels[log.action] || log.action,
        entityLabels[log.entityType] || log.entityType,
        (log.entityName || 'N/A').substring(0, 35),
        (log.description || log.changedFields.join(', ') || 'N/A').substring(0, 50),
        (log.ipAddress || 'N/A').substring(0, 15),
      ];

      currentX = startX + 3;
      rowData.forEach((data, i) => {
        doc.text(data, currentX, currentY + 5, {
          width: colWidths[i] - 6,
          height: rowHeight - 10,
          ellipsis: true,
        });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
      rowIndex++;
    }

    // Rodapé
    doc.fontSize(8).text(
      'Logs retidos por 365 dias conforme política de retenção.',
      startX,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 80 }
    );

    doc.end();
  } catch (error) {
    appLogger.error('Error exporting audit logs PDF:', error as Error);
    res.status(500).json({ error: 'Failed to export audit logs PDF' });
  }
};

/**
 * Lista usuários para filtro de dropdown (apenas admin)
 */
export const getUsersForFilter = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const role = req.user!.role;

    // Apenas admin pode ver lista de usuários
    if (role === 'USER') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await auditLogService.getUsersForFilter(companyId);
    res.json(users);
  } catch (error) {
    appLogger.error('Error fetching users for filter:', error as Error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
