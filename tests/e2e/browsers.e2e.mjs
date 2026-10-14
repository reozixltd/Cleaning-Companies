/**
 * The home page in Firefox and WebKit (spec §19, phase 6), where Playwright has
 * them installed. Every other file runs in Chromium through harness.mjs; this one
 * checks that the page still reads, prices and scrolls in the other two engines.
 * A browser that is not installed is reported as skipped and never counted as
 * passed; any other launch problem is a failure.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { firefox, webkit } from 'playwright';

const base = process.argv[2] ?? process.env.E2E_BASE ?? 'http://localhost:4321';
const results = [];
const skipped = [];
let failed = 0;

const twoFrames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function check(name, engine, viewport, run) {
  if (!existsSync(engine.executablePath())) {
    skipped.push(`– ${name}: skipped, ${engine.name()} is not installed`);
    return;
  }
  let browser;
  try {
    browser = await engine.launch();
    const page = await (await browser.newContext({ viewport })).newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await run(page);
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    results.push(`✓ ${name}`);
  } catch (e) {
    failed++;
    results.push(`✗ ${name}\n    ${String(e.message).split('\n').slice(0, 3).join('\n    ')}`);
  } finally {
    await browser?.close();
  }
}

async function homeWorks(page) {
  await page.goto(base + '/', { waitUntil: 'load' });
  assert.equal(await page.locator('h1').count(), 1);
  // The motion script has run: without it every block is simply shown and the waits below would pass on their own.
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains('motion')), 'html has .motion');
  assert.ok(await page.locator('#whats-included .stage').evaluate((el) => el.classList.contains('is-live')), 'the stage is live');
  assert.equal(await page.locator('#whats-included [data-stage]').getAttribute('data-phase'), 'before', 'the stage starts at "before"');
  assert.ok(await page.$$eval('[data-reveal]', (els) => els.some((el) => getComputedStyle(el).opacity !== '1')), 'some block is waiting to be revealed');
  const price = () => page.locator('#plan [data-price-per-visit]').innerText();
  const before = await price();
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.waitForFunction((was) => document.querySelector('#plan [data-price-per-visit]').textContent !== was, before);
  assert.equal(await page.locator('.cta--scenic [data-price-per-visit]').innerText(), await price(), 'the closing band shows the same price');
  // Two animation frames after every jump, so each block has been on screen for a rendered frame.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
  await page.waitForFunction(() => document.querySelector('#whats-included [data-stage]').dataset.phase === 'after');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll');
}

/** A reload puts the page back where it was, also where the stage pins (the browser restores the scroll before the stage's script runs). */
async function reloadLandsBack(page) {
  await page.goto(base + '/', { waitUntil: 'load' });
  const howTop = () => page.evaluate(() => document.querySelector('#how').getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('#how').getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' }));
  // WebKit writes the scroll position into the page's history entry on a timer of its own (about half a second), not on a frame.
  // Reloading sooner finds nothing to restore. This is the one fixed wait in the file; there is nothing in the page to wait for.
  await page.waitForTimeout(1000);
  assert.ok(Math.abs((await howTop()) - 200) < 5, `#how is 200px from the top before the reload: ${await howTop()}`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#whats-included .stage')?.classList.contains('is-live'));
  await twoFrames(page);
  const top = await howTop();
  assert.ok(Math.abs(top - 200) <= 60, `after a reload #how is ${Math.round(top)}px from the top, not 200`);
}

for (const [label, engine] of [['Firefox', firefox], ['WebKit', webkit]]) {
  await check(`${label}, 1280 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 1280, height: 900 }, homeWorks);
  await check(`${label}, 390 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 390, height: 800 }, homeWorks);
}
await check('WebKit, 1280 wide: a reload lands where the page was, with the stage pinned', webkit, { width: 1280, height: 900 }, reloadLandsBack);

console.log(results.join('\n'));
if (skipped.length) console.log(`\n${skipped.join('\n')}\n${skipped.length} steps skipped (not counted below)`);
console.log(`\n${results.filter((r) => r.startsWith('✓')).length}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
