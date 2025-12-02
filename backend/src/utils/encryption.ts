import crypto from 'crypto';

/**
 * Encryption Utility for SMTP Passwords
 *
 * Usa AES-256-CBC para criptografar/descriptografar senhas SMTP
 * A chave de criptografia vem de variável de ambiente (ENCRYPTION_KEY)
 *
 * Segurança:
 * - AES-256-CBC (Advanced Encryption Standard com chave de 256 bits)
 * - IV (Initialization Vector) aleatório para cada criptografia
 * - Chave armazenada em variável de ambiente, nunca no código
 */

// Chave de criptografia (deve ter 32 bytes para AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validação de segurança - ENCRYPTION_KEY é obrigatória em produção
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY deve ser definida em produção com pelo menos 32 caracteres');
  }
  console.warn('⚠️ AVISO: ENCRYPTION_KEY não definida ou muito curta. Defina em produção.');
}

// Algoritmo de criptografia
const ALGORITHM = 'aes-256-cbc';

/**
 * Criptografa uma string usando AES-256-CBC
 * @param text Texto para criptografar
 * @returns String criptografada no formato: iv:encryptedData (ambos em hex)
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não definida');
  }

  try {
    // Gerar IV aleatório (16 bytes para AES)
    const iv = crypto.randomBytes(16);

    // Garantir que a chave tenha exatamente 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));

    // Criar cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Criptografar
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retornar IV + dados criptografados (separados por :)
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa uma string criptografada com AES-256-CBC
 * @param encryptedText String criptografada no formato: iv:encryptedData
 * @returns Texto original descriptografado
 */
export function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não definida');
  }

  try {
    // Separar IV e dados criptografados
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de texto criptografado inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    // Garantir que a chave tenha exatamente 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));

    // Criar decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Descriptografar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Testa se a criptografia/descriptografia está funcionando corretamente
 * Usado para validar a chave de criptografia ao iniciar o servidor
 */
export function testEncryption(): boolean {
  try {
    const testString = 'AdvWell-Test-Encryption-2024';
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testString) {
      console.error('❌ Teste de criptografia falhou: texto descriptografado não corresponde ao original');
      return false;
    }

    console.log('✅ Teste de criptografia bem-sucedido');
    return true;
  } catch (error) {
    console.error('❌ Teste de criptografia falhou:', error);
    return false;
  }
}

/**
 * Gera uma chave de criptografia aleatória segura (32 bytes)
 * Use esta função para gerar uma nova chave para produção
 * IMPORTANTE: Salve a chave gerada na variável de ambiente ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Em produção, a validação no topo do arquivo já lançará erro se ENCRYPTION_KEY não estiver definida
