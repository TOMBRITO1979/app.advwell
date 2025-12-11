import prisma from '../utils/prisma';

interface ExportData {
  exportDate: string;
  exportFormat: string;
  user: any;
  company: any;
  clients: any[];
  cases: any[];
  documents: any[];
  financialTransactions: any[];
  scheduleEvents: any[];
  consents: any[];
}

/**
 * Service for LGPD data export (portability) and anonymization
 */
export class DataExportService {
  /**
   * Export all user data for LGPD portability request
   * @param userId - The user ID
   * @param companyId - The company ID
   * @returns Complete data export in JSON format
   */
  async exportUserData(userId: string, companyId: string): Promise<ExportData> {
    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch company data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        cnpj: true,
        createdAt: true,
      },
    });

    // Fetch clients
    const clients = await prisma.client.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        rg: true,
        birthDate: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch cases
    const cases = await prisma.case.findMany({
      where: { companyId },
      select: {
        id: true,
        processNumber: true,
        court: true,
        subject: true,
        status: true,
        value: true,
        deadline: true,
        notes: true,
        ultimoAndamento: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            name: true,
            cpf: true,
          },
        },
        movements: {
          select: {
            movementDate: true,
            movementName: true,
            description: true,
            createdAt: true,
          },
          orderBy: { movementDate: 'desc' },
          take: 50,
        },
      },
    });

    // Fetch documents (metadata only, not the actual files)
    const documents = await prisma.document.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        fileType: true,
        fileSize: true,
        storageType: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            name: true,
          },
        },
        case: {
          select: {
            processNumber: true,
          },
        },
      },
    });

    // Fetch financial transactions
    const financialTransactions = await prisma.financialTransaction.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        date: true,
        createdAt: true,
        client: {
          select: {
            name: true,
          },
        },
        case: {
          select: {
            processNumber: true,
          },
        },
      },
    });

    // Fetch schedule events
    const scheduleEvents = await prisma.scheduleEvent.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        date: true,
        endDate: true,
        completed: true,
        createdAt: true,
        client: {
          select: {
            name: true,
          },
        },
        case: {
          select: {
            processNumber: true,
          },
        },
      },
    });

    // Fetch consent logs
    const consents = await prisma.consentLog.findMany({
      where: { userId },
      select: {
        id: true,
        consentType: true,
        version: true,
        consentedAt: true,
        revokedAt: true,
      },
      orderBy: { consentedAt: 'desc' },
    });

    return {
      exportDate: new Date().toISOString(),
      exportFormat: 'JSON',
      user,
      company,
      clients,
      cases,
      documents,
      financialTransactions,
      scheduleEvents,
      consents,
    };
  }

  /**
   * Anonymize user data for LGPD deletion request
   * This replaces personal data with anonymized values while keeping the structure intact
   * @param userId - The user ID
   * @param companyId - The company ID
   */
  async anonymizeUserData(userId: string, companyId: string): Promise<void> {
    const anonymizedString = '[DADOS REMOVIDOS]';
    const anonymizedEmail = `anonimo_${Date.now()}@removido.lgpd`;

    await prisma.$transaction(async (tx) => {
      // Anonymize user
      await tx.user.update({
        where: { id: userId },
        data: {
          name: anonymizedString,
          email: anonymizedEmail,
          password: 'ANONYMIZED',
          active: false,
        },
      });

      // Anonymize all clients from the company
      await tx.client.updateMany({
        where: { companyId },
        data: {
          name: anonymizedString,
          email: null,
          phone: null,
          cpf: null,
          rg: null,
          birthDate: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
        },
      });

      // Anonymize leads
      await tx.lead.updateMany({
        where: { companyId },
        data: {
          name: anonymizedString,
          email: null,
          phone: '[REMOVIDO]',
          contactReason: null,
          notes: null,
        },
      });

      // Mark consent logs as anonymized
      await tx.consentLog.updateMany({
        where: { userId },
        data: {
          email: anonymizedEmail,
          ip: null,
          userAgent: null,
        },
      });

      // Update data requests to mark completion
      await tx.dataRequest.updateMany({
        where: {
          userId,
          requestType: 'DELETION',
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: 'Dados anonimizados conforme solicitacao LGPD',
        },
      });
    });
  }

  /**
   * Generate a summary report of all data associated with a user
   * @param userId - The user ID
   * @param companyId - The company ID
   * @returns Summary statistics
   */
  async generateDataSummary(userId: string, companyId: string) {
    const [
      clientCount,
      caseCount,
      documentCount,
      financialCount,
      eventCount,
      consentCount,
    ] = await Promise.all([
      prisma.client.count({ where: { companyId } }),
      prisma.case.count({ where: { companyId } }),
      prisma.document.count({ where: { companyId } }),
      prisma.financialTransaction.count({ where: { companyId } }),
      prisma.scheduleEvent.count({ where: { companyId } }),
      prisma.consentLog.count({ where: { userId } }),
    ]);

    return {
      userId,
      companyId,
      summary: {
        clients: clientCount,
        cases: caseCount,
        documents: documentCount,
        financialTransactions: financialCount,
        scheduleEvents: eventCount,
        consents: consentCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export default new DataExportService();
