import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';

export class UserController {
  // Admin - Listar usuários da sua empresa
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where = {
        companyId,
        ...(search && {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { email: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }),
      };

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
            createdAt: true,
            permissions: true,
          },
        });

      res.json({ data: users });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  // Admin - Criar usuário na sua empresa
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { name, email, password, permissions } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

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
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      // Criar permissões se fornecidas
      if (permissions && Array.isArray(permissions)) {
        await prisma.permission.createMany({
          data: permissions.map((perm: any) => ({
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
          createdAt: true,
          permissions: true,
        },
      });

      res.status(201).json(userWithPermissions);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  // Admin - Atualizar usuário da sua empresa
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { name, email, active, permissions } = req.body;

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
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
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
          permissions: true,
        },
      });

      res.json(userWithPermissions);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
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

      res.json({ message: 'Usuário desativado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
}

export default new UserController();
