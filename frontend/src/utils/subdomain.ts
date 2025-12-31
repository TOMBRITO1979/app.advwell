/**
 * Utilitário para detecção e gerenciamento de subdomínios do portal de clientes
 *
 * O portal de clientes usa URLs como: escritorio-silva.advwell.pro
 * O sistema interno usa: app.advwell.pro
 * A API usa: api.advwell.pro
 */

// Domínios principais que NÃO são portal de clientes
const MAIN_DOMAINS = [
  'app.advwell.pro',
  'api.advwell.pro',
  'grafana.advwell.pro',
  'cliente.advwell.pro', // URL antiga, será redirecionada ou desativada
];

// Subdomínios reservados que não podem ser usados por escritórios
const RESERVED_SUBDOMAINS = [
  'app', 'api', 'www', 'cliente', 'clientes', 'admin', 'grafana',
  'mail', 'smtp', 'ftp', 'blog', 'help', 'support', 'suporte',
  'status', 'docs', 'dev', 'test', 'staging', 'prod', 'production'
];

/**
 * Extrai o subdomain da URL atual
 * @returns O subdomain se for um portal de cliente, null caso contrário
 *
 * Exemplos:
 * - escritorio-silva.advwell.pro -> "escritorio-silva"
 * - app.advwell.pro -> null
 * - localhost -> null
 */
export const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;

  // Localhost para desenvolvimento - não é portal
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Em dev, pode-se simular com query param: ?subdomain=teste
    const urlParams = new URLSearchParams(window.location.search);
    const devSubdomain = urlParams.get('subdomain');
    if (devSubdomain && /^[a-z0-9-]+$/.test(devSubdomain)) {
      return devSubdomain;
    }
    return null;
  }

  // Domínios principais não são portal
  if (MAIN_DOMAINS.includes(hostname)) {
    return null;
  }

  // Extrair subdomain de *.advwell.pro
  const match = hostname.match(/^([a-z0-9-]+)\.advwell\.pro$/);
  if (match) {
    const subdomain = match[1];
    // Verificar se não é reservado
    if (!RESERVED_SUBDOMAINS.includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
};

/**
 * Verifica se a URL atual é de um portal de cliente
 * @returns true se for portal, false caso contrário
 */
export const isPortalDomain = (): boolean => {
  return getSubdomain() !== null;
};

/**
 * Verifica se um subdomain é válido para uso
 * @param subdomain O subdomain a ser validado
 * @returns Objeto com isValid e message de erro se inválido
 */
export const validateSubdomain = (subdomain: string): { isValid: boolean; message?: string } => {
  if (!subdomain) {
    return { isValid: false, message: 'Subdomínio é obrigatório' };
  }

  const clean = subdomain.toLowerCase().trim();

  // Apenas letras minúsculas, números e hífens
  if (!/^[a-z0-9-]+$/.test(clean)) {
    return {
      isValid: false,
      message: 'Subdomínio deve conter apenas letras minúsculas, números e hífens'
    };
  }

  // Tamanho: 3-30 caracteres
  if (clean.length < 3 || clean.length > 30) {
    return {
      isValid: false,
      message: 'Subdomínio deve ter entre 3 e 30 caracteres'
    };
  }

  // Não pode começar ou terminar com hífen
  if (clean.startsWith('-') || clean.endsWith('-')) {
    return {
      isValid: false,
      message: 'Subdomínio não pode começar ou terminar com hífen'
    };
  }

  // Verificar se é reservado
  if (RESERVED_SUBDOMAINS.includes(clean)) {
    return {
      isValid: false,
      message: 'Este subdomínio é reservado e não pode ser usado'
    };
  }

  return { isValid: true };
};

/**
 * Gera a URL completa do portal para um subdomain
 * @param subdomain O subdomain
 * @returns A URL completa do portal
 */
export const getPortalUrl = (subdomain: string): string => {
  return `https://${subdomain}.advwell.pro`;
};
