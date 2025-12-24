/**
 * Utilitário centralizado para formatação de datas no padrão brasileiro
 * Formato: DD/MM/AAAA e horário 24h
 */

import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data no padrão brasileiro DD/MM/AAAA
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada ou string vazia se inválida
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    // Se for string, tentar parsear
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data e hora no padrão brasileiro DD/MM/AAAA HH:mm
 * @param dateString - Data em formato ISO ou string
 * @returns Data e hora formatadas ou string vazia se inválida
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata apenas a hora no formato 24h HH:mm
 * @param dateString - Data em formato ISO ou string
 * @returns Hora formatada ou string vazia se inválida
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data completa com dia da semana
 * Ex: "Segunda-feira, 24 de dezembro de 2025"
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada por extenso
 */
export function formatDateFull(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data curta com mês abreviado
 * Ex: "24 dez 2025"
 * @param dateString - Data em formato ISO ou string
 * @returns Data formatada curta
 */
export function formatDateShort(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'dd MMM yyyy', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data e hora completa
 * Ex: "24/12/2025 às 14:30"
 * @param dateString - Data em formato ISO ou string
 * @returns Data e hora formatadas
 */
export function formatDateTimeVerbose(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Converte data ISO para formato datetime-local (para inputs HTML)
 * @param dateString - Data em formato ISO
 * @returns Data no formato YYYY-MM-DDTHH:mm
 */
export function toDatetimeLocal(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, "yyyy-MM-dd'T'HH:mm");
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

    return format(date, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Formata apenas o dia do mês
 * @param dateString - Data em formato ISO
 * @returns Dia do mês (1-31)
 */
export function formatDayNumber(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'd', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata nome do dia da semana abreviado
 * @param dateString - Data em formato ISO
 * @returns Dia da semana abreviado (Seg, Ter, etc)
 */
export function formatDayName(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'EEE', { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata mês e ano
 * Ex: "Dezembro 2025"
 * @param dateString - Data em formato ISO
 * @returns Mês e ano
 */
export function formatMonthYear(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) return '';

    return format(date, 'MMMM yyyy', { locale: ptBR });
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
