import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';
import axios from 'axios';

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export class WhatsAppConfigController {
  // Get WhatsApp configuration for the company
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.whatsAppConfig.findUnique({
        where: { companyId: companyId! },
        select: {
          id: true,
          phoneNumberId: true,
          businessAccountId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Nunca retornar o accessToken, mesmo criptografado
        },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração WhatsApp não encontrada' });
      }

      res.json(config);
    } catch (error) {
      appLogger.error('Erro ao buscar configuração WhatsApp:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar configuração WhatsApp' });
    }
  }

  // Create or update WhatsApp configuration
  async createOrUpdate(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { phoneNumberId, businessAccountId, accessToken, webhookVerifyToken } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validações básicas
      if (!phoneNumberId || !businessAccountId || !accessToken) {
        return res.status(400).json({
          error: 'Campos obrigatórios: phoneNumberId, businessAccountId, accessToken',
        });
      }

      // Criptografar accessToken
      const encryptedToken = encrypt(accessToken);

      // Verificar se já existe configuração
      const existing = await prisma.whatsAppConfig.findUnique({
        where: { companyId },
      });

      let config;
      if (existing) {
        // Atualizar configuração existente
        config = await prisma.whatsAppConfig.update({
          where: { companyId },
          data: {
            phoneNumberId,
            businessAccountId,
            accessToken: encryptedToken,
            webhookVerifyToken: webhookVerifyToken || null,
            isActive: true,
          },
        });
      } else {
        // Criar nova configuração
        config = await prisma.whatsAppConfig.create({
          data: {
            companyId,
            phoneNumberId,
            businessAccountId,
            accessToken: encryptedToken,
            webhookVerifyToken: webhookVerifyToken || null,
            isActive: true,
          },
        });
      }

      // Retornar sem o accessToken
      const { accessToken: _, ...configWithoutToken } = config;
      res.json({
        message: existing ? 'Configuração WhatsApp atualizada' : 'Configuração WhatsApp criada',
        config: configWithoutToken,
      });
    } catch (error) {
      appLogger.error('Erro ao salvar configuração WhatsApp:', error as Error);
      res.status(500).json({ error: 'Erro ao salvar configuração WhatsApp' });
    }
  }

  // Test WhatsApp API connection
  async test(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { phoneNumberId, businessAccountId, accessToken } = req.body;

      // Se não foram passados parâmetros, buscar da configuração salva
      let testConfig;
      if (!phoneNumberId || !businessAccountId || !accessToken) {
        const savedConfig = await prisma.whatsAppConfig.findUnique({
          where: { companyId: companyId! },
        });

        if (!savedConfig) {
          return res.status(404).json({ error: 'Configuração WhatsApp não encontrada' });
        }

        testConfig = {
          phoneNumberId: savedConfig.phoneNumberId,
          businessAccountId: savedConfig.businessAccountId,
          accessToken: decrypt(savedConfig.accessToken),
        };
      } else {
        testConfig = { phoneNumberId, businessAccountId, accessToken };
      }

      // Testar conexão com a Meta API - buscar informações do número
      const response = await axios.get(
        `${META_API_BASE_URL}/${testConfig.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${testConfig.accessToken}`,
          },
          params: {
            fields: 'verified_name,display_phone_number,quality_rating',
          },
        }
      );

      res.json({
        success: true,
        message: 'Conexão WhatsApp testada com sucesso!',
        phoneInfo: {
          verifiedName: response.data.verified_name,
          displayPhoneNumber: response.data.display_phone_number,
          qualityRating: response.data.quality_rating,
        },
      });
    } catch (error: any) {
      appLogger.error('Erro ao testar conexão WhatsApp:', error as Error);

      // Extrair mensagem de erro da Meta API
      let errorMessage = 'Falha ao conectar com a API do WhatsApp. Verifique as configurações.';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  // Delete WhatsApp configuration
  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.whatsAppConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração WhatsApp não encontrada' });
      }

      await prisma.whatsAppConfig.delete({
        where: { companyId: companyId! },
      });

      res.json({ message: 'Configuração WhatsApp excluída com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir configuração WhatsApp:', error as Error);
      res.status(500).json({ error: 'Erro ao excluir configuração WhatsApp' });
    }
  }

  // Toggle active status
  async toggleActive(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.whatsAppConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração WhatsApp não encontrada' });
      }

      const updated = await prisma.whatsAppConfig.update({
        where: { companyId: companyId! },
        data: { isActive: !config.isActive },
        select: {
          id: true,
          phoneNumberId: true,
          businessAccountId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({
        message: updated.isActive ? 'WhatsApp ativado' : 'WhatsApp desativado',
        config: updated,
      });
    } catch (error) {
      appLogger.error('Erro ao alterar status WhatsApp:', error as Error);
      res.status(500).json({ error: 'Erro ao alterar status WhatsApp' });
    }
  }

  // Sync templates from Meta
  async syncTemplates(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.whatsAppConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração WhatsApp não encontrada' });
      }

      if (!config.isActive) {
        return res.status(400).json({ error: 'WhatsApp está desativado' });
      }

      const accessToken = decrypt(config.accessToken);

      // Buscar templates da Meta API
      const response = await axios.get(
        `${META_API_BASE_URL}/${config.businessAccountId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 100,
          },
        }
      );

      const templates = response.data.data || [];

      // Upsert cada template no banco
      const upsertedTemplates = await Promise.all(
        templates.map(async (template: any) => {
          return prisma.whatsAppTemplate.upsert({
            where: {
              companyId_name: {
                companyId: companyId!,
                name: template.name,
              },
            },
            update: {
              category: template.category,
              language: template.language,
              components: template.components,
              status: template.status,
              updatedAt: new Date(),
            },
            create: {
              companyId: companyId!,
              name: template.name,
              category: template.category,
              language: template.language,
              components: template.components,
              status: template.status,
            },
          });
        })
      );

      res.json({
        success: true,
        message: `${upsertedTemplates.length} templates sincronizados`,
        templates: upsertedTemplates,
      });
    } catch (error: any) {
      appLogger.error('Erro ao sincronizar templates WhatsApp:', error as Error);

      let errorMessage = 'Falha ao sincronizar templates.';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  // List templates
  async listTemplates(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const templates = await prisma.whatsAppTemplate.findMany({
        where: { companyId: companyId! },
        orderBy: { name: 'asc' },
      });

      res.json(templates);
    } catch (error) {
      appLogger.error('Erro ao listar templates WhatsApp:', error as Error);
      res.status(500).json({ error: 'Erro ao listar templates' });
    }
  }
}

export default new WhatsAppConfigController();
