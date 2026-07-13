import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, runTest) => {
    const browserErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        browserErrors.push(`console.error: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      browserErrors.push(`pageerror: ${error.message}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        browserErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    await runTest(page);

    expect(browserErrors, 'La aplicación produjo errores inesperados en el navegador').toEqual([]);
  },
});
