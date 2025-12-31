import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { s3Client, getSignedS3Url } from '../utils/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import crypto from 'crypto';
import { securityAudit } from '../services/security-audit.service';
import { appLogger } from '../utils/logger';
import { generateSimpleToken } from '../utils/jwt';
import { sendPortalWelcomeEmail } from '../utils/email';

export class UserController {
  // Admin - Listar usuários da sua empresa
  async list(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search = '', companyOnly = 'false' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // SUPER_ADMIN pode listar todos os usuários, outros precisam de companyId
      const isSuperAdmin = req.user!.role === 'SUPER_ADMIN';
      const companyId = req.user!.companyId;

      if (!isSuperAdmin && !companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = {};

      // Se não for SUPER_ADMIN OU se companyOnly=true, filtrar por companyId
      // companyOnly é usado para listar apenas usuários da mesma empresa (ex: para atribuição em eventos)
      if (!isSuperAdmin || companyOnly === 'true') {
        where.companyId = companyId;
      }

      // Adicionar filtro de busca
      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' as const } },
          { email: { contains: String(search), mode: 'insensitive' as const } },
        ];
      }

      const users = await prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            hideSidebar: true,
            createdAt: true,
            permissions: true,
            companyId: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        });

      res.json({ data: users });
    } catch (error) {
      appLogger.error('Erro ao listar usuários', error as Error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  // Admin - Criar usuário na sua empresa
  async create(req: AuthRequest, res: Response) {
    try {
      // SEGURANCA: Validar que admin tem companyId (requerido apos fix de seguranca)
      if (!req.user!.companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }
      const companyId: string = req.user!.companyId;
      const { name, email, password, permissions, hideSidebar } = req.body;

      // Verifica se o email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'USER',
          companyId,
          hideSidebar: hideSidebar || false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          hideSidebar: true,
          createdAt: true,
        },
      });

      // Criar permissões se fornecidas
      if (permissions && Array.isArray(permissions)) {
        await prisma.permission.createMany({
          data: permissions.map((perm: any) => ({
            companyId, // Tenant isolation
            userId: user.id,
            resource: perm.resource,
            canView: perm.canView || false,
            canEdit: perm.canEdit || false,
            canDelete: perm.canDelete || false,
          })),
        });
      }

      const userWithPermissions = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          hideSidebar: true,
          createdAt: true,
          permissions: true,
        },
      });

      // Log de auditoria: usuário criado
      await securityAudit.logUserCreated(
        user.id,
        req.user!.userId,
        companyId,
        email,
        'USER',
        req.ip
      );

      res.status(201).json(userWithPermissions);
    } catch (error) {
      appLogger.error('Erro ao criar usuário', error as Error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  // Admin - Atualizar usuário da sua empresa
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      // SEGURANCA: Validar que admin tem companyId (requerido apos fix de seguranca)
      if (!req.user!.companyId) {
        return res.status(403).json({ error: 'Usuário sem empresa associada' });
      }
      const companyId: string = req.user!.companyId;
      const { name, email, active, permissions, hideSidebar } = req.body;

      // Verifica se o usuário pertence à mesma empresa
      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Não permite alterar admins
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Não é possível alterar administradores' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          active,
          hideSidebar: hideSidebar !== undefined ? hideSidebar : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          hideSidebar: true,
        },
      });

      // Atualizar permissões se fornecidas
      if (permissions && Array.isArray(permissions)) {
        // Deleta permissões antigas
        await prisma.permission.deleteMany({
          where: { userId: id },
        });

        // Cria novas permissões
        await prisma.permission.createMany({
          data: permissions.map((perm: any) => ({
            companyId, // Tenant isolation
            userId: id,
            resource: perm.resource,
            canView: perm.canView || false,
            canEdit: perm.canEdit || false,
            canDelete: perm.canDelete || false,
          })),
        });
      }

      const userWithPermissions = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          hideSidebar: true,
          permissions: true,
        },
      });

      // Log de auditoria: usuário atualizado
      const changes: string[] = [];
      if (name !== user.name) changes.push('name');
      if (email !== user.email) changes.push('email');
      if (active !== user.active) changes.push('active');
      if (hideSidebar !== user.hideSidebar) changes.push('hideSidebar');
      if (permissions) changes.push('permissions');

      if (changes.length > 0) {
        await securityAudit.logUserUpdated(id, req.user!.userId, companyId!, changes, req.ip);
      }

      res.json(userWithPermissions);
    } catch (error) {
      appLogger.error('Erro ao atualizar usuário', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  // Admin - Desativar usuário
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Não é possível desativar administradores' });
      }

      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      // Log de auditoria: usuário desativado
      await securityAudit.logUserDeleted(id, req.user!.userId, companyId!, user.email, req.ip);

      res.json({ message: 'Usuário desativado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar usuário', error as Error);
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }

  // Buscar perfil do usuário logado
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          mobile: true,
          birthDate: true,
          profilePhoto: true,
          profilePhotoUrl: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(user);
    } catch (error) {
      appLogger.error('Erro ao buscar perfil', error as Error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  }

  // Atualizar perfil do usuário logado
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { name, phone, mobile, birthDate } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          phone: phone || null,
          mobile: mobile || null,
          birthDate: birthDate ? new Date(birthDate) : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          mobile: true,
          birthDate: true,
          profilePhoto: true,
          profilePhotoUrl: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      appLogger.error('Erro ao atualizar perfil', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  }

  // Upload de foto de perfil
  async uploadProfilePhoto(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      // Validar tipo de arquivo
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.' });
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
      }

      // Buscar informações do usuário e empresa
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });

      if (!user || !user.company) {
        return res.status(404).json({ error: 'Usuário ou empresa não encontrada' });
      }

      // Sanitizar email do admin para usar no caminho S3
      const adminEmail = user.company.email.toLowerCase().replace(/@/g, '-at-').replace(/[^a-z0-9-_.]/g, '');

      // Definir nome do arquivo
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExtension}`;
      const s3Key = `${adminEmail}/profile-photos/${fileName}`;

      // Upload para S3
      const command = new PutObjectCommand({
        Bucket: config.aws.s3BucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      await s3Client.send(command);

      // Gerar URL presignada (válida por 7 dias)
      const photoUrl = await getSignedS3Url(s3Key);

      // Atualizar usuário com a foto
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profilePhoto: s3Key,
          profilePhotoUrl: photoUrl,
        },
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          profilePhotoUrl: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      appLogger.error('Erro ao fazer upload da foto', error as Error);
      res.status(500).json({ error: 'Erro ao fazer upload da foto' });
    }
  }

  /**
   * Criar usuário CLIENT vinculado a um cliente (para acesso ao portal)
   * POST /api/users/client
   */
  async createClientUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user!.companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }
      const companyId: string = req.user!.companyId;
      const { email, name, clientId, password } = req.body;

      // Validações
      if (!email || !name || !clientId) {
        return res.status(400).json({ error: 'Email, nome e clientId são obrigatórios' });
      }

      // Verificar se o email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Verificar se o cliente existe e pertence à mesma empresa
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verificar se o cliente já tem um usuário vinculado
      const existingClientUser = await prisma.user.findFirst({
        where: { clientId },
      });

      if (existingClientUser) {
        return res.status(400).json({
          error: 'Cliente já possui acesso ao portal',
          message: `O cliente já está vinculado ao usuário ${existingClientUser.email}`
        });
      }

      // Gerar senha temporária se não fornecida
      const tempPassword = password || crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Criar usuário CLIENT (já verificado - não precisa verificar email)
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'CLIENT',
          companyId,
          clientId,
          emailVerified: true, // CLIENT não precisa verificar email
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          clientId: true,
          createdAt: true,
          linkedClient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Buscar dados da empresa para o email
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });

      // Enviar email de boas-vindas com credenciais
      try {
        await sendPortalWelcomeEmail(
          email,
          name,
          tempPassword,
          company?.name || 'Escritório'
        );
        appLogger.info('Email de boas-vindas do portal enviado', { email, clientId });
      } catch (emailError) {
        appLogger.error('Erro ao enviar email de boas-vindas do portal', emailError as Error, { email });
      }

      // Log de auditoria
      await securityAudit.logUserCreated(
        user.id,
        req.user!.userId,
        companyId,
        email,
        'CLIENT',
        req.ip
      );

      appLogger.info('Usuário CLIENT criado', { userId: user.id, clientId, companyId });

      res.status(201).json({
        ...user,
        message: password ? undefined : 'Senha temporária enviada por email',
        tempPassword: password ? undefined : tempPassword, // Retornar senha temporária apenas se foi gerada
      });
    } catch (error) {
      appLogger.error('Erro ao criar usuário CLIENT', error as Error);
      res.status(500).json({ error: 'Erro ao criar usuário do portal' });
    }
  }

  /**
   * Listar usuários do tipo CLIENT da empresa
   * GET /api/users/clients
   */
  async listClientUsers(req: AuthRequest, res: Response) {
    try {
      if (!req.user!.companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }
      const companyId = req.user!.companyId;

      const clientUsers = await prisma.user.findMany({
        where: {
          companyId,
          role: 'CLIENT',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          emailVerified: true,
          clientId: true,
          createdAt: true,
          linkedClient: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(clientUsers);
    } catch (error) {
      appLogger.error('Erro ao listar usuários CLIENT', error as Error);
      res.status(500).json({ error: 'Erro ao listar usuários do portal' });
    }
  }

  /**
   * Remover acesso do portal de um cliente
   * DELETE /api/users/client/:id
   */
  async deleteClientUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user!.companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }
      const companyId = req.user!.companyId;

      // Verificar se o usuário existe e é do tipo CLIENT
      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
          role: 'CLIENT',
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário do portal não encontrado' });
      }

      // Deletar o usuário (não apenas desativar)
      await prisma.user.delete({
        where: { id },
      });

      // Log de auditoria
      await securityAudit.logUserDeleted(id, req.user!.userId, companyId, user.email, req.ip);

      appLogger.info('Usuário CLIENT removido', { userId: id, clientId: user.clientId, companyId });

      res.json({ message: 'Acesso ao portal removido com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover usuário CLIENT', error as Error);
      res.status(500).json({ error: 'Erro ao remover acesso ao portal' });
    }
  }
}

export default new UserController();
