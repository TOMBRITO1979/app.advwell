import axios from 'axios';
import { redis } from '../utils/redis';
import { appLogger } from '../utils/logger';

export interface Holiday {
  date: string;
  name: string;
  type: string;
}

const CACHE_KEY_PREFIX = 'holidays:';
const CACHE_TTL = 86400 * 30; // 30 dias em segundos

/**
 * Busca feriados nacionais do Brasil para um determinado ano
 * Usa cache Redis para evitar chamadas repetidas à API externa
 */
export async function getHolidays(year: number): Promise<Holiday[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}${year}`;

  try {
    // Tenta buscar do cache primeiro
    const cached = await redis.get(cacheKey);
    if (cached) {
      appLogger.debug('Feriados carregados do cache', { year });
      return JSON.parse(cached);
    }

    // Se não está no cache, busca da API BrasilAPI
    appLogger.info('Buscando feriados da API BrasilAPI', { year });
    const response = await axios.get<Holiday[]>(
      `https://brasilapi.com.br/api/feriados/v1/${year}`,
      { timeout: 10000 }
    );

    const holidays = response.data;

    // Salva no cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(holidays));
    appLogger.info('Feriados salvos no cache', { year, count: holidays.length });

    return holidays;
  } catch (error) {
    appLogger.error('Erro ao buscar feriados', error as Error, { year });

    // Se falhar, retorna lista vazia em vez de quebrar a aplicação
    return [];
  }
}

/**
 * Busca feriados para um intervalo de datas
 * Útil para buscar feriados de múltiplos anos quando o calendário cruza anos
 */
export async function getHolidaysForDateRange(
  startDate: Date,
  endDate: Date
): Promise<Holiday[]> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  const holidayPromises = years.map((year) => getHolidays(year));
  const holidayArrays = await Promise.all(holidayPromises);

  // Flatten e filtra apenas feriados dentro do intervalo
  const allHolidays = holidayArrays.flat();

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  return allHolidays.filter(
    (holiday) => holiday.date >= startStr && holiday.date <= endStr
  );
}

/**
 * Limpa o cache de feriados (útil para testes ou atualizações forçadas)
 */
export async function clearHolidaysCache(year?: number): Promise<void> {
  if (year) {
    await redis.del(`${CACHE_KEY_PREFIX}${year}`);
    appLogger.info('Cache de feriados limpo', { year });
  } else {
    // Limpa todos os anos em cache (últimos 5 anos + próximos 2)
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
      await redis.del(`${CACHE_KEY_PREFIX}${y}`);
    }
    appLogger.info('Cache de feriados limpo para todos os anos');
  }
}
