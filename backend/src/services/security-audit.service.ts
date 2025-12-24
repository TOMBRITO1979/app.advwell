import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

/**
 * Security Audit Service
 *
 * Registra eventos de segurança importantes para auditoria:
 * - Login/Logout
 * - Criação/Atualização/Exclusão de usuários
 * - Alterações de permissões
 * - Alterações de configurações sensíveis
 * - Acesso a dados via API
 */

export interface SecurityEvent {
  action: string;
  userId?: string;
  companyId?: string;
  targetUserId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

class SecurityAuditService {
  /**
   * Registra um evento de segurança no log
   */
  async log(event: SecurityEvent): Promise<void> {
    try {
      // Por enquanto, apenas log no console estruturado
      // Pode ser expandido para gravar em tabela de auditoria
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...event,
      };

      if (event.success) {
        appLogger.info('[SECURITY_AUDIT]', logEntry);
      } else {
        appLogger.warn('[SECURITY_AUDIT_FAILED]', logEntry);
      }
    } catch (error) {
      appLogger.error('[SECURITY_AUDIT_ERROR]', error as Error);
    }
  }

  // === Eventos de Autenticação ===

  async logLoginSuccess(userId: string, email: string, ip?: string, userAgent?: string): Promise<void> {
    await this.log({
      action: 'LOGIN_SUCCESS',
      userId,
      ip,
      userAgent,
      details: { email },
      success: true,
    });
  }

  async logLoginFailed(email: string, reason: string, ip?: string, userAgent?: string): Promise<void> {
    await this.log({
      action: 'LOGIN_FAILED',
      ip,
      userAgent,
      details: { email, reason },
      success: false,
      errorMessage: reason,
    });
  }

  async logLogout(userId: string, ip?: string): Promise<void> {
    await this.log({
      action: 'LOGOUT',
      userId,
      ip,
      success: true,
    });
  }

  async logPasswordResetRequest(email: string, ip?: string): Promise<void> {
    await this.log({
      action: 'PASSWORD_RESET_REQUEST',
      ip,
      details: { email },
      success: true,
    });
  }

  async logPasswordResetSuccess(userId: string, ip?: string): Promise<void> {
    await this.log({
      action: 'PASSWORD_RESET_SUCCESS',
      userId,
      ip,
      success: true,
    });
  }

  async logPasswordChanged(userId: string, changedBy: string, ip?: string): Promise<void> {
    await this.log({
      action: 'PASSWORD_CHANGED',
      userId,
      ip,
      details: { changedBy },
      success: true,
    });
  }

  // === Eventos de Usuário ===

  async logUserCreated(
    userId: string,
    createdBy: string,
    companyId: string,
    userEmail: string,
    userRole: string,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'USER_CREATED',
      userId: createdBy,
      companyId,
      targetUserId: userId,
      ip,
      details: { userEmail, userRole },
      success: true,
    });
  }

  async logUserUpdated(
    userId: string,
    updatedBy: string,
    companyId: string,
    changes: string[],
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'USER_UPDATED',
      userId: updatedBy,
      companyId,
      targetUserId: userId,
      ip,
      details: { fieldsChanged: changes },
      success: true,
    });
  }

  async logUserDeleted(
    userId: string,
    deletedBy: string,
    companyId: string,
    userEmail: string,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'USER_DELETED',
      userId: deletedBy,
      companyId,
      targetUserId: userId,
      ip,
      details: { userEmail },
      success: true,
    });
  }

  async logRoleChanged(
    userId: string,
    changedBy: string,
    oldRole: string,
    newRole: string,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'ROLE_CHANGED',
      userId: changedBy,
      targetUserId: userId,
      ip,
      details: { oldRole, newRole },
      success: true,
    });
  }

  async logPermissionsChanged(
    userId: string,
    changedBy: string,
    permissions: any[],
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'PERMISSIONS_CHANGED',
      userId: changedBy,
      targetUserId: userId,
      ip,
      details: { permissionsCount: permissions.length },
      success: true,
    });
  }

  // === Eventos de Configuração ===

  async logSMTPConfigChanged(companyId: string, changedBy: string, ip?: string): Promise<void> {
    await this.log({
      action: 'SMTP_CONFIG_CHANGED',
      userId: changedBy,
      companyId,
      ip,
      success: true,
    });
  }

  async logAIConfigChanged(companyId: string, changedBy: string, provider?: string, ip?: string): Promise<void> {
    await this.log({
      action: 'AI_CONFIG_CHANGED',
      userId: changedBy,
      companyId,
      ip,
      details: { provider },
      success: true,
    });
  }

  async logCompanySettingsChanged(companyId: string, changedBy: string, changes: string[], ip?: string): Promise<void> {
    await this.log({
      action: 'COMPANY_SETTINGS_CHANGED',
      userId: changedBy,
      companyId,
      ip,
      details: { fieldsChanged: changes },
      success: true,
    });
  }

  // === Eventos de Dados ===

  async logDataExported(
    userId: string,
    companyId: string,
    dataType: string,
    format: string,
    recordCount: number,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'DATA_EXPORTED',
      userId,
      companyId,
      ip,
      details: { dataType, format, recordCount },
      success: true,
    });
  }

  async logDataImported(
    userId: string,
    companyId: string,
    dataType: string,
    successCount: number,
    errorCount: number,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'DATA_IMPORTED',
      userId,
      companyId,
      ip,
      details: { dataType, successCount, errorCount },
      success: true,
    });
  }

  // === Eventos de Segurança ===

  async logAccountLocked(email: string, reason: string, ip?: string): Promise<void> {
    await this.log({
      action: 'ACCOUNT_LOCKED',
      ip,
      details: { email, reason },
      success: true,
    });
  }

  async logSuspiciousActivity(
    userId: string | undefined,
    activity: string,
    details: Record<string, any>,
    ip?: string
  ): Promise<void> {
    await this.log({
      action: 'SUSPICIOUS_ACTIVITY',
      userId,
      ip,
      details: { activity, ...details },
      success: false,
      errorMessage: activity,
    });
  }

  async logApiKeyUsed(companyId: string, endpoint: string, ip?: string): Promise<void> {
    await this.log({
      action: 'API_KEY_USED',
      companyId,
      ip,
      details: { endpoint },
      success: true,
    });
  }
}

export const securityAudit = new SecurityAuditService();
export default securityAudit;
