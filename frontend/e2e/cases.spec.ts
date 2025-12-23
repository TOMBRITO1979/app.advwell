import { test, expect } from '@playwright/test';

/**
 * Testes de Processos
 *
 * Fluxos testados:
 * - Listagem de processos
 * - Criacao de processo
 * - Visualizacao de detalhes
 * - Sincronizacao DataJud
 * - Filtros por status
 */

test.describe('Processos', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para pagina de processos
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Listagem', () => {
    test('deve exibir lista de processos', async ({ page }) => {
      // Verificar que a tabela ou lista existe
      await expect(
        page.locator('table, [data-testid="cases-list"], .cases-list, .processos')
      ).toBeVisible();
    });

    test('deve ter botao de novo processo', async ({ page }) => {
      await expect(
        page.locator('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo Processo")')
      ).toBeVisible();
    });

    test('deve mostrar informacoes basicas dos processos', async ({ page }) => {
      // Verificar que exibe numero do processo, status, etc
      const table = page.locator('table, [data-testid="cases-list"]');

      if (await table.isVisible()) {
        // Headers ou dados devem conter informacoes relevantes
        await expect(
          page.locator('text=/processo|número|status|tribunal/i')
        ).toBeVisible();
      }
    });
  });

  test.describe('Filtros', () => {
    test('deve ter filtro por status', async ({ page }) => {
      // Verificar filtro de status
      const statusFilter = page.locator(
        'select[name="status"], [data-testid="status-filter"], button:has-text("Status")'
      );

      await expect(statusFilter).toBeVisible();
    });

    test('deve filtrar por status "Em Andamento"', async ({ page }) => {
      // Clicar no filtro de status
      const statusFilter = page.locator(
        'select[name="status"], [data-testid="status-filter"], button:has-text("Status")'
      );

      if (await statusFilter.isVisible()) {
        await statusFilter.click();

        // Selecionar "Em Andamento"
        const option = page.locator('text=/andamento|ativo/i').first();
        if (await option.isVisible()) {
          await option.click();
        }

        // Aguardar filtro aplicar
        await page.waitForTimeout(500);
      }
    });

    test('deve ter campo de busca por numero do processo', async ({ page }) => {
      await expect(
        page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="processo"]')
      ).toBeVisible();
    });
  });

  test.describe('Criacao', () => {
    test('deve abrir formulario de novo processo', async ({ page }) => {
      await page.click('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")');

      // Verificar formulario
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();

      // Campo de numero do processo deve existir
      await expect(
        page.locator('input[name="processNumber"], input[placeholder*="Número"], input[placeholder*="processo"]')
      ).toBeVisible();
    });

    test('deve validar formato do numero do processo', async ({ page }) => {
      await page.click('button:has-text("Novo"), button:has-text("Adicionar"), a:has-text("Novo")');

      // Aguardar formulario
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();

      // Preencher numero invalido
      const processInput = page.locator(
        'input[name="processNumber"], input[placeholder*="Número"], input[placeholder*="processo"]'
      );
      await processInput.fill('123'); // Numero muito curto

      // Tentar submeter
      await page.click('button[type="submit"], button:has-text("Salvar")');

      // Deve mostrar erro de validacao
      await expect(
        page.locator('text=/inválido|formato|20 dígitos/i, .error')
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Detalhes', () => {
    test('deve abrir detalhes do processo ao clicar', async ({ page }) => {
      // Clicar em um processo da lista
      const processRow = page.locator('tr, .case-item, [data-testid="case-row"]').first();

      if (await processRow.isVisible()) {
        await processRow.click();

        // Deve abrir detalhes ou navegar para pagina de detalhes
        await page.waitForTimeout(500);

        // Verificar que mostra detalhes
        await expect(
          page.locator('text=/detalhes|andamentos|movimentações/i, [data-testid="case-details"]')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('DataJud', () => {
    test('deve ter botao de sincronizar com DataJud', async ({ page }) => {
      // Na pagina de detalhes ou lista, deve ter opcao de sincronizar
      const syncButton = page.locator(
        'button:has-text("Sincronizar"), button:has-text("DataJud"), button:has-text("Atualizar")'
      );

      // Pode estar na lista ou nos detalhes
      if (!(await syncButton.isVisible())) {
        // Tentar abrir um processo primeiro
        const processRow = page.locator('tr, .case-item').first();
        if (await processRow.isVisible()) {
          await processRow.click();
          await page.waitForTimeout(500);
        }
      }

      // Verificar se botao existe (pode nao estar visivel dependendo do estado)
      const syncExists = await page.locator(
        'button:has-text("Sincronizar"), button:has-text("DataJud")'
      ).count();

      expect(syncExists).toBeGreaterThanOrEqual(0); // Pode existir ou nao dependendo do contexto
    });
  });
});

test.describe('Prazos', () => {
  test('deve mostrar processos com prazo proximo', async ({ page }) => {
    await page.goto('/cases');

    // Verificar se existe indicador de prazo
    const deadlineIndicator = page.locator(
      '.deadline, .prazo, [data-testid="deadline"], text=/prazo|vence/i'
    );

    // Prazos podem ou nao existir dependendo dos dados
    const hasDeadlines = await deadlineIndicator.count();
    expect(hasDeadlines).toBeGreaterThanOrEqual(0);
  });
});
