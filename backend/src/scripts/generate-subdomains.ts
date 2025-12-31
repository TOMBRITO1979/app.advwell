/**
 * Script para gerar subdomains para empresas existentes que não possuem
 *
 * Este script deve ser executado uma única vez após a migração do banco
 * para popular o campo subdomain das empresas existentes.
 *
 * Uso:
 *   npx ts-node src/scripts/generate-subdomains.ts
 *
 * Ou via docker exec:
 *   docker exec <container> npx ts-node src/scripts/generate-subdomains.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista de subdomínios reservados
const RESERVED_SUBDOMAINS = [
  'app', 'api', 'www', 'cliente', 'clientes', 'admin', 'grafana',
  'mail', 'smtp', 'ftp', 'blog', 'help', 'support', 'suporte',
  'status', 'docs', 'dev', 'test', 'staging', 'prod', 'production'
];

/**
 * Gera um subdomain a partir do nome da empresa
 */
function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '')         // Remove hífens no início e fim
    .substring(0, 30);               // Limita a 30 caracteres
}

/**
 * Verifica se um subdomain está disponível
 */
async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return false;
  }

  const existing = await prisma.company.findUnique({
    where: { subdomain },
  });

  return !existing;
}

/**
 * Encontra um subdomain único para a empresa
 */
async function findUniqueSubdomain(baseName: string): Promise<string> {
  let subdomain = generateSubdomain(baseName);

  // Se o subdomain base estiver vazio ou muito curto, usar um fallback
  if (subdomain.length < 3) {
    subdomain = 'escritorio';
  }

  // Tentar o subdomain base primeiro
  if (await isSubdomainAvailable(subdomain)) {
    return subdomain;
  }

  // Se não estiver disponível, adicionar sufixo numérico
  let counter = 1;
  while (counter < 100) {
    const candidate = `${subdomain}-${counter}`;
    if (await isSubdomainAvailable(candidate)) {
      return candidate;
    }
    counter++;
  }

  // Fallback com timestamp
  return `${subdomain}-${Date.now()}`;
}

async function main() {
  console.log('🚀 Iniciando geração de subdomains para empresas existentes...\n');

  try {
    // Buscar empresas sem subdomain
    const companies = await prisma.company.findMany({
      where: { subdomain: null },
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
    });

    console.log(`📋 Encontradas ${companies.length} empresas sem subdomain\n`);

    if (companies.length === 0) {
      console.log('✅ Todas as empresas já possuem subdomain!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        const subdomain = await findUniqueSubdomain(company.name);

        await prisma.company.update({
          where: { id: company.id },
          data: { subdomain },
        });

        console.log(`✅ ${company.name} -> ${subdomain}.advwell.pro`);
        updated++;
      } catch (error) {
        console.error(`❌ Erro ao atualizar "${company.name}":`, error);
        errors++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`   - Atualizadas: ${updated}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Total: ${companies.length}`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
