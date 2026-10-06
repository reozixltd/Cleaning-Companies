/**
 * Quality pass (Task 20): accessibility scans, tap targets, motion, image
 * preload, and the two contrast rules axe can't see (field borders and focus
 * rings, WCAG 1.4.11).
 */
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { harness } from './harness.mjs';

const { step, go, finish } = await harness();

const THEMES = ['floorplan', 'eucalyptus'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

const bookPanel = (page, id) => page.locator(`[data-book-step="${id}"]`);
const next = (page, id) => bookPanel(page, id).locator('[data-next]').click();
const choose = (page, name, value) => page.locator(`#book-form label:has(input[name="${name}"][value="${value}"])`).click();

async function toBookingStep4(page, theme) {
  await go(page, `/book/?theme=${theme}`);
  await next(page, 'home');
  await page.locator('#book-form label:has(input[name="day"])').first().click();
  await choose(page, 'window', 'morning');
  await next(page, 'when');
  await choose(page, 'method', 'home');
  await next(page, 'access');
  await bookPanel(page, 'you').waitFor();
}

async function signIn(page, theme) {
  await go(page, `/console/?theme=${theme}`);
  await page.fill('#signin-email', 'owner@demo.clearday');
  await page.fill('#signin-password', 'demo1234');
  await page.locator('[data-signin] button[type="submit"]').click();
  await page.locator('[data-lead-list] [data-lead-id]').first().waitFor();
}

async function seriousIssues(page) {
  // Scan from the top: content scrolled under the sticky header reads as "obscured" to axe.
  await page.evaluate(() => window.scrollTo(0, 0));
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  // Owner-approved exception: white text on the pink primary action (DESIGN.md), on these two elements only.
  const APPROVED = /btn--accent|bar__book/;
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => (v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((n) => !APPROVED.test(`${n.target.join(' ')} ${n.html}`)) } : v))
    .filter((v) => v.nodes.length > 0)
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
}

// ── Accessibility scans ──────────────────────────────────────
for (const theme of THEMES) {
  for (const width of [375, 1280]) {
    await step(`axe finds no serious or critical issues (${theme}, ${width})`, async (page) => {
      const found = [];
      const scan = async (label) => found.push(...(await seriousIssues(page)).map((i) => `${label}: ${i}`));
      for (const path of ['/', '/offices/']) {
        await go(page, `${path}?theme=${theme}`);
        await scan(path);
      }
      await go(page, `/book/?theme=${theme}`);
      await scan('/book/ step 1');
      await toBookingStep4(page, theme);
      await scan('/book/ step 4');
      await bookPanel(page, 'you').locator('[data-next]').click(); // empty: error summary showing
      await scan('/book/ step 4 errors');
      await signIn(page, theme);
      await page.locator('[data-lead-list] [data-lead-id]').first().click();
      await scan('/console/ signed in');
      assert.deepEqual(found, []);
    }, { width });
  }
}

// ── Contrast axe can't measure ───────────────────────────────
/**
 * In the page: WCAG contrast of an element's colour property (a border or an
 * outline) against the colours next to it: the page behind the element and,
 * for borders, the element's own fill. The lowest ratio counts.
 */
const contrastOf = (els, prop) =>
  els.map((el) => {
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (c) => c.length === 3 || (c.length === 4 && c[3] > 0);
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (x, y) => (Math.max(lum(x), lum(y)) + 0.05) / (Math.min(lum(x), lum(y)) + 0.05);
    const backdrop = (node) => {
      for (let n = node; n; n = n.parentElement) {
        const c = rgb(getComputedStyle(n).backgroundColor);
        if (opaque(c)) return c.slice(0, 3);
      }
      return [255, 255, 255];
    };
    const colour = rgb(getComputedStyle(el)[prop]).slice(0, 3);
    const next = [backdrop(el.parentElement)];
    const own = rgb(getComputedStyle(el).backgroundColor);
    if (prop.startsWith('border') && opaque(own)) next.push(own.slice(0, 3));
    const ratio = Math.min(...next.map((c) => contrast(colour, c)));
    return { id: el.id || el.getAttribute('href') || el.tagName, ratio: Math.round(ratio * 100) / 100 };
  });

for (const theme of THEMES) {
  await step(`form field borders reach 3:1 against the page (${theme})`, async (page) => {
    await go(page, `/?theme=${theme}`);
    const home = await page.$$eval('#suburb-input', contrastOf, 'borderTopColor');
    await toBookingStep4(page, theme);
    const book = await page.$$eval('#book-form [data-book-step="you"] :is(input[type="text"], input[type="email"], input[type="tel"], textarea, select)', contrastOf, 'borderTopColor');
    const weak = [...home, ...book].filter((f) => f.ratio < 3);
    assert.ok(book.length >= 6, `found ${book.length} booking fields`);
    assert.deepEqual(weak, []);
  });

  await step(`focus rings reach 3:1 against what they sit on (${theme})`, async (page) => {
    await go(page, `/?theme=${theme}`);
    const targets = page.locator('[data-demo-ribbon] a, header a, header button');
    const weak = [];
    for (let i = 0; i < (await targets.count()); i++) {
      const el = targets.nth(i);
      if (!(await el.isVisible())) continue;
      await el.evaluate((node) => node.focus());
      const [result] = await el.evaluateAll(contrastOf, 'outlineColor');
      if (result.ratio < 3) weak.push(result);
    }
    assert.deepEqual(weak, []);
  }, { width: 1280 });
}

// ── Tap targets ──────────────────────────────────────────────
const TARGETS =
  ':is(a, button, select, input:not([type="radio"], [type="checkbox"], [type="hidden"]), [role="button"], label:has(> input[type="radio"]), label:has(> input[type="checkbox"]))';

async function smallTargets(page, scope) {
  return page.$$eval(`${scope} ${TARGETS}`, (els) =>
    els
      .filter((el) => !el.closest('p') || el.tagName !== 'A') // inline text links in paragraphs are exempt
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ el, box }) => box.width > 1 && box.height > 1 && getComputedStyle(el).visibility !== 'hidden')
      .filter(({ box }) => box.height < 44)
      .map(({ el, box }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(box.height)}px`),
  );
}

for (const width of [375, 1280]) {
  await step(`tap targets are at least 44px (${width})`, async (page) => {
    await go(page, '/');
    await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click(); // shows the mobile booking bar
    const small = [...(await smallTargets(page, 'header')), ...(await smallTargets(page, '.hero')), ...(await smallTargets(page, '[data-booking-bar]'))];
    await toBookingStep4(page, 'floorplan');
    small.push(...(await smallTargets(page, '#book-form')));
    assert.deepEqual(small, []);
  }, { width });
}

// ── Motion ───────────────────────────────────────────────────
const pressedTransform = async (page, selector) => {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const t = await el.evaluate((n) => getComputedStyle(n).transform);
  await page.mouse.move(0, 0); // release away from the control, so a link doesn't navigate
  await page.mouse.up();
  return t;
};
const PRESSABLE = ['#plan [data-choose-time]', '[data-plan-controls] [data-step="bedrooms"][data-delta="1"]'];

await step('pressing a control scales it slightly', async (page) => {
  await go(page, '/');
  for (const selector of PRESSABLE) assert.match(await pressedTransform(page, selector), /^matrix\(0\.9\d/, selector);
}, { width: 1280 });

await step('reduced motion removes movement and keeps the room colour fade', async (page) => {
  await go(page, '/');
  for (const selector of PRESSABLE) assert.equal(await pressedTransform(page, selector), 'none', selector);
  const fill = await page.locator('#plan .room--included .room__fill').first().evaluate((n) => getComputedStyle(n).transitionProperty);
  assert.match(fill, /fill/);
}, { width: 1280, reducedMotion: 'reduce' });

// ── Storage blocked ──────────────────────────────────────────
// "Block all cookies", or the demo embedded in a frame with third-party storage
// blocked: reading localStorage itself throws. Pages must still work.
const blockStorage = (context) =>
  context.addInitScript(() => {
    const denied = () => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: denied, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get: denied, configurable: true });
  });

await step('the site still works when the browser blocks storage', async (page, context) => {
  await blockStorage(context);
  await go(page, '/?theme=eucalyptus');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'eucalyptus');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.match(await page.locator('#plan [data-price-per-visit]').innerText(), /\$197/);
  await go(page, '/book/');
  await bookPanel(page, 'home').locator('[data-next]').click();
  assert.ok((await page.locator('#book-form input[name="day"]').count()) > 0, 'day choices drawn');
}, { width: 1280 });

// ── Images ───────────────────────────────────────────────────
// The home page has no hero photo (the floor plan is the hero). Where a page
// opens with a photo, that photo is the largest paint: it must not wait for
// lazy loading. Passes trivially until photos are added to src/assets/photos/.
for (const width of [375, 1280]) {
  await step(`photos on the first screen load eagerly with high priority (${width})`, async (page) => {
    const late = [];
    for (const path of ['/', '/services/regular/', '/areas/chermside/', '/offices/', '/about/']) {
      await go(page, path);
      late.push(
        ...(await page.$$eval('main img', (imgs) =>
          imgs
            .filter((img) => img.getBoundingClientRect().top < window.innerHeight)
            .filter((img) => img.loading === 'lazy' || img.getAttribute('fetchpriority') !== 'high')
            .map((img) => `${location.pathname} ${img.alt}`),
        )),
      );
    }
    assert.deepEqual(late, []);
  }, { width });
}

await finish();
