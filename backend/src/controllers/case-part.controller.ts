import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import AuditService from '../services/audit.service';
import { appLogger } from '../utils/logger';

export class CasePartController {
  // Listar partes de um processo
  async list(req: AuthRequest, res: Response) {
    try {
      const { caseId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const parts = await prisma.casePart.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          adverse: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          lawyer: {
            select: {
              id: true,
              name: true,
              oab: true,
              oabState: true,
              email: true,
              phone: true,
              affiliation: true,
            },
          },
        },
      });

      res.json(parts);
    } catch (error) {
      appLogger.error('Erro ao listar partes do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao listar partes do processo' });
    }
  }

  // Criar uma nova parte
  async create(req: AuthRequest, res: Response) {
    try {
      const { caseId } = req.params;
      const { type, clientId, adverseId, lawyerId, name, cpfCnpj, phone, address, email, civilStatus, profession, rg } = req.body;
      const companyId = req.user!.companyId;

      // Validações básicas
      if (!type) {
        return res.status(400).json({ error: 'Tipo é obrigatório' });
      }

      const validTypes = ['DEMANDANTE', 'DEMANDADO', 'ADVOGADO', 'ADVOGADO_ADVERSO', 'AUTOR', 'REU', 'REPRESENTANTE_LEGAL'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido. Use: DEMANDANTE, DEMANDADO, ADVOGADO ou ADVOGADO_ADVERSO' });
      }

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Validar referências baseado no tipo
      let entityName = name || '';

      if (type === 'DEMANDANTE' && clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId },
        });
        if (!client) {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        entityName = client.name;
      } else if (type === 'DEMANDADO' && adverseId) {
        const adverse = await prisma.adverse.findFirst({
          where: { id: adverseId, companyId },
        });
        if (!adverse) {
          return res.status(404).json({ error: 'Adverso não encontrado' });
        }
        entityName = adverse.name;
      } else if ((type === 'ADVOGADO' || type === 'ADVOGADO_ADVERSO') && lawyerId) {
        const lawyer = await prisma.lawyer.findFirst({
          where: { id: lawyerId, companyId },
        });
        if (!lawyer) {
          return res.status(404).json({ error: 'Advogado não encontrado' });
        }
        entityName = lawyer.name;
      }

      const part = await prisma.casePart.create({
        data: {
          caseId,
          companyId: companyId!,
          type,
          clientId: type === 'DEMANDANTE' ? clientId : null,
          adverseId: type === 'DEMANDADO' ? adverseId : null,
          lawyerId: (type === 'ADVOGADO' || type === 'ADVOGADO_ADVERSO') ? lawyerId : null,
          // Campos legados para compatibilidade
          name,
          cpfCnpj,
          phone,
          address,
          email,
          civilStatus,
          profession,
          rg,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          adverse: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          lawyer: {
            select: {
              id: true,
              name: true,
              oab: true,
              oabState: true,
              email: true,
              phone: true,
              affiliation: true,
            },
          },
        },
      });

      // Log de auditoria: parte adicionada
      await AuditService.logPartAdded(
        caseId,
        req.user!.userId,
        type,
        entityName
      );

      res.status(201).json(part);
    } catch (error) {
      appLogger.error('Erro ao criar parte do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao criar parte do processo' });
    }
  }

  // Atualizar uma parte
  async update(req: AuthRequest, res: Response) {
    try {
      const { caseId, partId } = req.params;
      const { type, clientId, adverseId, lawyerId, name, cpfCnpj, phone, address, email, civilStatus, profession, rg } = req.body;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Verificar se a parte existe e pertence ao processo
      const partExists = await prisma.casePart.findFirst({
        where: { id: partId, caseId },
      });

      if (!partExists) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      const validTypes = ['DEMANDANTE', 'DEMANDADO', 'ADVOGADO', 'ADVOGADO_ADVERSO', 'AUTOR', 'REU', 'REPRESENTANTE_LEGAL'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido' });
      }

      const finalType = type || partExists.type;

      const part = await prisma.casePart.update({
        where: { id: partId },
        data: {
          ...(type && { type }),
          ...(finalType === 'DEMANDANTE' && clientId !== undefined && { clientId, adverseId: null, lawyerId: null }),
          ...(finalType === 'DEMANDADO' && adverseId !== undefined && { adverseId, clientId: null, lawyerId: null }),
          ...((finalType === 'ADVOGADO' || finalType === 'ADVOGADO_ADVERSO') && lawyerId !== undefined && { lawyerId, clientId: null, adverseId: null }),
          ...(name !== undefined && { name }),
          ...(cpfCnpj !== undefined && { cpfCnpj }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(email !== undefined && { email }),
          ...(civilStatus !== undefined && { civilStatus }),
          ...(profession !== undefined && { profession }),
          ...(rg !== undefined && { rg }),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          adverse: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              phone: true,
            },
          },
          lawyer: {
            select: {
              id: true,
              name: true,
              oab: true,
              oabState: true,
              email: true,
              phone: true,
              affiliation: true,
            },
          },
        },
      });

      // Log de auditoria: parte atualizada
      const entityName = part.client?.name || part.adverse?.name || part.lawyer?.name || part.name || '';
      await AuditService.logPartUpdated(
        caseId,
        req.user!.userId,
        part.type,
        entityName
      );

      res.json(part);
    } catch (error) {
      appLogger.error('Erro ao atualizar parte do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar parte do processo' });
    }
  }

  // Deletar uma parte
  async delete(req: AuthRequest, res: Response) {
    try {
      const { caseId, partId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Verificar se a parte existe e pertence ao processo
      const partExists = await prisma.casePart.findFirst({
        where: { id: partId, caseId },
        include: {
          client: { select: { name: true } },
          adverse: { select: { name: true } },
          lawyer: { select: { name: true } },
        },
      });

      if (!partExists) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      const entityName = partExists.client?.name || partExists.adverse?.name || partExists.lawyer?.name || partExists.name || '';

      // Log de auditoria: parte removida (antes de deletar)
      await AuditService.logPartDeleted(
        caseId,
        req.user!.userId,
        partExists.type,
        entityName
      );

      await prisma.casePart.delete({
        where: { id: partId },
      });

      res.json({ message: 'Parte excluída com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar parte do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao deletar parte do processo' });
    }
  }

  // ==================== TESTEMUNHAS ====================

  // Listar testemunhas de um processo
  async listWitnesses(req: AuthRequest, res: Response) {
    try {
      const { caseId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const witnesses = await prisma.caseWitness.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(witnesses);
    } catch (error) {
      appLogger.error('Erro ao listar testemunhas do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao listar testemunhas do processo' });
    }
  }

  // Criar uma nova testemunha
  async createWitness(req: AuthRequest, res: Response) {
    try {
      const { caseId } = req.params;
      const { name, address, phone, mobile } = req.body;
      const companyId = req.user!.companyId;

      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const witness = await prisma.caseWitness.create({
        data: {
          caseId,
          companyId: companyId!,
          name,
          address,
          phone,
          mobile,
        },
      });

      res.status(201).json(witness);
    } catch (error) {
      appLogger.error('Erro ao criar testemunha do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao criar testemunha do processo' });
    }
  }

  // Atualizar uma testemunha
  async updateWitness(req: AuthRequest, res: Response) {
    try {
      const { caseId, witnessId } = req.params;
      const { name, address, phone, mobile } = req.body;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Verificar se a testemunha existe e pertence ao processo
      const witnessExists = await prisma.caseWitness.findFirst({
        where: { id: witnessId, caseId },
      });

      if (!witnessExists) {
        return res.status(404).json({ error: 'Testemunha não encontrada' });
      }

      const witness = await prisma.caseWitness.update({
        where: { id: witnessId },
        data: {
          ...(name !== undefined && { name }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(mobile !== undefined && { mobile }),
        },
      });

      res.json(witness);
    } catch (error) {
      appLogger.error('Erro ao atualizar testemunha do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar testemunha do processo' });
    }
  }

  // Deletar uma testemunha
  async deleteWitness(req: AuthRequest, res: Response) {
    try {
      const { caseId, witnessId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Verificar se a testemunha existe e pertence ao processo
      const witnessExists = await prisma.caseWitness.findFirst({
        where: { id: witnessId, caseId },
      });

      if (!witnessExists) {
        return res.status(404).json({ error: 'Testemunha não encontrada' });
      }

      await prisma.caseWitness.delete({
        where: { id: witnessId },
      });

      res.json({ message: 'Testemunha excluída com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar testemunha do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao deletar testemunha do processo' });
    }
  }
}

export default new CasePartController();
