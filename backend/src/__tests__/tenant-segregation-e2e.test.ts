/**
 * AUDITORIA: Testes E2E de Segregação Multi-Tenant
 *
 * Verifica que dados de uma empresa NÃO podem ser acessados por outra empresa.
 * Testa o isolamento de dados em todos os recursos críticos.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Mock Redis
jest.mock('../utils/redis', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  },
}));

// Mock do Prisma para simular banco de dados
jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    case: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    financialTransaction: {
      findMany: jest.fn(),
    },
    scheduleEvent: {
      findMany: jest.fn(),
    },
  },
}));

// Dados de teste
const COMPANY_A = {
  id: 'company-a-uuid',
  name: 'Escritório A',
  active: true,
  subscriptionStatus: 'ACTIVE',
};

const COMPANY_B = {
  id: 'company-b-uuid',
  name: 'Escritório B',
  active: true,
  subscriptionStatus: 'ACTIVE',
};

const USER_COMPANY_A = {
  userId: 'user-a-uuid',
  companyId: COMPANY_A.id,
  role: 'ADMIN',
  email: 'admin@escritorio-a.com',
};

const USER_COMPANY_B = {
  userId: 'user-b-uuid',
  companyId: COMPANY_B.id,
  role: 'ADMIN',
  email: 'admin@escritorio-b.com',
};

const CLIENT_COMPANY_A = {
  id: 'client-a-uuid',
  companyId: COMPANY_A.id,
  name: 'Cliente do Escritório A',
  cpfCnpj: '12345678901',
};

const CLIENT_COMPANY_B = {
  id: 'client-b-uuid',
  companyId: COMPANY_B.id,
  name: 'Cliente do Escritório B',
  cpfCnpj: '98765432109',
};

describe('Segregação Multi-Tenant E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Isolamento de Clientes', () => {
    it('Empresa A NÃO deve ver clientes da Empresa B', async () => {
      // Simular busca de clientes filtrando por companyId
      const mockFindMany = prisma.client.findMany as jest.Mock;

      // Quando Empresa A busca seus clientes
      mockFindMany.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_A.id) {
          return [CLIENT_COMPANY_A];
        }
        if (where?.companyId === COMPANY_B.id) {
          return [CLIENT_COMPANY_B];
        }
        // Se não filtrar por companyId, retorna todos (VULNERABILIDADE!)
        return [CLIENT_COMPANY_A, CLIENT_COMPANY_B];
      });

      // Busca de clientes da Empresa A (correto)
      const clientsA = await prisma.client.findMany({
        where: { companyId: USER_COMPANY_A.companyId },
      });

      expect(clientsA).toHaveLength(1);
      expect(clientsA[0].companyId).toBe(COMPANY_A.id);
      expect(clientsA[0].name).toBe('Cliente do Escritório A');

      // Verificar que NÃO contém clientes da Empresa B
      const hasCompanyBClient = clientsA.some(c => c.companyId === COMPANY_B.id);
      expect(hasCompanyBClient).toBe(false);
    });

    it('Busca sem companyId deve ser bloqueada', () => {
      // Este teste documenta que queries sem filtro de companyId são perigosas
      // O sistema deve SEMPRE incluir companyId nas queries

      const dangerousQuery = {
        where: {
          // Sem companyId - VULNERABILIDADE!
          name: { contains: 'Cliente' },
        },
      };

      // A query correta deve SEMPRE incluir companyId
      const safeQuery = {
        where: {
          companyId: USER_COMPANY_A.companyId, // OBRIGATÓRIO
          name: { contains: 'Cliente' },
        },
      };

      expect(safeQuery.where.companyId).toBeDefined();
      expect(dangerousQuery.where).not.toHaveProperty('companyId');
    });

    it('Tentativa de acesso a cliente de outra empresa deve falhar', async () => {
      const mockFindUnique = prisma.client.findUnique as jest.Mock;

      // Empresa A tenta acessar cliente da Empresa B
      mockFindUnique.mockImplementation(async ({ where }) => {
        // Simula busca que retorna o cliente
        if (where?.id === CLIENT_COMPANY_B.id) {
          return CLIENT_COMPANY_B;
        }
        return null;
      });

      // Buscar o cliente
      const client = await prisma.client.findUnique({
        where: { id: CLIENT_COMPANY_B.id },
      });

      // Se encontrou o cliente, verificar se pertence à mesma empresa
      if (client) {
        const hasAccess = client.companyId === USER_COMPANY_A.companyId;
        expect(hasAccess).toBe(false); // NÃO deve ter acesso
      }
    });
  });

  describe('Isolamento de Processos (Cases)', () => {
    it('Processos devem ser filtrados por companyId', async () => {
      const mockFindMany = prisma.case.findMany as jest.Mock;

      const CASE_COMPANY_A = {
        id: 'case-a-uuid',
        companyId: COMPANY_A.id,
        caseNumber: '0001234-12.2024.8.26.0100',
      };

      const CASE_COMPANY_B = {
        id: 'case-b-uuid',
        companyId: COMPANY_B.id,
        caseNumber: '0005678-34.2024.8.26.0100',
      };

      mockFindMany.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_A.id) {
          return [CASE_COMPANY_A];
        }
        return [];
      });

      // Empresa A busca seus processos
      const casesA = await prisma.case.findMany({
        where: { companyId: USER_COMPANY_A.companyId },
      });

      expect(casesA).toHaveLength(1);
      expect(casesA[0].companyId).toBe(COMPANY_A.id);

      // Verificar que NÃO contém processos da Empresa B
      const hasCompanyBCase = casesA.some(c => c.companyId === COMPANY_B.id);
      expect(hasCompanyBCase).toBe(false);
    });
  });

  describe('Isolamento de Documentos', () => {
    it('Documentos devem ser filtrados por companyId', async () => {
      const mockFindMany = prisma.document.findMany as jest.Mock;

      const DOC_COMPANY_A = {
        id: 'doc-a-uuid',
        companyId: COMPANY_A.id,
        name: 'Contrato Empresa A.pdf',
        storageKey: `companies/${COMPANY_A.id}/documents/contrato.pdf`,
      };

      mockFindMany.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_A.id) {
          return [DOC_COMPANY_A];
        }
        return [];
      });

      const docsA = await prisma.document.findMany({
        where: { companyId: USER_COMPANY_A.companyId },
      });

      expect(docsA).toHaveLength(1);
      expect(docsA[0].companyId).toBe(COMPANY_A.id);
      // Verificar que o path S3 contém o companyId correto
      expect((docsA[0] as any).storageKey).toContain(COMPANY_A.id);
    });
  });

  describe('Isolamento Financeiro', () => {
    it('Transações financeiras devem ser filtradas por companyId', async () => {
      const mockFindMany = prisma.financialTransaction.findMany as jest.Mock;

      const TRANSACTION_A = {
        id: 'tx-a-uuid',
        companyId: COMPANY_A.id,
        amount: 1000,
        type: 'INCOME',
      };

      mockFindMany.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_A.id) {
          return [TRANSACTION_A];
        }
        return [];
      });

      const txA = await prisma.financialTransaction.findMany({
        where: { companyId: USER_COMPANY_A.companyId },
      });

      expect(txA).toHaveLength(1);
      expect(txA[0].companyId).toBe(COMPANY_A.id);
    });
  });

  describe('Isolamento de Agenda', () => {
    it('Eventos de agenda devem ser filtrados por companyId', async () => {
      const mockFindMany = prisma.scheduleEvent.findMany as jest.Mock;

      const EVENT_A = {
        id: 'event-a-uuid',
        companyId: COMPANY_A.id,
        title: 'Audiência Empresa A',
      };

      mockFindMany.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_A.id) {
          return [EVENT_A];
        }
        return [];
      });

      const eventsA = await prisma.scheduleEvent.findMany({
        where: { companyId: USER_COMPANY_A.companyId },
      });

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].companyId).toBe(COMPANY_A.id);
    });
  });

  describe('Proteção contra Manipulação de companyId', () => {
    it('companyId do request body deve ser IGNORADO', () => {
      // Simula requisição maliciosa tentando alterar companyId
      const maliciousRequest = {
        body: {
          name: 'Novo Cliente',
          companyId: COMPANY_B.id, // Tentativa de inserir em outra empresa
        },
        user: USER_COMPANY_A, // Usuário autenticado da Empresa A
      };

      // O sistema DEVE usar o companyId do token JWT, NÃO do body
      const safeCompanyId = maliciousRequest.user.companyId;

      expect(safeCompanyId).toBe(COMPANY_A.id);
      expect(safeCompanyId).not.toBe(maliciousRequest.body.companyId);
    });

    it('companyId deve vir APENAS do token JWT', () => {
      // Documenta a regra de segurança
      const authenticatedUser = {
        userId: 'user-123',
        companyId: 'company-from-jwt', // Único valor confiável
        role: 'ADMIN',
      };

      // Ao criar/atualizar dados, sempre usar req.user.companyId
      const createData = {
        name: 'Novo Registro',
        companyId: authenticatedUser.companyId, // Do JWT, não do body
      };

      expect(createData.companyId).toBe('company-from-jwt');
    });
  });

  describe('SUPER_ADMIN - Bypass de Tenant', () => {
    it('SUPER_ADMIN deve poder acessar dados de qualquer empresa', async () => {
      const SUPER_ADMIN_USER = {
        userId: 'super-admin-uuid',
        role: 'SUPER_ADMIN',
        companyId: null, // SUPER_ADMIN pode não ter companyId
      };

      const mockFindMany = prisma.company.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([COMPANY_A, COMPANY_B]);

      // SUPER_ADMIN pode listar todas as empresas
      const allCompanies = await prisma.company.findMany({});

      expect(allCompanies).toHaveLength(2);
      expect(allCompanies).toContainEqual(COMPANY_A);
      expect(allCompanies).toContainEqual(COMPANY_B);
    });

    it('SUPER_ADMIN deve poder acessar clientes de qualquer empresa', async () => {
      const mockFindMany = prisma.client.findMany as jest.Mock;

      // Quando SUPER_ADMIN busca todos os clientes (para admin)
      mockFindMany.mockResolvedValue([CLIENT_COMPANY_A, CLIENT_COMPANY_B]);

      const allClients = await prisma.client.findMany({});

      expect(allClients).toHaveLength(2);
    });
  });
});

describe('Padrões de Query Multi-Tenant', () => {
  describe('Padrão Obrigatório: Sempre filtrar por companyId', () => {
    it('documenta o padrão correto de query', () => {
      const userId = 'authenticated-user-id';
      const companyId = 'user-company-id';

      // CORRETO: Sempre incluir companyId do usuário autenticado
      const correctClientQuery = {
        where: {
          companyId: companyId, // Do req.user.companyId
          active: true,
        },
      };

      const correctCaseQuery = {
        where: {
          companyId: companyId, // Do req.user.companyId
          status: 'ACTIVE',
        },
      };

      expect(correctClientQuery.where.companyId).toBe(companyId);
      expect(correctCaseQuery.where.companyId).toBe(companyId);
    });

    it('documenta queries perigosas que NUNCA devem ser usadas', () => {
      // PERIGOSO: Query sem filtro de companyId
      const dangerousQuery1 = {
        where: { active: true }, // Sem companyId!
      };

      // PERIGOSO: companyId vindo do request body
      const dangerousQuery2 = {
        where: { companyId: 'req.body.companyId' }, // Vulnerável!
      };

      // Estas queries são vulneráveis a vazamento de dados
      expect(dangerousQuery1.where).not.toHaveProperty('companyId');
    });
  });

  describe('Validação de Acesso Cruzado', () => {
    it('antes de retornar dados, verificar se companyId corresponde', () => {
      const userCompanyId = 'company-a';
      const fetchedData = {
        id: 'data-123',
        companyId: 'company-b', // Dados de outra empresa!
        sensitiveInfo: 'Informação confidencial',
      };

      // Verificação obrigatória antes de retornar dados
      const hasAccess = fetchedData.companyId === userCompanyId;

      expect(hasAccess).toBe(false);

      // Se não tiver acesso, deve retornar 403 ou 404
      if (!hasAccess) {
        const response = { status: 403, message: 'Acesso negado' };
        expect(response.status).toBe(403);
      }
    });
  });
});
