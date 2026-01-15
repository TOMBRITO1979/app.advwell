/**
 * Utilitário centralizado para formatação de datas no padrão brasileiro
 * Formato: DD/MM/AAAA e horário 24h
 * IMPORTANTE: Todas as datas são exibidas no timezone de São Paulo (America/Sao_Paulo)
 */

import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Timezone fixo para São Paulo - usado em todo o app
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata data usando Intl.DateTimeFormat com timezone de São Paulo
 */
function formatWithTimezone(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...options,
    timeZone: SAO_PAULO_TIMEZONE,
  }).format(date);
}

/**
 * Converte uma data para o horário de São Paulo
 * Útil para usar com date-fns format que não suporta timezone nativo
 */
function toSaoPauloTime(date: Date): Date {
  // Obtém a string da data no timezone de São Paulo
  const saoPauloString = date.toLocaleString('en-US', { timeZone: SAO_PAULO_TIMEZONE });
  // Retorna um novo Date com os valores de São Paulo
  return new Date(saoPauloString);
}

/**
 * Formata data no padrão brasileiro DD/MM/AAAA
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada ou string vazia se inválida
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return formatWithTimezone(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Formata data e hora no padrão brasileiro DD/MM/AAAA HH:mm
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Data e hora formatadas ou string vazia se inválida
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return formatWithTimezone(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Formata apenas a hora no formato 24h HH:mm
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Hora formatada ou string vazia se inválida
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return formatWithTimezone(date, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Formata data completa com dia da semana
 * Ex: "Segunda-feira, 24 de dezembro de 2025"
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada por extenso
 */
export function formatDateFull(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return formatWithTimezone(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Formata data curta com mês abreviado
 * Ex: "24 dez 2025"
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada curta
 */
export function formatDateShort(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), 'dd MMM yyyy', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data e hora completa
 * Ex: "24/12/2025 às 14:30"
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO ou string
 * @returns Data e hora formatadas
 */
export function formatDateTimeVerbose(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Converte data ISO para formato datetime-local (para inputs HTML)
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO
 * @returns Data no formato YYYY-MM-DDTHH:mm
 */
export function toDatetimeLocal(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    // Formatar no timezone de São Paulo
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';

    return `${getValue('year')}-${getValue('month')}-${getValue('day')}T${getValue('hour')}:${getValue('minute')}`;
  } catch {
    return '';
  }
}

/**
 * Converte data ISO para formato date (para inputs HTML type="date")
 * @param dateString - Data em formato ISO
 * @returns Data no formato YYYY-MM-DD
 */
export function toDateInput(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Formata apenas o dia do mês
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO
 * @returns Dia do mês (1-31)
 */
export function formatDayNumber(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), 'd', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata nome do dia da semana abreviado
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO
 * @returns Dia da semana abreviado (Seg, Ter, etc)
 */
export function formatDayName(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), 'EEE', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata mês e ano
 * Ex: "Dezembro 2025"
 * Sempre usa timezone de São Paulo
 * @param dateString - Data em formato ISO
 * @returns Mês e ano
 */
export function formatMonthYear(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(toSaoPauloTime(date), 'MMMM yyyy', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Calcula dias restantes até uma data (considerando timezone Brasil)
 * @param deadline - Data limite em formato ISO
 * @returns Número de dias restantes (negativo se passou)
 */
export function calculateDaysRemaining(deadline: string | Date | null | undefined): number {
  if (!deadline) return 0;

  try {
    const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;

    if (!isValid(deadlineDate)) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return 0;
  }
}

/**
 * Verifica se uma data é hoje
 * @param dateString - Data em formato ISO
 * @returns true se for hoje
 */
export function isToday(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Verifica se uma data já passou
 * @param dateString - Data em formato ISO
 * @returns true se a data já passou
 */
export function isPast(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const now = new Date();

    return date < now;
  } catch {
    return false;
  }
}

/**
 * Retorna a data/hora atual no timezone de São Paulo formatada para datetime-local
 * @returns Data no formato YYYY-MM-DDTHH:mm
 */
export function getNowInSaoPaulo(): string {
  return toDatetimeLocal(new Date());
}

/**
 * Retorna apenas a data atual no timezone de São Paulo
 * @returns Data no formato YYYY-MM-DD
 */
export function getTodayInSaoPaulo(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';

  return `${getValue('year')}-${getValue('month')}-${getValue('day')}`;
}

/**
 * Converte um datetime-local (sem timezone) para ISO string interpretando como horário de São Paulo
 * Use esta função ao enviar datas do formulário para o backend
 * @param datetimeLocal - Data no formato YYYY-MM-DDTHH:mm
 * @returns ISO string com a data correta em UTC
 */
export function fromSaoPauloToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return '';

  try {
    // Adiciona o offset de São Paulo (-03:00) para interpretar corretamente
    // Note: São Paulo é UTC-3 (ou UTC-2 no horário de verão, mas Brasil não tem mais)
    const isoWithOffset = `${datetimeLocal}:00-03:00`;
    const date = new Date(isoWithOffset);

    if (isNaN(date.getTime())) return '';

    return date.toISOString();
  } catch {
    return '';
  }
}

/**
 * Formata valor monetário no padrão brasileiro (R$ X.XXX,XX)
 * @param value - Valor numérico
 * @returns Valor formatado como moeda brasileira
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
