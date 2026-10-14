/** The Scene backdrop (spec §7.1), exercised on the /dev/ui/ page with the sample clip. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, finish } = await harness();

const scene = (page) => page.locator('[data-scene]').first();
const paused = (page) => scene(page).locator('video').evaluate((video) => video.paused);

function mediaRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('/media/')) urls.push(request.url());
  });
  return urls;
}

async function open(page) {
  await go(page, '/dev/ui/');
  await scene(page).scrollIntoViewIfNeeded();
}

/** A device that must not get the video: nothing asked for, no source attached, no button. */
async function staysStill(page) {
  const urls = mediaRequests(page);
  await open(page);
  await page.waitForTimeout(700);
  assert.deepEqual(urls, []);
  assert.equal(await scene(page).locator('video source').count(), 0);
  assert.ok(!(await scene(page).locator('[data-scene-toggle]').isVisible()));
  assert.equal(await scene(page).locator('img').count(), 1, 'the still is there');
}

const connection = (context, value) =>
  context.addInitScript((v) => Object.defineProperty(Navigator.prototype, 'connection', { get: () => v, configurable: true }), value);

await step('a wide screen gets the video over the still, with a pause button', async (page) => {
  const urls = mediaRequests(page);
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  assert.ok(urls.some((url) => url.endsWith('/media/sample.webm')), urls.join(', '));
  assert.equal(await paused(page), false);
  const video = scene(page).locator('video');
  assert.equal(await video.getAttribute('aria-hidden'), 'true');
  assert.equal(await video.evaluate((v) => v.muted && v.loop && v.playsInline), true);
  const toggle = scene(page).locator('[data-scene-toggle]');
  assert.ok(await toggle.isVisible());
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.equal((await toggle.innerText()).trim(), 'Pause background video');
  const box = await toggle.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44, `${box.width}x${box.height}`);
}, { width: 1280 });

await step('the pause button stops the video and starts it again', async (page) => {
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  const toggle = scene(page).locator('[data-scene-toggle]');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await paused(page), true);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => !document.querySelector('[data-scene] video').paused);
}, { width: 1280 });

await step('the video stops when the scene leaves the screen, and a paused one stays paused', async (page) => {
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('[data-scene] video').paused);
  await scene(page).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('[data-scene] video').paused);
  await scene(page).locator('[data-scene-toggle]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await scene(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.equal(await paused(page), true);
}, { width: 1280 });

await step('the still is one picture with a crop for phones and no alt text', async (page) => {
  await open(page);
  assert.equal(await scene(page).locator('picture').count(), 1);
  assert.ok((await scene(page).locator('picture source[media="(max-width: 767px)"]').count()) >= 1);
  assert.equal(await scene(page).locator('img').getAttribute('alt'), '');
}, { width: 1280 });

await step('phones never ask for the video', (page) => staysStill(page));

await step('reduced motion never asks for the video', (page) => staysStill(page), { width: 1280, reducedMotion: 'reduce' });

await step('Save-Data never asks for the video', async (page, context) => {
  await connection(context, { saveData: true, effectiveType: '4g' });
  await staysStill(page);
}, { width: 1280 });

await step('a 3G connection never asks for the video', async (page, context) => {
  await connection(context, { saveData: false, effectiveType: '3g' });
  await staysStill(page);
}, { width: 1280 });

await finish();
