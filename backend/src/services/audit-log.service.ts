import { Request } from 'express';
import prisma from '../utils/prisma';
import { AuditEntityType, AuditAction, Client, Case, ScheduleEvent, Prisma } from '@prisma/client';

interface AuditLogData {
  companyId: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogFilters {
  entityType?: AuditEntityType;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

// Campos que devem ser removidos dos logs (dados sensíveis)
const SENSITIVE_FIELDS = ['password', 'apiKey', 'token', 'resetToken', 'emailVerificationToken'];

// Labels amigáveis para campos
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  rg: 'RG',
  address: 'Endereço',
  city: 'Cidade',
  state: 'Estado',
  zipCode: 'CEP',
  birthDate: 'Data de Nascimento',
  profession: 'Profissão',
  nationality: 'Nacionalidade',
  maritalStatus: 'Estado Civil',
  notes: 'Observações',
  tag: 'Tag',
  active: 'Ativo',
  personType: 'Tipo de Pessoa',
  stateRegistration: 'Inscrição Estadual',
  representativeName: 'Nome do Representante',
  representativeCpf: 'CPF do Representante',
  processNumber: 'Número do Processo',
  court: 'Tribunal',
  subject: 'Assunto',
  value: 'Valor da Causa',
  status: 'Status',
  deadline: 'Prazo',
  deadlineResponsibleId: 'Responsável pelo Prazo',
  deadlineCompleted: 'Prazo Cumprido',
  ultimoAndamento: 'Último Andamento',
  informarCliente: 'Informar Cliente',
  linkProcesso: 'Link do Processo',
  aiSummary: 'Resumo IA',
  // Schedule Event fields
  title: 'Título',
  description: 'Descrição',
  type: 'Tipo',
  priority: 'Prioridade',
  date: 'Data',
  endDate: 'Data Final',
  completed: 'Concluído',
  googleMeetLink: 'Link Google Meet',
  clientId: 'Cliente',
  caseId: 'Processo',
};

class AuditLogService {
  /**
   * Cria um log de auditoria
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: data.companyId,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          userId: data.userId,
          userName: data.userName,
          action: data.action,
          description: data.description,
          oldValues: data.oldValues ? this.sanitizeValues(data.oldValues) : undefined,
          newValues: data.newValues ? this.sanitizeValues(data.newValues) : undefined,
          changedFields: data.changedFields || [],
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Não lança erro para não afetar a operação principal
    }
  }

  /**
   * Busca nome do usuário pelo ID
   */
  async getUserName(userId: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name || 'Usuario';
    } catch {
      return 'Usuario';
    }
  }

  /**
   * Extrai IP e User-Agent da requisição
   */
  getRequestContext(req: Request): { ipAddress: string; userAgent: string } {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || req.socket?.remoteAddress
      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return { ipAddress, userAgent };
  }

  // ============================================
  // Helpers para Clientes
  // ============================================

  async logClientCreate(client: Client, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);

    await this.log({
      companyId: client.companyId,
      entityType: AuditEntityType.CLIENT,
      entityId: client.id,
      entityName: client.name,
      userId: user.userId,
      userName,
      action: AuditAction.CREATE,
      description: `Cliente "${client.name}" criado`,
      newValues: this.clientToRecord(client),
      ipAddress,
      userAgent,
    });
  }

  async logClientUpdate(
    oldClient: Client,
    newClient: Client,
    req: Request
  ): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;

    const oldValues = this.clientToRecord(oldClient);
    const newValues = this.clientToRecord(newClient);
    const changedFields = this.calculateChangedFields(oldValues, newValues);

    if (changedFields.length === 0) return; // Nenhuma alteração

    const userName = await this.getUserName(user.userId);
    const fieldDescriptions = changedFields
      .map(f => FIELD_LABELS[f] || f)
      .join(', ');

    await this.log({
      companyId: newClient.companyId,
      entityType: AuditEntityType.CLIENT,
      entityId: newClient.id,
      entityName: newClient.name,
      userId: user.userId,
      userName,
      action: AuditAction.UPDATE,
      description: `Cliente "${newClient.name}" atualizado. Campos: ${fieldDescriptions}`,
      oldValues,
      newValues,
      changedFields,
      ipAddress,
      userAgent,
    });
  }

  async logClientDelete(client: Client, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);

    await this.log({
      companyId: client.companyId,
      entityType: AuditEntityType.CLIENT,
      entityId: client.id,
      entityName: client.name,
      userId: user.userId,
      userName,
      action: AuditAction.DELETE,
      description: `Cliente "${client.name}" excluído`,
      oldValues: this.clientToRecord(client),
      ipAddress,
      userAgent,
    });
  }

  // ============================================
  // Helpers para Processos
  // ============================================

  async logCaseCreate(caseData: Case, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);

    await this.log({
      companyId: caseData.companyId,
      entityType: AuditEntityType.CASE,
      entityId: caseData.id,
      entityName: caseData.processNumber,
      userId: user.userId,
      userName,
      action: AuditAction.CREATE,
      description: `Processo "${caseData.processNumber}" criado`,
      newValues: this.caseToRecord(caseData),
      ipAddress,
      userAgent,
    });
  }

  async logCaseUpdate(
    oldCase: Case,
    newCase: Case,
    req: Request
  ): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;

    const oldValues = this.caseToRecord(oldCase);
    const newValues = this.caseToRecord(newCase);
    const changedFields = this.calculateChangedFields(oldValues, newValues);

    if (changedFields.length === 0) return; // Nenhuma alteração

    const userName = await this.getUserName(user.userId);
    const fieldDescriptions = changedFields
      .map(f => FIELD_LABELS[f] || f)
      .join(', ');

    await this.log({
      companyId: newCase.companyId,
      entityType: AuditEntityType.CASE,
      entityId: newCase.id,
      entityName: newCase.processNumber,
      userId: user.userId,
      userName,
      action: AuditAction.UPDATE,
      description: `Processo "${newCase.processNumber}" atualizado. Campos: ${fieldDescriptions}`,
      oldValues,
      newValues,
      changedFields,
      ipAddress,
      userAgent,
    });
  }

  async logCaseDelete(caseData: Case, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);

    await this.log({
      companyId: caseData.companyId,
      entityType: AuditEntityType.CASE,
      entityId: caseData.id,
      entityName: caseData.processNumber,
      userId: user.userId,
      userName,
      action: AuditAction.DELETE,
      description: `Processo "${caseData.processNumber}" excluído`,
      oldValues: this.caseToRecord(caseData),
      ipAddress,
      userAgent,
    });
  }

  // ============================================
  // Helpers para Eventos da Agenda
  // ============================================

  private getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'COMPROMISSO': 'Compromisso',
      'TAREFA': 'Tarefa',
      'PRAZO': 'Prazo',
      'AUDIENCIA': 'Audiência',
      'GOOGLE_MEET': 'Google Meet',
    };
    return labels[type] || type;
  }

  async logScheduleEventCreate(event: ScheduleEvent, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);
    const typeLabel = this.getEventTypeLabel(event.type);

    await this.log({
      companyId: event.companyId,
      entityType: AuditEntityType.SCHEDULE_EVENT,
      entityId: event.id,
      entityName: event.title,
      userId: user.userId,
      userName,
      action: AuditAction.CREATE,
      description: `${typeLabel} "${event.title}" criado`,
      newValues: this.scheduleEventToRecord(event),
      ipAddress,
      userAgent,
    });
  }

  async logScheduleEventUpdate(
    oldEvent: ScheduleEvent,
    newEvent: ScheduleEvent,
    req: Request
  ): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;

    const oldValues = this.scheduleEventToRecord(oldEvent);
    const newValues = this.scheduleEventToRecord(newEvent);
    const changedFields = this.calculateChangedFields(oldValues, newValues);

    if (changedFields.length === 0) return; // Nenhuma alteração

    const userName = await this.getUserName(user.userId);
    const fieldDescriptions = changedFields
      .map(f => FIELD_LABELS[f] || f)
      .join(', ');
    const typeLabel = this.getEventTypeLabel(newEvent.type);

    await this.log({
      companyId: newEvent.companyId,
      entityType: AuditEntityType.SCHEDULE_EVENT,
      entityId: newEvent.id,
      entityName: newEvent.title,
      userId: user.userId,
      userName,
      action: AuditAction.UPDATE,
      description: `${typeLabel} "${newEvent.title}" atualizado. Campos: ${fieldDescriptions}`,
      oldValues,
      newValues,
      changedFields,
      ipAddress,
      userAgent,
    });
  }

  async logScheduleEventDelete(event: ScheduleEvent, req: Request): Promise<void> {
    const { ipAddress, userAgent } = this.getRequestContext(req);
    const user = (req as any).user;
    const userName = await this.getUserName(user.userId);
    const typeLabel = this.getEventTypeLabel(event.type);

    await this.log({
      companyId: event.companyId,
      entityType: AuditEntityType.SCHEDULE_EVENT,
      entityId: event.id,
      entityName: event.title,
      userId: user.userId,
      userName,
      action: AuditAction.DELETE,
      description: `${typeLabel} "${event.title}" excluído`,
      oldValues: this.scheduleEventToRecord(event),
      ipAddress,
      userAgent,
    });
  }

  // ============================================
  // Consultas
  // ============================================

  /**
   * Lista logs da empresa com filtros e paginação
   */
  async getByCompany(
    companyId: string,
    filters: AuditLogFilters,
    pagination: PaginationOptions
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
    };

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate) {
      where.createdAt = {
        ...(where.createdAt as any),
        gte: filters.startDate,
      };
    }

    if (filters.endDate) {
      where.createdAt = {
        ...(where.createdAt as any),
        lte: filters.endDate,
      };
    }

    if (filters.search) {
      where.OR = [
        { entityName: { contains: filters.search, mode: 'insensitive' } },
        { userName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lista logs do usuário atual (para usuários não-admin)
   */
  async getByUser(
    userId: string,
    companyId: string,
    filters: AuditLogFilters,
    pagination: PaginationOptions
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      userId,
    };

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate) {
      where.createdAt = {
        ...(where.createdAt as any),
        gte: filters.startDate,
      };
    }

    if (filters.endDate) {
      where.createdAt = {
        ...(where.createdAt as any),
        lte: filters.endDate,
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lista logs de uma entidade específica
   */
  async getByEntity(entityType: AuditEntityType, entityId: string, companyId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
        companyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lista usuários para filtro de dropdown
   */
  async getUsersForFilter(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ============================================
  // Utilitários
  // ============================================

  /**
   * Remove campos sensíveis dos valores
   */
  private sanitizeValues(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        continue; // Remove campos sensíveis
      }

      // Converte datas para string ISO
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (value !== undefined) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Calcula quais campos foram alterados
   */
  private calculateChangedFields(
    oldObj: Record<string, any>,
    newObj: Record<string, any>
  ): string[] {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const changedFields: string[] = [];

    for (const key of allKeys) {
      // Ignora campos de metadados
      if (['id', 'companyId', 'createdAt', 'updatedAt', 'clientId'].includes(key)) {
        continue;
      }

      const oldValue = oldObj[key];
      const newValue = newObj[key];

      // Compara valores (incluindo null/undefined)
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Converte cliente para record simples
   */
  private clientToRecord(client: Client): Record<string, any> {
    return {
      name: client.name,
      email: client.email,
      phone: client.phone,
      cpf: client.cpf,
      rg: client.rg,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
      birthDate: client.birthDate,
      profession: client.profession,
      nationality: client.nationality,
      maritalStatus: client.maritalStatus,
      notes: client.notes,
      tag: client.tag,
      active: client.active,
      personType: client.personType,
      stateRegistration: client.stateRegistration,
      representativeName: client.representativeName,
      representativeCpf: client.representativeCpf,
    };
  }

  /**
   * Converte processo para record simples
   */
  private caseToRecord(caseData: Case): Record<string, any> {
    return {
      processNumber: caseData.processNumber,
      court: caseData.court,
      subject: caseData.subject,
      value: caseData.value,
      status: caseData.status,
      deadline: caseData.deadline,
      deadlineResponsibleId: caseData.deadlineResponsibleId,
      deadlineCompleted: caseData.deadlineCompleted,
      notes: caseData.notes,
      ultimoAndamento: caseData.ultimoAndamento,
      informarCliente: caseData.informarCliente,
      linkProcesso: caseData.linkProcesso,
    };
  }

  /**
   * Converte evento da agenda para record simples
   */
  private scheduleEventToRecord(event: ScheduleEvent): Record<string, any> {
    return {
      title: event.title,
      description: event.description,
      type: event.type,
      priority: event.priority,
      date: event.date,
      endDate: event.endDate,
      completed: event.completed,
      googleMeetLink: event.googleMeetLink,
      clientId: event.clientId,
      caseId: event.caseId,
    };
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
