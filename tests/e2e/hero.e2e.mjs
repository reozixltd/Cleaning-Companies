/** The home page's first screen (spec §5.1, §5.2): the hero card, its live price, and the estimator beneath it. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const HERO = '.scene-hero';
const text = (page, selector) => page.locator(selector).innerText();
const addBedroom = (page) => page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
const progress = (page) => page.locator(HERO).evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--p')));

/** Every price hook, read from one part of the page. */
const priced = async (page, scope) => ({
  summary: await text(page, `${scope} [data-price-summary]`),
  perVisit: await text(page, `${scope} [data-price-per-visit]`),
  unit: await text(page, `${scope} [data-price-unit]`),
  firstVisit: await page.locator(`${scope} [data-price-first-visit]`).textContent(),
  firstVisitShown: await page.locator(`${scope} [data-price-first-visit-row]`).isVisible(),
  book: await page.locator(`${scope} [data-choose-time]`).getAttribute('href'),
});

await step('the hero carries the one h1, the default price and both ways on', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await text(page, `${HERO} h1`), 'Your home, priced room by room.');
  const hero = await priced(page, HERO);
  assert.equal(hero.perVisit, '$179');
  assert.equal(hero.summary, '3 bed, 2 bath, fortnightly');
  assert.match(hero.firstVisit, /\$318/);
  assert.match(hero.book, /\/book\/\?.*bed=3/);
  assert.match(await text(page, HERO), /Sample prices\./);
  assert.equal(await page.locator(`${HERO} a[href="#plan"]`).innerText(), 'Price your home');
  assert.equal(await text(page, '#plan h2 >> nth=0'), 'Price your home');
  assert.equal(await page.locator('#plan.hero').count(), 1);
}, { width: 1280 });

await step('the hero price follows the estimator and is still right on the next visit', async (page) => {
  await go(page, '/');
  await addBedroom(page);
  assert.equal((await priced(page, HERO)).perVisit, '$197');
  assert.deepEqual(await priced(page, HERO), await priced(page, '#plan'));
  await go(page, '/');
  assert.equal((await priced(page, HERO)).perVisit, '$197');
  assert.deepEqual(await priced(page, HERO), await priced(page, '#plan'));
}, { width: 1280 });

await step('a one-off clean shows one price in the hero too', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] label:has(input[value="end-of-lease"])').click();
  const hero = await priced(page, HERO);
  assert.equal(hero.perVisit, '$438');
  assert.equal(hero.unit, 'one visit');
  assert.equal(hero.firstVisitShown, false);
  assert.deepEqual(hero, await priced(page, '#plan'));
}, { width: 1280 });

for (const width of [375, 1280]) {
  await step(`Price your home goes to the estimator, clear of the header, with the hero out of sight (${width})`, async (page) => {
    await go(page, '/');
    await page.locator(`${HERO} a[href="#plan"]`).click();
    await page.waitForFunction(() => location.hash === '#plan');
    await page.waitForTimeout(200);
    const heading = await page.locator('#plan h2').first().evaluate((el) => el.getBoundingClientRect().top);
    const header = await page.locator('header.header').evaluate((el) => el.getBoundingClientRect().bottom);
    const button = await page.locator(`${HERO} a[href="#plan"]`).evaluate((el) => el.getBoundingClientRect().bottom);
    assert.ok(heading >= header && heading < 400, `the heading is at ${Math.round(heading)}px and the header ends at ${Math.round(header)}px`);
    assert.ok(button <= header, `the hero's last button ends at ${Math.round(button)}px and the header at ${Math.round(header)}px`);
  }, { width });
}

for (const width of [375, 1280]) {
  await step(`every control in the hero is at least 44px (${width})`, async (page) => {
    await go(page, '/');
    assert.ok((await page.locator(`${HERO} :is(a, button)`).count()) >= 2, 'the hero has its two buttons');
    const small = await page.$$eval(`${HERO} :is(a, button)`, (els) =>
      els
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 1 && box.height > 1)
        .filter(({ box }) => box.height < 44 || box.width < 44)
        .map(({ el, box }) => `"${el.textContent.trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`),
    );
    assert.deepEqual(small, []);
  }, { width });
}

await step('the hero reports its scroll progress, from 0 at the top of the page', async (page) => {
  await go(page, '/');
  assert.equal(await progress(page), 0);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.scene-hero')).getPropertyValue('--p')) > 0);
  const p = await progress(page);
  assert.ok(p > 0 && p < 1, `--p is ${p}`);
}, { width: 1280 });

await step('reduced motion leaves the hero still', async (page) => {
  await go(page, '/');
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(300);
  assert.equal(await progress(page), 0);
}, { width: 1280, reducedMotion: 'reduce' });

await step('without JavaScript the hero still prices the default home', async (page) => {
  await go(page, '/');
  assert.equal(await text(page, `${HERO} h1`), 'Your home, priced room by room.');
  assert.equal(await text(page, `${HERO} [data-price-per-visit]`), '$179');
  assert.match(await page.locator(`${HERO} [data-choose-time]`).getAttribute('href'), /\/book\/\?.*bed=3/);
  assert.equal(await page.locator(`${HERO} a[href="#plan"]`).count(), 1);
  assert.equal(await page.locator('#plan [data-room-id="bed-3"]').count(), 1);
}, { width: 1280, javaScriptEnabled: false });

await step('the estimator starts on the first screen of a laptop, and a returning visitor sees no pinned tag over the hero', async (page) => {
  await go(page, '/');
  const top = await page.locator('#plan').evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(top < 800, `#plan starts at ${Math.round(top)}px`);
  await addBedroom(page);
  await go(page, '/');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  assert.ok(!(await page.locator('[data-booking-tag]').isVisible()));
}, { width: 1280 });

await step('the pinned tag stays away while the hero price is on screen, and comes back below the estimator', async (page) => {
  await go(page, '/');
  await addBedroom(page);
  // A screen short enough that the hero's price is showing and the estimator is not.
  const priceTop = await page.locator(`${HERO} [data-price-line]`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const height = Math.round(priceTop) + 60;
  await page.setViewportSize({ width: 1280, height });
  await go(page, '/');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  const planTop = await page.locator('#plan').evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(planTop > height, `the estimator starts at ${Math.round(planTop)}px on a ${height}px screen`);
  assert.ok(!(await page.locator('[data-booking-tag]').isVisible()));
  await page.locator('#plan').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY));
  await page.locator('[data-booking-tag]').waitFor();
}, { width: 1280 });

// The photo layout is chosen at build time (a `hero` photo). These two steps switch its class on, so its CSS is tested without the asset.
const scenic = (page) => page.locator(HERO).evaluate((el) => el.classList.add('scene-hero--scenic'));

await step('under a photo hero the estimator still starts on the first screen of a laptop', async (page) => {
  for (const [width, height] of [[1024, 768], [1280, 800], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    await go(page, '/');
    await scenic(page);
    const plan = await page.locator('#plan').evaluate((el) => el.getBoundingClientRect().top);
    const buttons = await page.locator(`${HERO} a[href="#plan"]`).evaluate((el) => el.getBoundingClientRect().bottom);
    assert.ok(plan <= height - 48, `${width}x${height}: the estimator starts at ${Math.round(plan)}px`);
    assert.ok(buttons < plan, `${width}x${height}: the buttons end at ${Math.round(buttons)}px and the estimator starts at ${Math.round(plan)}px`);
  }
});

await step('under a photo hero the card stays solid while its buttons are on screen', async (page) => {
  await go(page, '/');
  await scenic(page);
  await page.evaluate(() => window.scrollTo(0, 480));
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.scene-hero')).getPropertyValue('--p')) > 0);
  assert.equal(await page.locator(`${HERO} .scene-hero__card`).evaluate((el) => getComputedStyle(el).opacity), '1');
}, { width: 1280 });

await step('home has no horizontal scroll at 320, 375, 768, 1024 and 1280', async (page) => {
  for (const width of [320, 375, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/');
    assert.equal(await overflow(page), 0, `${width}px`);
  }
});

await finish();
