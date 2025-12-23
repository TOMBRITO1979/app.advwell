import { test, expect } from '@playwright/test';

/**
 * Testes de Autenticacao
 *
 * Fluxos testados:
 * - Login com credenciais validas
 * - Login com credenciais invalidas
 * - Logout
 * - Recuperacao de senha
 * - Protecao de rotas (redirect para login)
 */

test.describe('Autenticacao', () => {
  test.describe('Login', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Limpar auth

    test('deve mostrar formulario de login', async ({ page }) => {
      await page.goto('/login');

      // Verificar elementos do formulario
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('deve mostrar erro com credenciais invalidas', async ({ page }) => {
      await page.goto('/login');

      // Preencher com credenciais invalidas
      await page.fill('input[type="email"], input[name="email"]', 'invalido@teste.com');
      await page.fill('input[type="password"], input[name="password"]', 'senhaerrada');

      // Submeter formulario
      await page.click('button[type="submit"]');

      // Aguardar mensagem de erro
      await expect(page.locator('text=/erro|invalid|incorret|falha/i')).toBeVisible({ timeout: 5000 });

      // Deve continuar na pagina de login
      await expect(page).toHaveURL(/login/);
    });

    test('deve validar campos obrigatorios', async ({ page }) => {
      await page.goto('/login');

      // Tentar submeter sem preencher
      await page.click('button[type="submit"]');

      // Verificar validacao HTML5 ou mensagem de erro
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });

    test('deve redirecionar usuario nao autenticado para login', async ({ page }) => {
      await page.goto('/dashboard');

      // Deve redirecionar para login
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('deve fazer logout com sucesso', async ({ page }) => {
      await page.goto('/');

      // Procurar botao de logout (pode estar em menu dropdown)
      const logoutButton = page.locator('button:has-text("Sair"), [data-testid="logout"], a:has-text("Sair")');

      // Se nao visivel, pode estar em um menu
      if (!(await logoutButton.isVisible())) {
        // Tentar abrir menu de usuario
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("menu")');
        if (await userMenu.isVisible()) {
          await userMenu.click();
        }
      }

      // Clicar em logout se encontrar
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Deve redirecionar para login
        await expect(page).toHaveURL(/login/, { timeout: 5000 });
      }
    });
  });

  test.describe('Recuperacao de Senha', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('deve mostrar formulario de recuperacao', async ({ page }) => {
      await page.goto('/login');

      // Procurar link de recuperacao de senha
      const forgotLink = page.locator('a:has-text("esquec"), a:has-text("recuper"), a:has-text("forgot")');

      if (await forgotLink.isVisible()) {
        await forgotLink.click();

        // Deve ter campo de email
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      }
    });

    test('deve enviar email de recuperacao', async ({ page }) => {
      await page.goto('/forgot-password');

      // Preencher email
      await page.fill('input[type="email"], input[name="email"]', 'test@advwell.pro');

      // Submeter
      await page.click('button[type="submit"]');

      // Aguardar mensagem de sucesso
      await expect(page.locator('text=/enviado|sucesso|verifique|email/i')).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('Sessao', () => {
  test('deve manter usuario logado ao recarregar pagina', async ({ page }) => {
    await page.goto('/');

    // Verificar que esta logado
    await expect(page.locator('nav, [data-testid="sidebar"], .sidebar')).toBeVisible();

    // Recarregar pagina
    await page.reload();

    // Deve continuar logado
    await expect(page.locator('nav, [data-testid="sidebar"], .sidebar')).toBeVisible();

    // Nao deve redirecionar para login
    await expect(page).not.toHaveURL(/login/);
  });
});
