/**
 * Utilitários para manipulação de números de processo
 * Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 */

/**
 * Normaliza número de processo removendo todos os caracteres não numéricos
 * Usado para armazenamento e comparação
 *
 * @param processNumber - Número do processo em qualquer formato
 * @returns Número do processo apenas com dígitos (20 caracteres)
 *
 * @example
 * normalizeProcessNumber('0100760-98.2025.5.01.0204') // '01007609820255010204'
 * normalizeProcessNumber('01007609820255010204')      // '01007609820255010204'
 */
export function normalizeProcessNumber(processNumber: string | null | undefined): string {
  if (!processNumber) return '';
  return processNumber.replace(/\D/g, '');
}

/**
 * Formata número de processo para exibição no padrão CNJ
 *
 * @param processNumber - Número do processo (apenas dígitos ou já formatado)
 * @returns Número formatado: NNNNNNN-DD.AAAA.J.TR.OOOO
 *
 * @example
 * formatProcessNumber('01007609820255010204') // '0100760-98.2025.5.01.0204'
 */
export function formatProcessNumber(processNumber: string | null | undefined): string {
  if (!processNumber) return '';

  // Remove caracteres não numéricos primeiro
  const digits = processNumber.replace(/\D/g, '');

  // Se não tem 20 dígitos, retorna como está (pode ser formato antigo)
  if (digits.length !== 20) {
    return processNumber;
  }

  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  // Posições:    0123456 78 9012 3 45 6789
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

/**
 * Valida se o número do processo está no formato CNJ válido
 *
 * @param processNumber - Número do processo
 * @returns true se válido
 */
export function isValidProcessNumber(processNumber: string | null | undefined): boolean {
  if (!processNumber) return false;

  const digits = processNumber.replace(/\D/g, '');

  // Deve ter exatamente 20 dígitos
  if (digits.length !== 20) return false;

  // Verifica se o dígito de justiça é válido (1-9)
  const justica = parseInt(digits[13], 10);
  if (justica < 1 || justica > 9) return false;

  return true;
}
