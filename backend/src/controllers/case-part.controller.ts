import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

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
      });

      res.json(parts);
    } catch (error) {
      console.error('Erro ao listar partes do processo:', error);
      res.status(500).json({ error: 'Erro ao listar partes do processo' });
    }
  }

  // Criar uma nova parte
  async create(req: AuthRequest, res: Response) {
    try {
      const { caseId } = req.params;
      const { type, name, cpfCnpj, phone, address, email, civilStatus, profession, rg } = req.body;
      const companyId = req.user!.companyId;

      // Validações básicas
      if (!type || !name) {
        return res.status(400).json({ error: 'Tipo e nome são obrigatórios' });
      }

      if (!['AUTOR', 'REU', 'REPRESENTANTE_LEGAL'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido. Use: AUTOR, REU ou REPRESENTANTE_LEGAL' });
      }

      // Verificar se o processo pertence à empresa
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const part = await prisma.casePart.create({
        data: {
          caseId,
          type,
          name,
          cpfCnpj,
          phone,
          address,
          email,
          civilStatus,
          profession,
          rg,
        },
      });

      res.status(201).json(part);
    } catch (error) {
      console.error('Erro ao criar parte do processo:', error);
      res.status(500).json({ error: 'Erro ao criar parte do processo' });
    }
  }

  // Atualizar uma parte
  async update(req: AuthRequest, res: Response) {
    try {
      const { caseId, partId } = req.params;
      const { type, name, cpfCnpj, phone, address, email, civilStatus, profession, rg } = req.body;
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

      if (type && !['AUTOR', 'REU', 'REPRESENTANTE_LEGAL'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido. Use: AUTOR, REU ou REPRESENTANTE_LEGAL' });
      }

      const part = await prisma.casePart.update({
        where: { id: partId },
        data: {
          ...(type && { type }),
          ...(name && { name }),
          ...(cpfCnpj !== undefined && { cpfCnpj }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(email !== undefined && { email }),
          ...(civilStatus !== undefined && { civilStatus }),
          ...(profession !== undefined && { profession }),
          ...(rg !== undefined && { rg }),
        },
      });

      res.json(part);
    } catch (error) {
      console.error('Erro ao atualizar parte do processo:', error);
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
      });

      if (!partExists) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      await prisma.casePart.delete({
        where: { id: partId },
      });

      res.json({ message: 'Parte excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar parte do processo:', error);
      res.status(500).json({ error: 'Erro ao deletar parte do processo' });
    }
  }
}

export default new CasePartController();
