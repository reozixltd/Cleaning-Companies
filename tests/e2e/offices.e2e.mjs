/** Offices page and walk-through request (Task 17). */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, leads, finish } = await harness();

/** bindSimpleForm holds the first send made within 3 s of load ("Not sent yet"), so wait like a person would. */
const humanPause = (page) => page.waitForTimeout(3100);

async function fillWalkthrough(page) {
  const form = page.locator('#walkthrough form');
  await form.locator('#field-company').fill('Northside Dental');
  await form.locator('#field-firstName').fill('Priya');
  await form.locator('#field-lastName').fill('Shah');
  await form.locator('#field-phone').fill('0491 570 110');
  await form.locator('#field-email').fill('priya@example.com');
  await form.locator('#field-siteAddress').fill('Level 2, 12 Gympie Road');
  await form.locator('#field-suburb').fill('Chermside');
  await form.locator('#field-postcode').fill('4032');
  await form.locator('#field-floorArea').selectOption('200–500 m²');
  await form.locator('#field-frequency').selectOption({ index: 1 });
  await form.locator('#field-preferredTimes').fill('Tuesday or Thursday after 5pm');
}

await step('offices walk-through submits and stores one walk-through lead', async (page) => {
  await go(page, '/offices/');
  await fillWalkthrough(page);
  await humanPause(page);
  await page.locator('#walkthrough button[type="submit"]').click();
  const done = page.locator('#walkthrough [role="status"]');
  assert.equal(await done.innerText(), "Walk-through requested. We'll call you within 1 business day to book a time.");
  const stored = await leads(page);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].kind, 'walkthrough');
  assert.equal(stored[0].payload.company, 'Northside Dental');
  assert.equal(stored[0].payload.floorArea, '200–500 m²');
  assert.equal(stored[0].consent.marketingSms, false);
});

await step('fixing a field then pressing Send with the pointer still sends', async (page) => {
  await go(page, '/offices/');
  await fillWalkthrough(page);
  await page.locator('#walkthrough #field-postcode').fill('40');
  await humanPause(page);
  await page.locator('#walkthrough button[type="submit"]').click();
  await page.locator('#walkthrough [data-error-for="postcode"]:not([hidden])').waitFor();
  await page.locator('#walkthrough #field-postcode').fill('4032');
  // A real press: pointer down then up. If the fixed field's error only clears on
  // blur, the form shrinks between the two and the press misses the button.
  const send = page.locator('#walkthrough button[type="submit"]');
  await send.scrollIntoViewIfNeeded();
  const box = await send.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.locator('#walkthrough [role="status"]').waitFor({ timeout: 2000 });
  assert.equal((await leads(page)).length, 1);
});

await step('sending an empty walk-through shows a focused error summary', async (page) => {
  await go(page, '/offices/');
  await humanPause(page);
  await page.locator('#walkthrough button[type="submit"]').click();
  const summary = page.locator('#walkthrough [data-error-summary]');
  assert.ok(await summary.isVisible());
  assert.ok(await summary.evaluate((el) => el === document.activeElement), 'summary has focus');
  assert.match(await summary.innerText(), /Enter your company name/);
  assert.equal(await summary.locator('a[href="#field-company"]').count(), 1);
  assert.equal((await leads(page)).length, 0);
});

await step('an error link brings its field and label out from under the sticky header', async (page) => {
  await go(page, '/offices/');
  await humanPause(page);
  await page.locator('#walkthrough button[type="submit"]').click();
  await page.locator('#walkthrough [data-error-summary] a[href="#field-siteAddress"]').click();
  await page.waitForTimeout(100);
  const headerBottom = await page.locator('header').evaluate((el) => el.getBoundingClientRect().bottom);
  const labelTop = await page.locator('label[for="field-siteAddress"]').evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(labelTop >= headerBottom, `label sits below the header (label ${labelTop}, header ${headerBottom})`);
});

await step('offices page explains pricing factors with no homeowner prices and no bond claim', async (page) => {
  await go(page, '/offices/');
  const factors = await page.locator('#pricing').innerText();
  for (const factor of [/Floor area/, /Floor types/, /Frequency/, /Cleaning hours/, /Consumables/]) assert.match(factors, factor);
  const text = await page.locator('body').innerText();
  assert.doesNotMatch(text, /\$\d+ a visit/);
  assert.doesNotMatch(text, /from \$\d+/);
  assert.equal(await page.locator('[data-booking-bar]').count(), 0, 'no homeowner booking bar');
  assert.doesNotMatch(text, /bonded/i, 'business.bonded is false in the demo');
});

await step('offices page has one h1 and the ABN in the footer', async (page) => {
  await go(page, '/offices/');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('h1').innerText(), 'Office and commercial cleaning');
  assert.match(await page.locator('footer').innerText(), /ABN 00 000 000 000/);
}, { width: 1280 });

await step('compliance lists the certificate, police checks, WHS and insurance', async (page) => {
  await go(page, '/offices/');
  const text = await page.locator('#compliance').innerText();
  assert.match(text, /certificate of currency/i);
  assert.match(text, /police check/i);
  assert.match(text, /safe work method statements/i);
  assert.match(text, /Public liability insurance of \$20 million/);
});

await step('how a walk-through works is an ordered list of 3', async (page) => {
  await go(page, '/offices/');
  assert.equal(await page.locator('#process ol > li').count(), 3);
});

await step('offices page has no horizontal scroll at 375 and 1280', async (page) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/offices/');
    assert.equal(await page.locator('#walkthrough form').count(), 1, `form renders at ${width}px`);
    assert.equal(await overflow(page), 0, `${width}px`);
  }
});

await step('home "Request a walk-through" reaches the form', async (page) => {
  await go(page, '/');
  await page.getByRole('link', { name: 'Request a walk-through' }).click();
  await page.waitForURL(/\/offices\/#walkthrough$/);
  const section = page.locator('#walkthrough');
  assert.equal(await section.locator('form').count(), 1);
  const box = await section.boundingBox();
  const headerBottom = await page.locator('header').evaluate((el) => el.getBoundingClientRect().bottom);
  assert.ok(box && box.y >= headerBottom - 1 && box.y < 800, `form section starts in view below the header (y=${box?.y}, header=${headerBottom})`);
}, { width: 1280 });

await finish();
