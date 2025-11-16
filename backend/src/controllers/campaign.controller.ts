import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { emailTemplates } from '../utils/email-templates';

export class CampaignController {
  async getTemplates(req: AuthRequest, res: Response) {
    try {
      // Retornar templates sem o body completo (apenas metadados)
      const templates = Object.entries(emailTemplates).map(([key, template]) => ({
        id: key,
        name: template.name,
        subject: template.subject,
        preview: template.body.substring(0, 200) + '...',
      }));

      res.json(templates);
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      res.status(500).json({ error: 'Erro ao listar templates' });
    }
  }

  async getTemplate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const template = emailTemplates[id as keyof typeof emailTemplates];

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      res.json({ id, ...template });
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      res.status(500).json({ error: 'Erro ao buscar template' });
    }
  }
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 20, status } = req.query;
      
      const where: any = { companyId: companyId! };
      if (status) where.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const [campaigns, total] = await Promise.all([
        prisma.emailCampaign.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            _count: { select: { recipients: true } },
          },
        }),
        prisma.emailCampaign.count({ where }),
      ]);

      res.json({
        data: campaigns,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      console.error('Erro ao listar campanhas:', error);
      res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.emailCampaign.findFirst({
        where: { id, companyId: companyId! },
        include: {
          user: { select: { id: true, name: true, email: true } },
          recipients: { take: 100 }, // Limitar a 100 destinatários no GET
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Erro ao buscar campanha:', error);
      res.status(500).json({ error: 'Erro ao buscar campanha' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;
      const { name, subject, body, recipients } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validações
      if (!name || !subject || !body) {
        return res.status(400).json({ error: 'Nome, assunto e corpo são obrigatórios' });
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Adicione pelo menos um destinatário' });
      }

      if (recipients.length > 500) {
        return res.status(400).json({ error: 'Máximo de 500 destinatários por campanha' });
      }

      // Criar campanha
      const campaign = await prisma.emailCampaign.create({
        data: {
          companyId,
          name,
          subject,
          body,
          createdBy,
          totalRecipients: recipients.length,
          status: 'draft',
        },
      });

      // Criar destinatários
      await prisma.campaignRecipient.createMany({
        data: recipients.map((r: any) => ({
          campaignId: campaign.id,
          recipientEmail: r.email,
          recipientName: r.name || null,
        })),
      });

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      res.status(500).json({ error: 'Erro ao criar campanha' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.emailCampaign.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status === 'sending') {
        return res.status(400).json({ error: 'Não é possível excluir campanha em envio' });
      }

      await prisma.emailCampaign.delete({ where: { id } });

      res.json({ message: 'Campanha excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      res.status(500).json({ error: 'Erro ao excluir campanha' });
    }
  }

  async send(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.emailCampaign.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status !== 'draft') {
        return res.status(400).json({ error: 'Apenas campanhas em rascunho podem ser enviadas' });
      }

      // Verificar se empresa tem SMTP configurado
      const smtpConfig = await prisma.sMTPConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!smtpConfig || !smtpConfig.isActive) {
        return res.status(400).json({ error: 'Configure o SMTP antes de enviar campanhas' });
      }

      // Atualizar status para sending
      await prisma.emailCampaign.update({
        where: { id },
        data: { status: 'sending' },
      });

      // Iniciar envio em background (importar o service)
      const { sendCampaign } = await import('../services/campaign.service');
      sendCampaign(id).catch(console.error);

      res.json({ message: 'Campanha iniciada! Os emails serão enviados em breve.' });
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      res.status(500).json({ error: 'Erro ao enviar campanha' });
    }
  }
}

export default new CampaignController();
