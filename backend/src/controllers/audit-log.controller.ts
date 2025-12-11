import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { auditLogService } from '../services/audit-log.service';
import { AuditEntityType, AuditAction } from '@prisma/client';

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

    const filters = {
      entityType: entityType as AuditEntityType | undefined,
      action: action as AuditAction | undefined,
      userId: filterUserId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
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
    console.error('Error listing audit logs:', error);
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
    console.error('Error fetching my audit logs:', error);
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
    console.error('Error fetching entity audit logs:', error);
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
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
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
    console.error('Error fetching users for filter:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
