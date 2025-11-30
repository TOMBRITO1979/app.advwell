import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { ApiKeyRequest } from '../middleware/apikey';

/**
 * Controller para integração com sistemas externos (Chatwoot, etc)
 *
 * Endpoints disponíveis:
 * - POST /sync-user - Cria ou atualiza usuário (webhook Chatwoot)
 * - POST /update-password - Atualiza senha do usuário
 * - POST /generate-sso-token - Gera token JWT para login automático
 */
export class IntegrationController {
  /**
   * Sincroniza usuário do Chatwoot com AdvWell
   * Cria o usuário se não existir, ou atualiza se já existir
   *
   * Body esperado:
   * {
   *   "name": "Nome do Usuário",
   *   "email": "usuario@exemplo.com",
   *   "password": "senha123" // opcional, se não fornecido, gera automática
   * }
   */
  async syncUser(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { name, email, password } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Nome e email são obrigatórios'
        });
      }

      // Verifica se o usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          active: true,
        }
      });

      if (existingUser) {
        // Se o usuário existe mas pertence a outra empresa
        if (existingUser.companyId !== companyId) {
          return res.status(409).json({
            error: 'Email já cadastrado',
            message: 'Este email já está cadastrado em outra empresa'
          });
        }

        // Usuário já existe nesta empresa - atualiza o nome se necessário
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { name },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
          }
        });

        return res.json({
          message: 'Usuário atualizado com sucesso',
          user: updatedUser,
          created: false
        });
      }

      // Usuário não existe - cria novo usuário com role ADMIN
      const userPassword = password || this.generateRandomPassword();
      const hashedPassword = await bcrypt.hash(userPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN', // Conforme solicitado, novos usuários são ADMIN
          companyId,
          emailVerified: true, // Auto-verifica pois vem do Chatwoot
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        }
      });

      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: newUser,
        created: true,
        temporaryPassword: password ? undefined : userPassword, // Retorna senha temporária se foi gerada
      });

    } catch (error) {
      console.error('Erro ao sincronizar usuário:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar usuário' });
    }
  }

  /**
   * Atualiza a senha de um usuário
   * Usado quando o usuário reseta a senha no Chatwoot
   *
   * Body esperado:
   * {
   *   "email": "usuario@exemplo.com",
   *   "newPassword": "novaSenha123"
   * }
   */
  async updatePassword(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Email e nova senha são obrigatórios'
        });
      }

      // Valida comprimento mínimo da senha
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Senha inválida',
          message: 'A senha deve ter no mínimo 6 caracteres'
        });
      }

      // Busca o usuário
      const user = await prisma.user.findFirst({
        where: {
          email,
          companyId, // Garante que o usuário pertence à empresa da API Key
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Não foi encontrado usuário com este email nesta empresa'
        });
      }

      // Atualiza a senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return res.json({
        message: 'Senha atualizada com sucesso',
        email: user.email,
      });

    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
  }

  /**
   * Gera token JWT para SSO (Single Sign-On)
   * Usado para logar automaticamente o usuário no AdvWell após login no Chatwoot
   *
   * Body esperado:
   * {
   *   "email": "usuario@exemplo.com"
   * }
   *
   * Retorna:
   * {
   *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": { ... }
   * }
   */
  async generateSsoToken(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email não fornecido',
          message: 'Email é obrigatório para gerar token SSO'
        });
      }

      // Busca o usuário
      const user = await prisma.user.findFirst({
        where: {
          email,
          companyId,
          active: true,
          emailVerified: true,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              active: true,
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não encontrado ou inativo'
        });
      }

      if (!user.company?.active) {
        return res.status(403).json({
          error: 'Empresa inativa',
          message: 'A empresa deste usuário está inativa'
        });
      }

      // Gera o token JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
      });

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name,
        },
      });

    } catch (error) {
      console.error('Erro ao gerar token SSO:', error);
      return res.status(500).json({ error: 'Erro ao gerar token SSO' });
    }
  }

  /**
   * Gera uma senha aleatória segura
   */
  private generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  // ============================================
  // ENDPOINTS PARA IA DO WHATSAPP
  // ============================================

  /**
   * Valida cliente por CPF e Data de Nascimento
   * Usado pela IA do WhatsApp para confirmar identidade antes de dar informações
   *
   * Body esperado:
   * {
   *   "cpf": "123.456.789-00",
   *   "birthDate": "1990-01-15" ou "15/01/1990"
   * }
   *
   * Retorna:
   * {
   *   "valid": true,
   *   "clientId": "uuid",
   *   "name": "Nome do Cliente"
   * }
   */
  async validateClient(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { cpf, birthDate } = req.body;

      if (!cpf || !birthDate) {
        return res.status(400).json({
          valid: false,
          error: 'Dados incompletos',
          message: 'CPF e data de nascimento são obrigatórios'
        });
      }

      // Normaliza CPF (remove pontos e traços)
      const normalizedCpf = cpf.replace(/[.\-\/]/g, '');

      // Função para formatar CPF
      const formatCpfLocal = (cpfValue: string): string => {
        const cleaned = cpfValue.replace(/\D/g, '');
        if (cleaned.length !== 11) return cpfValue;
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
      };

      // Parse da data de nascimento (aceita YYYY-MM-DD ou DD/MM/YYYY)
      let parsedBirthDate: Date;
      if (birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        parsedBirthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsedBirthDate = new Date(birthDate);
      }

      // Busca cliente pelo CPF (normalizado ou com formatação)
      const client = await prisma.client.findFirst({
        where: {
          companyId,
          active: true,
          OR: [
            { cpf: cpf },
            { cpf: normalizedCpf },
            { cpf: formatCpfLocal(normalizedCpf) },
          ],
        },
        select: {
          id: true,
          name: true,
          cpf: true,
          birthDate: true,
        },
      });

      if (!client) {
        return res.json({
          valid: false,
          message: 'Cliente não encontrado com este CPF'
        });
      }

      // Verifica se a data de nascimento confere
      if (client.birthDate) {
        const clientBirthDate = new Date(client.birthDate);
        const sameDate = clientBirthDate.getFullYear() === parsedBirthDate.getFullYear() &&
                         clientBirthDate.getMonth() === parsedBirthDate.getMonth() &&
                         clientBirthDate.getDate() === parsedBirthDate.getDate();

        if (!sameDate) {
          return res.json({
            valid: false,
            message: 'Data de nascimento não confere'
          });
        }
      } else {
        // Cliente não tem data de nascimento cadastrada
        return res.json({
          valid: false,
          message: 'Cliente não possui data de nascimento cadastrada. Por favor, entre em contato com o escritório.'
        });
      }

      return res.json({
        valid: true,
        clientId: client.id,
        name: client.name,
      });

    } catch (error) {
      console.error('Erro ao validar cliente:', error);
      return res.status(500).json({ valid: false, error: 'Erro ao validar cliente' });
    }
  }

  /**
   * Lista processos de um cliente
   * Retorna os processos com o campo informarCliente (texto para o cliente)
   *
   * GET /api/integration/client/:clientId/cases
   */
  async getClientCases(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { clientId } = req.params;

      // Verifica se o cliente pertence a esta empresa
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId,
          active: true,
        },
      });

      if (!client) {
        return res.status(404).json({
          error: 'Cliente não encontrado',
          message: 'Cliente não encontrado ou não pertence a esta empresa'
        });
      }

      // Busca processos do cliente
      const cases = await prisma.case.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          status: true,
          value: true,
          deadline: true,
          ultimoAndamento: true,
          informarCliente: true, // Texto explicativo para o cliente
          aiSummary: true,
          lastSyncedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        clientName: client.name,
        totalCases: cases.length,
        cases: cases.map(c => ({
          id: c.id,
          processNumber: c.processNumber,
          court: c.court,
          subject: c.subject,
          status: c.status,
          value: c.value,
          deadline: c.deadline,
          ultimoAndamento: c.ultimoAndamento,
          informarCliente: c.informarCliente, // Campo principal para a IA
          aiSummary: c.aiSummary,
          lastSyncedAt: c.lastSyncedAt,
        })),
      });

    } catch (error) {
      console.error('Erro ao buscar processos do cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar processos' });
    }
  }

  /**
   * Lista movimentações de um processo específico do cliente
   *
   * GET /api/integration/client/:clientId/case/:caseId/movements
   */
  async getCaseMovements(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { clientId, caseId } = req.params;

      // Verifica se o processo pertence ao cliente e à empresa
      const caseRecord = await prisma.case.findFirst({
        where: {
          id: caseId,
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          subject: true,
          informarCliente: true,
          ultimoAndamento: true,
        },
      });

      if (!caseRecord) {
        return res.status(404).json({
          error: 'Processo não encontrado',
          message: 'Processo não encontrado ou não pertence a este cliente'
        });
      }

      // Busca movimentações
      const movements = await prisma.caseMovement.findMany({
        where: { caseId },
        select: {
          id: true,
          movementCode: true,
          movementName: true,
          movementDate: true,
          description: true,
        },
        orderBy: { movementDate: 'desc' },
        take: 20, // Limita a 20 movimentos mais recentes
      });

      return res.json({
        processNumber: caseRecord.processNumber,
        subject: caseRecord.subject,
        informarCliente: caseRecord.informarCliente, // Texto principal para a IA
        ultimoAndamento: caseRecord.ultimoAndamento,
        totalMovements: movements.length,
        movements: movements.map(m => ({
          date: m.movementDate,
          name: m.movementName,
          description: m.description,
        })),
      });

    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      return res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * Lista agenda/compromissos do cliente (audiências, prazos, etc)
   *
   * GET /api/integration/client/:clientId/schedule
   */
  async getClientSchedule(req: ApiKeyRequest, res: Response) {
    try {
      const companyId = req.company!.id;
      const { clientId } = req.params;

      // Função local para evitar problemas com contexto 'this' do Express
      const getEventTypeNameLocal = (type: string): string => {
        const typeNames: Record<string, string> = {
          COMPROMISSO: 'Compromisso',
          TAREFA: 'Tarefa',
          PRAZO: 'Prazo',
          AUDIENCIA: 'Audiência',
          GOOGLE_MEET: 'Reunião Online',
        };
        return typeNames[type] || type;
      };

      // Verifica se o cliente pertence a esta empresa
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId,
          active: true,
        },
      });

      if (!client) {
        return res.status(404).json({
          error: 'Cliente não encontrado',
          message: 'Cliente não encontrado ou não pertence a esta empresa'
        });
      }

      // Busca eventos futuros do cliente
      const now = new Date();
      const events = await prisma.scheduleEvent.findMany({
        where: {
          companyId,
          clientId,
          date: { gte: now }, // Apenas eventos futuros
          completed: false,
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          priority: true,
          date: true,
          endDate: true,
          case: {
            select: {
              processNumber: true,
              subject: true,
            },
          },
        },
        orderBy: { date: 'asc' },
        take: 10, // Limita a 10 próximos eventos
      });

      // Também busca prazos de processos do cliente
      const casesWithDeadlines = await prisma.case.findMany({
        where: {
          clientId,
          companyId,
          deadline: { gte: now },
        },
        select: {
          id: true,
          processNumber: true,
          subject: true,
          deadline: true,
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      });

      return res.json({
        clientName: client.name,
        upcomingEvents: events.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type,
          typeName: getEventTypeNameLocal(e.type),
          priority: e.priority,
          date: e.date,
          endDate: e.endDate,
          processNumber: e.case?.processNumber,
          caseSubject: e.case?.subject,
        })),
        caseDeadlines: casesWithDeadlines.map(c => ({
          processNumber: c.processNumber,
          subject: c.subject,
          deadline: c.deadline,
        })),
      });

    } catch (error) {
      console.error('Erro ao buscar agenda do cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar agenda' });
    }
  }

  /**
   * Retorna o nome amigável do tipo de evento
   */
  private getEventTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      COMPROMISSO: 'Compromisso',
      TAREFA: 'Tarefa',
      PRAZO: 'Prazo',
      AUDIENCIA: 'Audiência',
      GOOGLE_MEET: 'Reunião Online',
    };
    return typeNames[type] || type;
  }

  /**
   * Formata CPF com pontos e traço
   */
  private formatCpf(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
}

export default new IntegrationController();
