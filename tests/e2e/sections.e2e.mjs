/** The home page's sections below the estimator (spec §5.3 to §5.10) and the Reveal system (spec §8). */
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const THEMES = ['floorplan', 'eucalyptus'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/** Scroll the whole page in steps so every block has been on screen, then wait for the last fade to finish. */
async function revealAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
}

async function seriousIssues(page) {
  // Scan from the top: content scrolled under the sticky header reads as "obscured" to axe.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
}

const opacities = (page) => page.$$eval('[data-reveal]', (els) => els.map((el) => getComputedStyle(el).opacity));

// ── Reveal (spec §8) ─────────────────────────────────────────
await step('without JavaScript every block is visible', async (page) => {
  for (const path of ['/', '/about/']) {
    await go(page, path);
    const found = await opacities(page);
    assert.ok(found.length > 0, `${path} has blocks marked data-reveal`);
    assert.ok(found.every((o) => o === '1'), `${path}: ${found.join(' ')}`);
  }
}, { width: 1280, javaScriptEnabled: false });

await step('a block below the fold waits, shows once it is scrolled to, and stays shown', async (page) => {
  await go(page, '/');
  const head = page.locator('#how [data-reveal]').first();
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '0');
  await head.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#how [data-reveal]')).opacity === '1');
  assert.ok(await head.evaluate((el) => el.classList.contains('is-in')));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '1');
}, { width: 1280 });

await step('what is already on screen at load never fades', async (page) => {
  await go(page, '/');
  const onScreen = await page.$$eval('[data-reveal]', (els) =>
    els.filter((el) => el.getBoundingClientRect().top < window.innerHeight).map((el) => `${el.classList.contains('is-in')} ${getComputedStyle(el).opacity}`));
  assert.ok(onScreen.length > 0, 'a 3000px-tall screen shows some blocks at load');
  assert.ok(onScreen.every((s) => s === 'true 1'), onScreen.join(', '));
}, { width: 1280, height: 3000 });

await step('reduced motion leaves every block in place', async (page) => {
  await go(page, '/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
  const found = await opacities(page);
  assert.ok(found.length > 0 && found.every((o) => o === '1'), found.join(' '));
}, { width: 1280, reducedMotion: 'reduce' });

await step('the owner console gets no motion', async (page) => {
  await go(page, '/console/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
}, { width: 1280 });

await step('printing shows every block, scrolled to or not', async (page) => {
  await go(page, '/services/end-of-lease/');
  await page.emulateMedia({ media: 'print' });
  const found = await opacities(page);
  assert.ok(found.length > 0 && found.every((o) => o === '1'), found.join(' '));
}, { width: 1280 });

await step('the booking page has nothing that fades in', async (page) => {
  await go(page, '/book/');
  assert.equal(await page.locator('[data-reveal]').count(), 0);
}, { width: 1280 });

await step('scroll progress is exactly 0 below the screen and exactly 1 above it', async (page) => {
  await go(page, '/');
  const p = () => page.locator('.scene-hero').evaluate((el) => el.style.getPropertyValue('--p'));
  assert.equal(await p(), '0.0000');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.scene-hero').style.getPropertyValue('--p') === '1.0000');
}, { width: 1280 });

// ── Trust, process, FAQ (spec §5.3, §5.8, §5.10) ─────────────
await step('the four trust proofs rise one after another', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('.trust__item[data-reveal]').count(), 4);
  await page.locator('.trust__item').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.trust__item .icon')].every((el) => getComputedStyle(el).opacity === '1'));
  // The stagger delay sits on the shown rule, so it is read once every item is in.
  const delays = await page.$$eval('.trust__item[data-reveal]', (els) => els.map((el) => parseFloat(getComputedStyle(el).transitionDelay)));
  assert.equal(delays.length, 4);
  assert.deepEqual([...delays].sort((a, b) => a - b), delays);
  assert.ok(delays[3] > delays[0], delays.join(' '));
}, { width: 1280 });

const fillOf = () => new DOMMatrix(getComputedStyle(document.querySelector('#how .steps'), '::after').transform).a;
const lastNumber = (page) => page.locator('#how .steps li').last().evaluate((li) => Number(getComputedStyle(li, '::before').opacity));

await step('the process line fills, and its numbers darken, as the steps cross the screen', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#how ol.steps > li').count(), 4);
  const toSteps = (fromTop) =>
    page.locator('#how .steps').evaluate((ol, y) => window.scrollTo({ top: ol.getBoundingClientRect().top + window.scrollY - y, behavior: 'instant' }), fromTop);
  await toSteps(780); // the list has only just come on screen
  await page.waitForFunction(`(${fillOf})() < 0.1`);
  assert.ok((await lastNumber(page)) < 0.7, 'the last number starts quiet');
  await toSteps(120); // the list is near the top
  await page.waitForFunction(`(${fillOf})() === 1`);
  assert.equal(await lastNumber(page), 1);
}, { width: 1280 });

await step('under reduced motion the process line is complete from the start', async (page) => {
  await go(page, '/');
  assert.equal(await page.evaluate(fillOf), 1);
  assert.equal(await lastNumber(page), 1);
}, { width: 1280, reducedMotion: 'reduce' });

await step('the FAQ keeps its native accordion', async (page) => {
  await go(page, '/');
  const first = page.locator('#faq details').first();
  await first.locator('summary').click();
  assert.equal(await first.evaluate((d) => d.open), true);
  assert.ok(await first.locator('p').isVisible());
});

// ── After every block has shown ──────────────────────────────
for (const theme of THEMES) {
  for (const width of [375, 1280]) {
    await step(`axe finds no serious or critical issues once everything has been revealed (${theme}, ${width})`, async (page) => {
      const found = [];
      for (const path of ['/', '/about/', '/areas/chermside/']) {
        await go(page, `${path}?theme=${theme}`);
        await revealAll(page);
        found.push(...(await seriousIssues(page)).map((i) => `${path}: ${i}`));
      }
      assert.deepEqual(found, []);
    }, { width });
  }
}

for (const width of [320, 375, 768, 1280]) {
  await step(`no horizontal scroll once every section has shown (${width})`, async (page) => {
    await go(page, '/');
    await revealAll(page);
    assert.equal(await overflow(page), 0);
  }, { width });
}

await finish();
