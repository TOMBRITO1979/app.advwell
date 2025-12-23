import { Page, expect } from '@playwright/test';

/**
 * Helpers para testes E2E
 *
 * Funcoes utilitarias reutilizaveis nos testes
 */

/**
 * Aguarda toast de sucesso aparecer
 */
export async function waitForSuccessToast(page: Page) {
  await expect(
    page.locator('[role="alert"], .toast, .notification, text=/sucesso|salvo|criado/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Aguarda toast de erro aparecer
 */
export async function waitForErrorToast(page: Page) {
  await expect(
    page.locator('[role="alert"], .toast-error, text=/erro|falha|invalid/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Fecha modal se estiver aberto
 */
export async function closeModal(page: Page) {
  const closeButton = page.locator(
    'button[aria-label="Close"], button:has-text("Fechar"), .modal-close, [data-testid="close-modal"]'
  );

  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Confirma dialog de exclusao
 */
export async function confirmDelete(page: Page) {
  const confirmButton = page.locator(
    'button:has-text("Confirmar"), button:has-text("Excluir"), button:has-text("Sim")'
  );

  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }
}

/**
 * Cancela dialog
 */
export async function cancelDialog(page: Page) {
  const cancelButton = page.locator(
    'button:has-text("Cancelar"), button:has-text("Não")'
  );

  if (await cancelButton.isVisible()) {
    await cancelButton.click();
  }
}

/**
 * Navega pelo menu lateral
 */
export async function navigateToMenu(page: Page, menuText: string) {
  const menuItem = page.locator(`nav a:has-text("${menuText}"), .sidebar a:has-text("${menuText}")`);

  if (await menuItem.isVisible()) {
    await menuItem.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Gera dados fake para testes
 */
export function generateTestData() {
  const timestamp = Date.now();

  return {
    clientName: `Cliente Teste ${timestamp}`,
    clientEmail: `teste.${timestamp}@advwell.pro`,
    clientPhone: '11999999999',
    clientCpf: '12345678901',
    processNumber: `0000001-00.2024.8.26.${String(timestamp).slice(-4)}`,
    eventTitle: `Evento Teste ${timestamp}`,
  };
}

/**
 * Verifica se esta na pagina correta
 */
export async function assertOnPage(page: Page, pathPattern: RegExp) {
  await expect(page).toHaveURL(pathPattern, { timeout: 5000 });
}

/**
 * Aguarda carregamento terminar (spinner sumir)
 */
export async function waitForLoading(page: Page) {
  const spinner = page.locator('.loading, .spinner, [data-testid="loading"]');

  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Preenche formulario de cliente
 */
export async function fillClientForm(page: Page, data: {
  name: string;
  email?: string;
  phone?: string;
}) {
  await page.fill('input[name="name"], input[placeholder*="Nome"]', data.name);

  if (data.email) {
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(data.email);
    }
  }

  if (data.phone) {
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Telefone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(data.phone);
    }
  }
}

/**
 * Submete formulario e aguarda sucesso
 */
export async function submitFormAndWaitSuccess(page: Page) {
  await page.click('button[type="submit"], button:has-text("Salvar")');
  await waitForSuccessToast(page);
}
