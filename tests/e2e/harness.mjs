/**
 * Shared end-to-end harness. Each area has its own *.e2e.mjs file that imports
 * this, so parallel work never edits the same test file.
 *
 *   const t = await harness();           // base URL from argv[2] or E2E_BASE
 *   await t.step('name', async (page) => { ... }, { width: 1280 });
 *   await t.finish();                     // prints results, exits 1 on failure
 *
 * E2E_FULL=1 prints whole failure messages instead of the first three lines.
 */
import { chromium } from 'playwright';

export async function harness() {
  const base = process.argv[2] ?? process.env.E2E_BASE ?? 'http://localhost:4321';
  const only = process.env.STEP ? new RegExp(process.env.STEP, 'i') : null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const results = [];
  let failed = 0;

  /** Fresh browser context per step, so storage never leaks between steps. */
  async function step(name, fn, { width = 375, height = 800, ...options } = {}) {
    if (only && !only.test(name)) return;
    const context = await browser.newContext({ viewport: { width, height }, ...options });
    context.setDefaultTimeout(5000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await fn(page, context);
      if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
      results.push(`✓ ${name}`);
    } catch (e) {
      failed++;
      results.push(`✗ ${name}\n    ${String(e.message).split('\n').slice(0, process.env.E2E_FULL ? 60 : 3).join('\n    ')}`);
    } finally {
      await context.close();
    }
  }

  const go = (page, path) => page.goto(base + path, { waitUntil: 'load' });
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const leads = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('clearday:v1:leads') || '[]'));

  async function finish() {
    console.log(results.join('\n'));
    console.log(`\n${results.length - failed}/${results.length} steps passed`);
    await browser.close();
    process.exit(failed ? 1 : 0);
  }

  return { base, browser, step, go, overflow, leads, finish };
}
