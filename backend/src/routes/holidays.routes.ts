import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getHolidays, getHolidaysForDateRange } from '../services/holidays.service';
import { appLogger } from '../utils/logger';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * GET /api/holidays
 * Busca feriados nacionais do Brasil
 *
 * Query params:
 * - year: Ano específico (opcional, default: ano atual)
 * - startDate: Data inicial para intervalo (opcional)
 * - endDate: Data final para intervalo (opcional)
 */
router.get(
  '/',
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Parâmetros inválidos', details: errors.array() });
      }

      const { year, startDate, endDate } = req.query;

      let holidays;

      if (startDate && endDate) {
        // Busca por intervalo de datas
        holidays = await getHolidaysForDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        // Busca por ano (default: ano atual)
        const targetYear = year ? Number(year) : new Date().getFullYear();
        holidays = await getHolidays(targetYear);
      }

      res.json(holidays);
    } catch (error) {
      appLogger.error('Erro ao buscar feriados', error as Error);
      res.status(500).json({ error: 'Erro ao buscar feriados' });
    }
  }
);

/**
 * GET /api/holidays/:year
 * Busca feriados de um ano específico
 */
router.get(
  '/:year',
  [query('year').optional()],
  async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year, 10);

      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: 'Ano inválido' });
      }

      const holidays = await getHolidays(year);
      res.json(holidays);
    } catch (error) {
      appLogger.error('Erro ao buscar feriados', error as Error);
      res.status(500).json({ error: 'Erro ao buscar feriados' });
    }
  }
);

export default router;
