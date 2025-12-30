import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

export interface AuditLogMetadata {
  [key: string]: any;
  oldValue?: any;
  newValue?: any;
  field?: string;
  partType?: string;
  documentName?: string;
}

export class AuditService {
  /**
   * Cria um registro de auditoria para uma ação em um processo
   */
  static async logCaseAction(
    caseId: string,
    userId: string,
    action: string,
    description: string,
    metadata?: AuditLogMetadata
  ): Promise<void> {
    try {
      // TAREFA 4.3: Buscar companyId do processo para isolamento de tenant
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        select: { companyId: true },
      });

      if (!caseData) {
        appLogger.error('Erro ao criar log de auditoria: processo não encontrado', new Error('Case not found'));
        return;
      }

      await prisma.caseAuditLog.create({
        data: {
          caseId,
          companyId: caseData.companyId, // TAREFA 4.3: Isolamento de tenant direto
          userId,
          action,
          description,
          metadata: metadata || undefined,
        },
      });
    } catch (error) {
      appLogger.error('Erro ao criar log de auditoria', error as Error);
      // Não lançamos erro para não quebrar a operação principal
    }
  }

  /**
   * Log de criação de processo
   */
  static async logCaseCreated(caseId: string, userId: string, processNumber: string): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'CASE_CREATED',
      `Processo ${processNumber} foi cadastrado`,
      { processNumber }
    );
  }

  /**
   * Log de atualização de status
   */
  static async logStatusChanged(
    caseId: string,
    userId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'STATUS_CHANGED',
      `Status alterado de ${oldStatus} para ${newStatus}`,
      { oldValue: oldStatus, newValue: newStatus, field: 'status' }
    );
  }

  /**
   * Log de atualização de prazo
   */
  static async logDeadlineChanged(
    caseId: string,
    userId: string,
    oldDeadline: Date | null,
    newDeadline: Date | null
  ): Promise<void> {
    const oldDate = oldDeadline ? new Date(oldDeadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Nenhum';
    const newDate = newDeadline ? new Date(newDeadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Nenhum';

    await this.logCaseAction(
      caseId,
      userId,
      'DEADLINE_CHANGED',
      `Prazo alterado de ${oldDate} para ${newDate}`,
      { oldValue: oldDeadline, newValue: newDeadline, field: 'deadline' }
    );
  }

  /**
   * Log de atribuição de responsável pelo prazo
   */
  static async logDeadlineResponsibleChanged(
    caseId: string,
    userId: string,
    oldResponsibleName: string | null,
    newResponsibleName: string | null
  ): Promise<void> {
    const oldName = oldResponsibleName || 'Nenhum';
    const newName = newResponsibleName || 'Nenhum';

    await this.logCaseAction(
      caseId,
      userId,
      'DEADLINE_RESPONSIBLE_CHANGED',
      `Responsável pelo prazo alterado de ${oldName} para ${newName}`,
      { oldValue: oldResponsibleName, newValue: newResponsibleName, field: 'deadlineResponsible' }
    );
  }

  /**
   * Log de adição de parte
   */
  static async logPartAdded(
    caseId: string,
    userId: string,
    partType: string,
    partName: string
  ): Promise<void> {
    const typeLabel = partType === 'AUTOR' ? 'Autor' : partType === 'REU' ? 'Réu' : 'Representante Legal';

    await this.logCaseAction(
      caseId,
      userId,
      'PART_ADDED',
      `${typeLabel} "${partName}" foi adicionado ao processo`,
      { partType, partName }
    );
  }

  /**
   * Log de atualização de parte
   */
  static async logPartUpdated(
    caseId: string,
    userId: string,
    partType: string,
    partName: string
  ): Promise<void> {
    const typeLabel = partType === 'AUTOR' ? 'Autor' : partType === 'REU' ? 'Réu' : 'Representante Legal';

    await this.logCaseAction(
      caseId,
      userId,
      'PART_UPDATED',
      `${typeLabel} "${partName}" foi atualizado`,
      { partType, partName }
    );
  }

  /**
   * Log de remoção de parte
   */
  static async logPartDeleted(
    caseId: string,
    userId: string,
    partType: string,
    partName: string
  ): Promise<void> {
    const typeLabel = partType === 'AUTOR' ? 'Autor' : partType === 'REU' ? 'Réu' : 'Representante Legal';

    await this.logCaseAction(
      caseId,
      userId,
      'PART_DELETED',
      `${typeLabel} "${partName}" foi removido do processo`,
      { partType, partName }
    );
  }

  /**
   * Log de upload de documento
   */
  static async logDocumentAdded(
    caseId: string,
    userId: string,
    documentName: string,
    storageType: string
  ): Promise<void> {
    const type = storageType === 'upload' ? 'carregado' : 'vinculado';

    await this.logCaseAction(
      caseId,
      userId,
      'DOCUMENT_ADDED',
      `Documento "${documentName}" foi ${type}`,
      { documentName, storageType }
    );
  }

  /**
   * Log de remoção de documento
   */
  static async logDocumentDeleted(
    caseId: string,
    userId: string,
    documentName: string
  ): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'DOCUMENT_DELETED',
      `Documento "${documentName}" foi removido`,
      { documentName }
    );
  }

  /**
   * Log de sincronização com DataJud
   */
  static async logDataJudSync(
    caseId: string,
    userId: string,
    movementsCount: number
  ): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'DATAJUD_SYNCED',
      `Processo sincronizado com DataJud (${movementsCount} movimentações)`,
      { movementsCount }
    );
  }

  /**
   * Log de atualização genérica de campo
   */
  static async logFieldUpdated(
    caseId: string,
    userId: string,
    field: string,
    oldValue: any,
    newValue: any,
    fieldLabel: string
  ): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'FIELD_UPDATED',
      `${fieldLabel} foi atualizado`,
      { field, oldValue, newValue }
    );
  }

  /**
   * Log de exclusão de processo
   */
  static async logCaseDeleted(
    caseId: string,
    userId: string,
    processNumber: string
  ): Promise<void> {
    await this.logCaseAction(
      caseId,
      userId,
      'CASE_DELETED',
      `Processo ${processNumber} foi excluído`,
      { processNumber }
    );
  }

  /**
   * Busca logs de auditoria de um processo
   */
  static async getCaseAuditLogs(caseId: string) {
    return await prisma.caseAuditLog.findMany({
      where: { caseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default AuditService;
