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
    console.error('Data inválida:', { startDate, endDate });
    return '';
  }

  // Formatar data para Google Calendar (YYYYMMDDTHHmmss)
  // IMPORTANTE: Usar timezone LOCAL, não UTC!
  const formatGoogleDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
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
