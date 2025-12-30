import { appLogger } from './logger';

// Timezone fixo para São Paulo
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Gera link do Google Calendar com instruções para adicionar Google Meet
 *
 * @param title - Título do evento
 * @param startDate - Data/hora início (Date object)
 * @param endDate - Data/hora fim (Date object)
 * @param description - Descrição opcional do evento
 * @returns URL do Google Calendar
 */
export function generateGoogleMeetLink(
  title: string,
  startDate: Date,
  endDate: Date,
  description: string = ''
): string {
  // Validar datas
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    appLogger.error('Data inválida ao gerar link Google Meet', undefined, { startDate: String(startDate), endDate: String(endDate) });
    return '';
  }

  // Formatar data para Google Calendar (YYYYMMDDTHHmmss)
  // IMPORTANTE: Usar timezone de São Paulo para garantir consistência
  const formatGoogleDate = (date: Date): string => {
    // Usar Intl.DateTimeFormat para obter os componentes no timezone de São Paulo
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const getValue = (type: string) => parts.find(p => p.type === type)?.value || '00';

    const year = getValue('year');
    const month = getValue('month');
    const day = getValue('day');
    const hours = getValue('hour');
    const minutes = getValue('minute');
    const seconds = '00';

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  // Adicionar instruções para Google Meet
  const meetInstructions =
    'Reunião por Google Meet - Após criar, clique em "Adicionar Google Meet" para gerar o link.';
  const fullDescription = description
    ? `${description}\n\n${meetInstructions}`
    : meetInstructions;

  // Formatar datas
  const formattedStart = formatGoogleDate(startDate);
  const formattedEnd = formatGoogleDate(endDate);

  // Montar URL (NÃO use URLSearchParams - pode causar problemas de encoding)
  return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
    title || 'Reunião'
  )}&dates=${formattedStart}/${formattedEnd}&details=${encodeURIComponent(
    fullDescription
  )}`;
}
