/**
 * Utilitarios para manipulacao de numeros de processo
 * Padrao CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 */

/**
 * Formata numero de processo para exibicao no padrao CNJ
 *
 * @param processNumber - Numero do processo (apenas digitos ou ja formatado)
 * @returns Numero formatado: NNNNNNN-DD.AAAA.J.TR.OOOO
 *
 * @example
 * formatProcessNumber('01007609820255010204') // '0100760-98.2025.5.01.0204'
 */
export function formatProcessNumber(processNumber: string | null | undefined): string {
  if (!processNumber) return '';

  // Remove caracteres nao numericos primeiro
  const digits = processNumber.replace(/\D/g, '');

  // Se nao tem 20 digitos, retorna como esta (pode ser formato antigo)
  if (digits.length !== 20) {
    return processNumber;
  }

  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  // Posicoes:    0123456 78 9012 3 45 6789
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

/**
 * Normaliza numero de processo removendo todos os caracteres nao numericos
 * Usado para envio para APIs
 *
 * @param processNumber - Numero do processo em qualquer formato
 * @returns Numero do processo apenas com digitos (20 caracteres)
 */
export function normalizeProcessNumber(processNumber: string | null | undefined): string {
  if (!processNumber) return '';
  return processNumber.replace(/\D/g, '');
}
