import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Testa fluxos criticos do AdvWell:
 * - Autenticacao (login, logout, recuperacao de senha)
 * - CRUD de Clientes
 * - CRUD de Processos
 * - Agenda
 */

export default defineConfig({
  // Diretorio dos testes
  testDir: './e2e',

  // Timeout maximo por teste
  timeout: 30 * 1000,

  // Expectativa de timeout
  expect: {
    timeout: 5000,
  },

  // Executar testes em paralelo
  fullyParallel: true,

  // Falhar build se houver test.only
  forbidOnly: !!process.env.CI,

  // Retry em CI
  retries: process.env.CI ? 2 : 0,

  // Workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Configuracoes globais
  use: {
    // URL base para testes
    baseURL: process.env.E2E_BASE_URL || 'https://app.advwell.pro',

    // Coletar trace em falhas
    trace: 'on-first-retry',

    // Screenshots em falhas
    screenshot: 'only-on-failure',

    // Video em falhas
    video: 'on-first-retry',

    // Viewport padrao
    viewport: { width: 1280, height: 720 },

    // Ignorar erros HTTPS em dev
    ignoreHTTPSErrors: true,
  },

  // Projetos (browsers)
  projects: [
    // Setup: autenticacao que outros testes usam
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chrome Desktop
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar estado de autenticacao do setup
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Firefox Desktop
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
