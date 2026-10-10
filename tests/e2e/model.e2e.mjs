/**
 * The 3D home model on the estimator (spec §6, §16): it lines up with the SVG
 * plan, never gets in the plan's way, and the flat plan carries on whenever the
 * model can't or shouldn't load.
 */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { browser, step, go, overflow, finish } = await harness();

const FIGURE = '#plan [data-plan]';
const MODEL_ON = `${FIGURE}[data-model="on"]`;
const FLAT = '#plan [data-plan-stage] > [data-plan-svg]';

// Spec §16: without WebGL in the test browser, "model on" steps are skipped, never passed.
const probe = await browser.newPage();
const webgl = await probe.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
await probe.close();
const modelStep = (name, fn, options) => (webgl ? step(name, fn, options) : console.log(`– skipped, this browser has no WebGL2: ${name}`));

const modelOn = (page) => page.locator(MODEL_ON).waitFor({ timeout: 15000 });
const boxes = (page) => page.locator(FIGURE).getAttribute('data-model-boxes');
const price = (page) => page.locator('#plan [data-price-per-visit]').innerText();
const rect = (page, selector) =>
  page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  });

/** Waits until the model has stopped moving: the drawing's on-screen box reads the same twice running. */
async function settled(page) {
  let before = '';
  for (let i = 0; i < 50; i++) {
    const now = JSON.stringify(await rect(page, `${FIGURE} [data-plan-svg]`));
    if (now === before) return;
    before = now;
    await page.waitForTimeout(120);
  }
  throw new Error('the model never settled');
}

/** The largest gap, in pixels, between where WebGL puts a room's floor and where the browser drew that SVG room. */
async function misalignment(page, id) {
  const fill = `${FIGURE} [data-room-id="${id}"] .room__fill`;
  const dom = await rect(page, fill);
  const gl = await page.$eval(fill, (el) => {
    const figure = el.closest('[data-plan]');
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((name) => Number(el.getAttribute(name)) / 40); // svg.ts UNIT
    const points = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => figure.planPointOnScreen(px, py));
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  return Math.max(...dom.map((edge, i) => Math.abs(edge - gl[i])));
}

/** The core estimator behaviour on a fresh visit. It must hold whether or not the model is running. */
async function estimatorWorks(page) {
  assert.equal(await price(page), '$179');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
  assert.equal(await price(page), '$197');
  await page.locator('#plan [data-room-id="add-study"]').click();
  assert.equal(await page.locator('#plan [data-room-id="study"]').count(), 1);
  assert.notEqual(await price(page), '$197');
  await page.locator('#plan [data-room-id="add-bathroom"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#plan [data-room-id="bath-3"]').count(), 1);
}

/** Collects requests for the lazy model chunk. */
function modelRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('scene3d')) urls.push(request.url());
  });
  return urls;
}

/** A page where the model must not run: nothing was asked for, the plan is flat, and it all still works. */
async function staysFlat(page, { asked = 0 } = {}) {
  const urls = modelRequests(page);
  await go(page, '/');
  await page.waitForTimeout(700);
  assert.equal(urls.length, asked, 'requests for the model');
  assert.equal(await page.locator(MODEL_ON).count(), 0);
  assert.equal(await page.locator(FLAT).count(), 1);
  await estimatorWorks(page);
}

// ── Model on ─────────────────────────────────────────────────
await modelStep('the model starts on a wide screen and lines up with the SVG plan', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  for (const id of ['bed-1', 'kitchen', 'add-study']) {
    const off = await misalignment(page, id);
    assert.ok(off <= 1.5, `${id} is ${off.toFixed(2)}px out`);
  }
  const stage = await rect(page, '#plan [data-plan-stage]');
  const drawing = await rect(page, `${FIGURE} [data-plan-svg]`);
  assert.ok(drawing[3] - drawing[1] < (stage[3] - stage[1]) * 0.9, 'the plan is tilted at rest');
  const canvas = page.locator('#plan canvas.plan__model');
  assert.equal(await canvas.getAttribute('aria-hidden'), 'true');
  assert.equal(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await boxes(page), '41');
  assert.equal(await overflow(page), 0);
}, { width: 1280 });

await modelStep('starting the model shifts nothing and keeps keyboard focus', async (page) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route('**/scene3d*', async (route) => {
    await held;
    await route.continue();
  });
  await go(page, '/');
  await page.locator(`${FIGURE} [data-room-id="add-laundry"]`).focus();
  const around = () => Promise.all(['#plan [data-plan-stage]', '#plan [data-plan-rooms]', '#plan [data-price-tag]'].map((s) => rect(page, s)));
  const before = await around();
  release();
  await modelOn(page);
  assert.deepEqual(await around(), before);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-room-id')), 'add-laundry');
}, { width: 1280 });

await modelStep('rooms can still be added by click and by keyboard with the model on', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await settled(page);
  await page.locator('#plan [data-room-id="add-bedroom"]').click();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
  assert.equal(await price(page), '$197');
  assert.equal(await boxes(page), '47');
  await page.locator('#plan [data-room-id="add-bathroom"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#plan [data-room-id="bath-3"]').count(), 1);
  assert.equal(await boxes(page), '53');
  assert.ok(await page.evaluate(() => document.activeElement?.closest('[data-plan]') !== null), 'focus stays in the plan');
}, { width: 1280 });

await modelStep("a returning visitor's saved home is the one the model builds", async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.locator('[data-toggle="study"]').click();
  await go(page, '/');
  await modelOn(page);
  assert.equal(await boxes(page), '52');
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  const off = await misalignment(page, 'bed-4');
  assert.ok(off <= 1.5, `bed-4 is ${off.toFixed(2)}px out`);
}, { width: 1280 });

await modelStep('the model follows a resize and stays inside the page', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.setViewportSize({ width: 900, height: 800 });
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  const off = await misalignment(page, 'bed-1');
  assert.ok(off <= 1.5, `bed-1 is ${off.toFixed(2)}px out after the resize`);
  assert.equal(await overflow(page), 0);
}, { width: 1280 });

await modelStep('losing the WebGL context puts the flat plan back and the estimator still works', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.locator('#plan canvas.plan__model').evaluate((canvas) => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator(MODEL_ON).waitFor({ state: 'detached' });
  assert.equal(await page.locator('#plan canvas').count(), 0);
  assert.equal(await page.locator(FLAT).count(), 1);
  assert.equal(await page.locator(`${FIGURE} [data-plan-svg]`).getAttribute('style'), null);
  assert.equal(await page.locator(FIGURE).getAttribute('data-model-boxes'), null);
  await estimatorWorks(page);
}, { width: 1280 });

// ── Model off ────────────────────────────────────────────────
await step('phones get the flat plan and never download the model', (page) => staysFlat(page));

await step('reduced motion keeps the flat plan', (page) => staysFlat(page), { width: 1280, reducedMotion: 'reduce' });

await step('Save-Data keeps the flat plan', async (page, context) => {
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }), configurable: true }));
  await staysFlat(page);
}, { width: 1280 });

await step('a browser without WebGL2 keeps the flat plan', async (page, context) => {
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return type === 'webgl2' ? null : original.call(this, type, ...rest);
    };
  });
  await staysFlat(page);
}, { width: 1280 });

await modelStep('a model that fails to download leaves the flat plan working', async (page) => {
  await page.route('**/scene3d*', (route) => route.abort());
  await staysFlat(page, { asked: 1 });
}, { width: 1280 });

await step('the booking page never asks for the model', async (page) => {
  const urls = modelRequests(page);
  await go(page, '/book/');
  await page.waitForTimeout(700);
  assert.deepEqual(urls, []);
}, { width: 1280 });

await finish();
