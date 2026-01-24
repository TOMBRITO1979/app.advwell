import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import Stripe from 'stripe';

// Use latest Stripe API version
const STRIPE_API_VERSION = '2025-12-15.clover' as const;

export class StripeConfigController {
  // Get Stripe configuration for the company
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.stripeConfig.findUnique({
        where: { companyId: companyId! },
        select: {
          id: true,
          stripePublicKey: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Never return secret key or webhook secret
        },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração Stripe não encontrada' });
      }

      res.json(config);
    } catch (error) {
      console.error('Erro ao buscar configuração Stripe:', error);
      res.status(500).json({ error: 'Erro ao buscar configuração Stripe' });
    }
  }

  // Create or update Stripe configuration
  async createOrUpdate(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { stripePublicKey, stripeSecretKey, stripeWebhookSecret } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Basic validations
      if (!stripePublicKey || !stripeSecretKey) {
        return res.status(400).json({
          error: 'Campos obrigatórios: stripePublicKey, stripeSecretKey',
        });
      }

      // Validate key formats
      if (!stripePublicKey.startsWith('pk_')) {
        return res.status(400).json({
          error: 'Chave pública inválida. Deve começar com "pk_"',
        });
      }

      if (!stripeSecretKey.startsWith('sk_')) {
        return res.status(400).json({
          error: 'Chave secreta inválida. Deve começar com "sk_"',
        });
      }

      // Encrypt secret keys
      const encryptedSecretKey = encrypt(stripeSecretKey);
      const encryptedWebhookSecret = stripeWebhookSecret ? encrypt(stripeWebhookSecret) : null;

      // Check if config already exists
      const existing = await prisma.stripeConfig.findUnique({
        where: { companyId },
      });

      let config;
      if (existing) {
        // Update existing config
        config = await prisma.stripeConfig.update({
          where: { companyId },
          data: {
            stripePublicKey,
            stripeSecretKey: encryptedSecretKey,
            stripeWebhookSecret: encryptedWebhookSecret,
            isActive: true,
          },
        });
      } else {
        // Create new config
        config = await prisma.stripeConfig.create({
          data: {
            companyId,
            stripePublicKey,
            stripeSecretKey: encryptedSecretKey,
            stripeWebhookSecret: encryptedWebhookSecret,
            isActive: true,
          },
        });
      }

      // Return without secret keys
      res.json({
        message: existing ? 'Configuração Stripe atualizada' : 'Configuração Stripe criada',
        config: {
          id: config.id,
          stripePublicKey: config.stripePublicKey,
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        },
      });
    } catch (error) {
      console.error('Erro ao salvar configuração Stripe:', error);
      res.status(500).json({ error: 'Erro ao salvar configuração Stripe' });
    }
  }

  // Test Stripe connection
  async test(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { stripeSecretKey } = req.body;

      let secretKey: string;

      // If secret key not provided, use saved config
      if (!stripeSecretKey) {
        const savedConfig = await prisma.stripeConfig.findUnique({
          where: { companyId: companyId! },
        });

        if (!savedConfig) {
          return res.status(404).json({ error: 'Configuração Stripe não encontrada' });
        }

        secretKey = decrypt(savedConfig.stripeSecretKey);
      } else {
        secretKey = stripeSecretKey;
      }

      // Test Stripe connection
      const stripe = new Stripe(secretKey, {
        apiVersion: STRIPE_API_VERSION,
      });

      // Try to fetch account to verify connection
      const account = await stripe.accounts.retrieve();

      res.json({
        success: true,
        message: 'Conexão Stripe testada com sucesso!',
        accountId: account.id,
        businessName: account.business_profile?.name || 'N/A',
      });
    } catch (error: any) {
      console.error('Erro ao testar conexão Stripe:', error);
      res.status(400).json({
        success: false,
        error: 'Falha ao conectar com Stripe',
        details: error.message,
      });
    }
  }

  // Delete Stripe configuration
  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const config = await prisma.stripeConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração Stripe não encontrada' });
      }

      // Check if there are active subscriptions
      const activeSubscriptions = await prisma.clientSubscription.count({
        where: {
          companyId: companyId!,
          status: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING'] },
        },
      });

      if (activeSubscriptions > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir configuração Stripe com assinaturas ativas',
          activeSubscriptions,
        });
      }

      await prisma.stripeConfig.delete({
        where: { companyId: companyId! },
      });

      res.json({ message: 'Configuração Stripe excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir configuração Stripe:', error);
      res.status(500).json({ error: 'Erro ao excluir configuração Stripe' });
    }
  }

  // Get Stripe helper (used internally by other controllers)
  async getStripeInstance(companyId: string): Promise<Stripe | null> {
    try {
      const config = await prisma.stripeConfig.findUnique({
        where: { companyId },
      });

      if (!config || !config.isActive) {
        return null;
      }

      const secretKey = decrypt(config.stripeSecretKey);
      return new Stripe(secretKey, {
        apiVersion: STRIPE_API_VERSION,
      });
    } catch (error) {
      console.error('Erro ao obter instância Stripe:', error);
      return null;
    }
  }
}

export default new StripeConfigController();
