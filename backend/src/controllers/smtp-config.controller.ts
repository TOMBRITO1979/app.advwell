import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import nodemailer from 'nodemailer';

export class SMTPConfigController {
  // Get SMTP configuration for the company
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.sMTPConfig.findUnique({
        where: { companyId: companyId! },
        select: {
          id: true,
          host: true,
          port: true,
          user: true,
          fromEmail: true,
          fromName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Nunca retornar a senha, mesmo criptografada
        },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração SMTP não encontrada' });
      }

      res.json(config);
    } catch (error) {
      console.error('Erro ao buscar configuração SMTP:', error);
      res.status(500).json({ error: 'Erro ao buscar configuração SMTP' });
    }
  }

  // Create or update SMTP configuration
  async createOrUpdate(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { host, port, user, password, fromEmail, fromName } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validações básicas
      if (!host || !port || !user || !password || !fromEmail) {
        return res.status(400).json({
          error: 'Campos obrigatórios: host, port, user, password, fromEmail',
        });
      }

      // Criptografar senha
      const encryptedPassword = encrypt(password);

      // Verificar se já existe configuração
      const existing = await prisma.sMTPConfig.findUnique({
        where: { companyId },
      });

      let config;
      if (existing) {
        // Atualizar configuração existente
        config = await prisma.sMTPConfig.update({
          where: { companyId },
          data: {
            host,
            port: parseInt(port),
            user,
            password: encryptedPassword,
            fromEmail,
            fromName: fromName || null,
            isActive: true,
          },
        });
      } else {
        // Criar nova configuração
        config = await prisma.sMTPConfig.create({
          data: {
            companyId,
            host,
            port: parseInt(port),
            user,
            password: encryptedPassword,
            fromEmail,
            fromName: fromName || null,
            isActive: true,
          },
        });
      }

      // Retornar sem a senha
      const { password: _, ...configWithoutPassword } = config;
      res.json({
        message: existing ? 'Configuração SMTP atualizada' : 'Configuração SMTP criada',
        config: configWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao salvar configuração SMTP:', error);
      res.status(500).json({ error: 'Erro ao salvar configuração SMTP' });
    }
  }

  // Test SMTP connection
  async test(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { host, port, user, password, fromEmail } = req.body;

      // Se não foram passados parâmetros, buscar da configuração salva
      let testConfig;
      if (!host || !port || !user) {
        const savedConfig = await prisma.sMTPConfig.findUnique({
          where: { companyId: companyId! },
        });

        if (!savedConfig) {
          return res.status(404).json({ error: 'Configuração SMTP não encontrada' });
        }

        testConfig = {
          host: savedConfig.host,
          port: savedConfig.port,
          user: savedConfig.user,
          password: decrypt(savedConfig.password),
          fromEmail: savedConfig.fromEmail,
        };
      } else {
        testConfig = { host, port: parseInt(port), user, password, fromEmail };
      }

      // Criar transporter de teste
      const transporter = nodemailer.createTransport({
        host: testConfig.host,
        port: testConfig.port,
        secure: testConfig.port === 465,
        auth: {
          user: testConfig.user,
          pass: testConfig.password,
        },
      });

      // Verificar conexão
      await transporter.verify();

      res.json({
        success: true,
        message: 'Conexão SMTP testada com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao testar conexão SMTP:', error);
      res.status(400).json({
        success: false,
        error: 'Falha ao conectar com servidor SMTP',
        details: error.message,
      });
    }
  }

  // Delete SMTP configuration
  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.sMTPConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração SMTP não encontrada' });
      }

      await prisma.sMTPConfig.delete({
        where: { companyId: companyId! },
      });

      res.json({ message: 'Configuração SMTP excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir configuração SMTP:', error);
      res.status(500).json({ error: 'Erro ao excluir configuração SMTP' });
    }
  }
}

export default new SMTPConfigController();
