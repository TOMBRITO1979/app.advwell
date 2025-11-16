/**
 * Utilitários de Sanitização para Prevenir XSS
 *
 * Este módulo fornece funções para sanitizar entrada de usuário,
 * removendo tags HTML e scripts maliciosos enquanto preserva o texto.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitiza uma string removendo TODAS as tags HTML
 *
 * @param input - String a ser sanitizada
 * @returns String sanitizada sem tags HTML, ou undefined se input for null/undefined
 *
 * @example
 * sanitizeString('<script>alert("XSS")</script>Olá')
 * // Retorna: 'Olá'
 *
 * sanitizeString('Nome <b>importante</b>')
 * // Retorna: 'Nome importante'
 */
export const sanitizeString = (input: string | undefined | null): string | undefined => {
  if (!input) return input as undefined;

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],        // Remove TODAS as tags HTML
    KEEP_CONTENT: true,      // Mantém o conteúdo textual
    ALLOW_DATA_ATTR: false,  // Remove atributos data-*
  });
};

/**
 * Sanitiza um objeto recursivamente
 *
 * Percorre todas as propriedades do objeto e sanitiza strings,
 * mantendo outros tipos de dados intactos.
 *
 * @param obj - Objeto a ser sanitizado
 * @returns Novo objeto com strings sanitizadas
 *
 * @example
 * sanitizeObject({
 *   name: 'João <script>alert(1)</script>',
 *   age: 30,
 *   notes: '<b>Importante</b>'
 * })
 * // Retorna: { name: 'João ', age: 30, notes: 'Importante' }
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) :
        item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Sanitiza apenas campos de texto livre específicos
 *
 * Útil quando você quer sanitizar apenas alguns campos,
 * deixando outros (como emails, números) intocados.
 *
 * @param obj - Objeto contendo os dados
 * @param fieldsToSanitize - Array com nomes dos campos a sanitizar
 * @returns Novo objeto com campos especificados sanitizados
 *
 * @example
 * sanitizeFields(
 *   { name: 'João', notes: '<script>XSS</script>', email: 'joao@test.com' },
 *   ['notes']
 * )
 * // Retorna: { name: 'João', notes: '', email: 'joao@test.com' }
 */
export const sanitizeFields = <T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: string[]
): T => {
  const result: any = { ...obj };

  for (const field of fieldsToSanitize) {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeString(result[field]);
    }
  }

  return result;
};
