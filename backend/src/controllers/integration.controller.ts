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
}

export default new IntegrationController();
