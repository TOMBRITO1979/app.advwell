import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Setup de Autenticacao
 *
 * Este teste roda antes dos outros e salva o estado de autenticacao
 * para ser reutilizado, evitando login em cada teste.
 */
setup('authenticate', async ({ page }) => {
  // Credenciais de teste (usar variaveis de ambiente em CI)
  const email = process.env.E2E_USER_EMAIL || 'test@advwell.pro';
  const password = process.env.E2E_USER_PASSWORD || 'TestPassword123!';

  // Navegar para pagina de login
  await page.goto('/login');

  // Aguardar formulario carregar
  await expect(page.locator('form')).toBeVisible();

  // Preencher email
  await page.fill('input[type="email"], input[name="email"]', email);

  // Preencher senha
  await page.fill('input[type="password"], input[name="password"]', password);

  // Clicar em entrar
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento para dashboard ou pagina principal
  await page.waitForURL(/\/(dashboard|home|$)/, { timeout: 10000 });

  // Verificar que esta autenticado (deve ter algum elemento do layout logado)
  await expect(page.locator('nav, [data-testid="sidebar"], .sidebar')).toBeVisible();

  // Salvar estado de autenticacao
  await page.context().storageState({ path: authFile });
});
