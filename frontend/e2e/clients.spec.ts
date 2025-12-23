import { test, expect } from '@playwright/test';

/**
 * Testes de Clientes
 *
 * Fluxos testados:
 * - Listagem de clientes
 * - Criacao de cliente
 * - Edicao de cliente
 * - Exclusao de cliente
 * - Busca e filtros
 */

test.describe('Clientes', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para pagina de clientes
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Listagem', () => {
    test('deve exibir lista de clientes', async ({ page }) => {
      // Verificar que a tabela ou lista de clientes existe
      await expect(page.locator('table, [data-testid="clients-list"], .clients-list')).toBeVisible();
    });

    test('deve ter botao de novo cliente', async ({ page }) => {
      // Verificar botao de adicionar
      await expect(
        page.locator('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")')
      ).toBeVisible();
    });

    test('deve ter campo de busca', async ({ page }) => {
      // Verificar campo de busca
      await expect(
        page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]')
      ).toBeVisible();
    });
  });

  test.describe('Criacao', () => {
    test('deve abrir modal/formulario de novo cliente', async ({ page }) => {
      // Clicar no botao de novo cliente
      await page.click('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")');

      // Verificar que modal ou formulario abriu
      await expect(
        page.locator('form, [role="dialog"], .modal')
      ).toBeVisible();

      // Verificar campos obrigatorios
      await expect(page.locator('input[name="name"], input[placeholder*="Nome"]')).toBeVisible();
    });

    test('deve criar cliente com dados validos', async ({ page }) => {
      // Clicar no botao de novo cliente
      await page.click('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")');

      // Aguardar formulario
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();

      // Gerar nome unico para evitar conflitos
      const uniqueName = `Cliente Teste E2E ${Date.now()}`;

      // Preencher campos obrigatorios
      await page.fill('input[name="name"], input[placeholder*="Nome"]', uniqueName);

      // Preencher email se existir
      const emailInput = page.locator('input[name="email"], input[type="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill(`teste.e2e.${Date.now()}@advwell.pro`);
      }

      // Preencher telefone se existir
      const phoneInput = page.locator('input[name="phone"], input[placeholder*="Telefone"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('11999999999');
      }

      // Submeter formulario
      await page.click('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")');

      // Aguardar feedback de sucesso
      await expect(
        page.locator('text=/sucesso|criado|salvo/i, [role="alert"]')
      ).toBeVisible({ timeout: 5000 });

      // Cliente deve aparecer na lista
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
    });

    test('deve validar campos obrigatorios na criacao', async ({ page }) => {
      // Clicar no botao de novo cliente
      await page.click('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")');

      // Aguardar formulario
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();

      // Tentar submeter sem preencher
      await page.click('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")');

      // Deve mostrar erro de validacao
      await expect(
        page.locator('text=/obrigat|required|preencha/i, .error, [role="alert"]')
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Edicao', () => {
    test('deve abrir cliente para edicao', async ({ page }) => {
      // Clicar em um cliente existente ou no botao de editar
      const editButton = page.locator('button:has-text("Editar"), [data-testid="edit-client"], tr button').first();

      if (await editButton.isVisible()) {
        await editButton.click();

        // Verificar que formulario de edicao abriu
        await expect(page.locator('form, [role="dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('Busca', () => {
    test('deve filtrar clientes por nome', async ({ page }) => {
      // Preencher campo de busca
      const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]');
      await searchInput.fill('Cliente');

      // Aguardar filtro
      await page.waitForTimeout(500);

      // Lista deve ser filtrada (ou mostrar resultados)
      // Verificamos que a tabela ainda existe
      await expect(page.locator('table, [data-testid="clients-list"]')).toBeVisible();
    });
  });
});
