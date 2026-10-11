/**
 * The home page in Firefox and WebKit (spec §19, phase 6), where Playwright has
 * them installed. Every other file runs in Chromium through harness.mjs; this one
 * checks that the page still reads, prices and scrolls in the other two engines.
 * A browser that is not installed is reported as skipped, never as passed.
 */
import assert from 'node:assert/strict';
import { firefox, webkit } from 'playwright';

const base = process.argv[2] ?? process.env.E2E_BASE ?? 'http://localhost:4321';
const results = [];
let failed = 0;

async function check(name, engine, viewport) {
  let browser;
  try {
    browser = await engine.launch();
  } catch {
    results.push(`– ${name}: skipped, this browser is not installed`);
    return;
  }
  const page = await (await browser.newContext({ viewport })).newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + '/', { waitUntil: 'load' });
    assert.equal(await page.locator('h1').count(), 1);
    const price = () => page.locator('#plan [data-price-per-visit]').innerText();
    const before = await price();
    await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
    await page.waitForFunction((was) => document.querySelector('#plan [data-price-per-visit]').textContent !== was, before);
    assert.equal(await page.locator('.cta--scenic [data-price-per-visit]').innerText(), await price(), 'the closing band shows the same price');
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
    await page.waitForFunction(() => document.querySelector('#whats-included [data-stage]').dataset.phase === 'after');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll');
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    results.push(`✓ ${name}`);
  } catch (e) {
    failed++;
    results.push(`✗ ${name}\n    ${String(e.message).split('\n').slice(0, 3).join('\n    ')}`);
  } finally {
    await browser.close();
  }
}

for (const [label, engine] of [['Firefox', firefox], ['WebKit', webkit]]) {
  await check(`${label}, 1280 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 1280, height: 900 });
  await check(`${label}, 390 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 390, height: 800 });
}

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('✓')).length}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
