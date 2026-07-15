/**
 * Prueba E2E mínima usando Playwright (requiere Playwright instalado localmente).
 * Ejecutar: npx playwright test tests/e2e/admin_login_test.js
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:8080/admin');
    await page.fill('#admin-session-user', 'admin');
    await page.fill('#admin-session-password', '123456');
    await page.click('#loginBtn');
    await page.waitForTimeout(1000);
    const role = await page.$eval('#overview-session-role', el => el.textContent.trim());
    console.log('Logged in role:', role);
  } catch (e) {
    console.error('E2E test failed', e);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
