/** Booking request flow on /book/ (Task 16). */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, leads, finish } = await harness();

const panel = (page, id) => page.locator(`[data-book-step="${id}"]`);
const current = (page) => page.locator('[data-book-step][aria-current="step"]').getAttribute('data-book-step');
const next = (page, id) => panel(page, id).locator('[data-next]').click();
const choose = (page, name, value) => page.locator(`#book-form label:has(input[name="${name}"][value="${value}"])`).click();
const firstDay = (page) => page.locator('#book-form label:has(input[name="day"])').first().click();

const CONTACT = {
  firstName: 'Sam',
  lastName: 'Citizen',
  phone: '0412 345 678',
  email: 'sam@example.com',
  address: '12 Gympie Road',
  suburb: 'Chermside',
  postcode: '4032',
};

async function fillContact(page, values = CONTACT) {
  for (const [name, value] of Object.entries(values)) await page.fill(`#field-${name}`, value);
  await page.locator('label:has(#field-terms)').click();
}

/** Steps 1 to 3 with the default home, the first day, morning, someone home. */
async function toYou(page, path = '/book/') {
  await go(page, path);
  await next(page, 'home');
  await firstDay(page);
  await choose(page, 'window', 'morning');
  await next(page, 'when');
  await choose(page, 'method', 'home');
  await next(page, 'access');
  assert.equal(await current(page), 'you');
}

async function toCheck(page) {
  await toYou(page);
  await fillContact(page);
  await next(page, 'you');
  assert.equal(await current(page), 'check');
}

const sentHeading = (page) => page.locator('[data-booking-done] h2');
const notKeptNote = (page) => page.locator('[data-booking-done] [data-done-unkept]');

/** "Block all cookies", or a sandboxed frame: reading storage itself throws (as in quality.e2e.mjs). */
const blockStorage = (context) =>
  context.addInitScript(() => {
    const denied = () => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: denied, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get: denied, configurable: true });
  });

// ── Page shell ───────────────────────────────────────────────
await step('/book/ has one h1, the ABN and no mobile booking bar', async (page) => {
  await go(page, '/book/');
  assert.equal(await page.locator('h1').count(), 1);
  assert.match(await page.locator('footer').innerText(), /ABN 00 000 000 000/);
  assert.equal(await page.locator('[data-booking-bar]').count(), 0);
});

await step('/book/ has no horizontal scroll at 375 and 1280', async (page) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await toCheck(page);
    assert.equal(await overflow(page), 0, `${width}px on the check step`);
    await go(page, '/book/');
    assert.equal(await overflow(page), 0, `${width}px on the first step`);
  }
});

await step('hand-edited links load clamped, without errors', async (page) => {
  await go(page, '/book/?bed=99&service=pool&freq=daily&step=payment');
  assert.equal(await current(page), 'home');
  assert.equal(await panel(page, 'home').locator('[data-book-summary]').first().innerText(), '6 bed, 2 bath, fortnightly');
  assert.match(page.url(), /step=home&service=regular&bed=6/);
});

await step('a link to a later step starts at the first unfinished one', async (page) => {
  await go(page, '/book/?step=check&bed=2');
  assert.equal(await current(page), 'when');
  assert.match(await panel(page, 'home').locator('[data-recap]').innerText(), /^2 bed, 2 bath, fortnightly/);
});

// ── The flow ────────────────────────────────────────────────
await step('book from the hero selection', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.locator('#plan [data-choose-time]').click();
  await page.waitForURL(/\/book\/\?/);
  assert.equal(await current(page), 'home');
  assert.equal(await panel(page, 'home').locator('[data-book-summary]').first().innerText(), '4 bed, 2 bath, fortnightly');

  await next(page, 'home');
  assert.equal(await current(page), 'when');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-book-step]')?.dataset.bookStep), 'when');
  assert.match(await panel(page, 'when').innerText(), /This is a request: we'll confirm the exact time by SMS\./);
  await firstDay(page);
  await choose(page, 'window', 'morning');
  await next(page, 'when');

  await choose(page, 'method', 'home');
  await next(page, 'access');
  await fillContact(page);
  await next(page, 'you');

  const check = panel(page, 'check');
  assert.match(await check.innerText(), /\$197 a visit/);
  assert.match(await check.innerText(), /4 bedrooms, 2 bathrooms, living, kitchen/);
  assert.match(await check.innerText(), /Someone will be home/);
  await check.locator('button[type="submit"]').click();

  assert.equal(await sentHeading(page).innerText(), 'Booking request sent');
  assert.match(await page.locator('[data-booking-done]').innerText(), /We'll confirm by SMS within 2 business hours\./);
  assert.equal(await notKeptNote(page).isVisible(), false, 'no "couldn\'t keep a copy" note when the browser keeps storage');
  assert.doesNotMatch(await page.locator('[data-booking-done]').innerText(), /couldn't keep a copy/);
  const preview = page.locator('[data-sms-preview]');
  assert.ok(await preview.isVisible());
  assert.match(await preview.innerText(), /Preview, not sent/);
  const sms = await preview.locator('[data-sms-text]').innerText();
  assert.match(sms, /^Hi Sam, your clean is confirmed for \w{3} \d{1,2} \w{3}, arriving 8–10am\. \$197 a visit\./);
  assert.match(sms, /Clearday Home Cleaning$/);

  const stored = await leads(page);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].kind, 'booking');
  assert.equal(stored[0].payload.selection.bedrooms, 4);
  assert.equal(stored[0].payload.windowId, 'morning');
  assert.equal(stored[0].consent.terms, true);
});

await step('back button returns to the previous step with values kept', async (page) => {
  await go(page, '/book/');
  await next(page, 'home');
  await page.locator('#book-form label:has(input[name="day"])').nth(1).click();
  await choose(page, 'window', 'afternoon');
  await next(page, 'when');
  await choose(page, 'method', 'key');
  await page.fill('#field-detail', 'Lockbox by the side gate');
  await next(page, 'access');
  assert.equal(await current(page), 'you');

  await page.goBack();
  assert.equal(await current(page), 'access');
  assert.ok(await page.locator('input[name="method"][value="key"]').isChecked());
  assert.equal(await page.inputValue('#field-detail'), 'Lockbox by the side gate');

  await page.goBack();
  assert.equal(await current(page), 'when');
  assert.ok(await page.locator('input[name="window"][value="afternoon"]').isChecked());
  assert.ok(await page.locator('input[name="day"]').nth(1).isChecked());

  await page.goForward();
  assert.equal(await current(page), 'access');
});

await step('a refresh keeps the visitor on their step', async (page) => {
  await go(page, '/book/');
  await next(page, 'home');
  await firstDay(page);
  await choose(page, 'window', 'afternoon');
  await next(page, 'when');
  await page.reload();
  assert.equal(await current(page), 'access');
  assert.ok(await page.locator('input[name="window"][value="afternoon"]').isChecked());
  assert.ok(await page.locator('input[name="day"]').first().isChecked());
});

await step('each Continue checks its own step', async (page) => {
  await go(page, '/book/');
  await next(page, 'home');
  await next(page, 'when');
  assert.equal(await current(page), 'when');
  const summary = panel(page, 'when').locator('[data-error-summary]');
  assert.ok(await summary.isVisible());
  assert.deepEqual(await summary.locator('a').allInnerTexts(), ['Choose a day', 'Choose an arrival time']);

  await firstDay(page);
  await choose(page, 'window', 'morning');
  await next(page, 'when');
  await choose(page, 'method', 'code');
  await next(page, 'access');
  assert.equal(await current(page), 'access');
  assert.match(await panel(page, 'access').locator('[data-error-summary]').innerText(), /Enter the door code/);
  assert.match(await panel(page, 'access').innerText(), /Codes are kept with your booking and deleted when your service ends\./);
});

await step('step 4 errors are summarised and focused', async (page) => {
  await toYou(page);
  await next(page, 'you');
  assert.equal(await current(page), 'you');
  const summary = page.locator('[data-book-step="you"] [role="alert"][data-error-summary]');
  assert.ok(await summary.isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-error-summary')), true);
  const hrefs = await summary.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  assert.deepEqual(hrefs, ['firstName', 'lastName', 'phone', 'email', 'address', 'suburb', 'postcode', 'terms'].map((n) => `#field-${n}`));

  await page.fill('#field-firstName', 'Sam');
  await page.fill('#field-lastName', 'Citizen');
  await next(page, 'you');
  assert.equal(await summary.locator('a').count(), 6);
  for (const href of await summary.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    assert.equal(await page.locator(href).count(), 1, `${href} points at a field`);
  }

  await summary.locator('a[href="#field-email"]').click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'field-email');
  assert.equal(await current(page), 'you');

  // Messages that clear as fields are fixed must never move the box being tapped.
  await fillContact(page);
  assert.ok(await page.locator('#field-terms').isChecked(), 'terms ticked after fixing the errors');
  await next(page, 'you');
  assert.equal(await current(page), 'check');
});

await step('suburbs outside the area are refused on step 4', async (page) => {
  await toYou(page);
  await fillContact(page, { ...CONTACT, suburb: 'Kedron', postcode: '4031' });
  await next(page, 'you');
  assert.match(await panel(page, 'you').locator('[data-error-summary]').innerText(), /We don't clean in Kedron yet\./);
});

await step('a postcode that is not the suburb\'s is refused on step 4', async (page) => {
  await toYou(page);
  await fillContact(page, { ...CONTACT, postcode: '9999' });
  await next(page, 'you');
  assert.equal(await current(page), 'you');
  assert.deepEqual(await panel(page, 'you').locator('[data-error-summary] a').allInnerTexts(), ['Check the postcode for Chermside']);
  await page.fill('#field-postcode', '4032');
  await next(page, 'you');
  assert.equal(await current(page), 'check');
});

await step('marketing boxes start unticked', async (page) => {
  await toYou(page);
  for (const name of ['terms', 'marketingSms', 'marketingEmail']) {
    const box = page.locator(`#book-form input[name="${name}"]`);
    assert.ok(await box.isVisible(), `${name} visible`);
    assert.equal(await box.isChecked(), false, `${name} unticked`);
  }
  assert.equal(await page.locator('#book-form a[href="/terms/"]').count(), 1);
});

await step('storage failure shows the phone fallback', async (page, context) => {
  await context.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'clearday:v1:leads') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await toCheck(page);
  await panel(page, 'check').locator('button[type="submit"]').click();
  const alert = panel(page, 'check').locator('[data-form-failure]');
  assert.equal(await alert.innerText(), "We couldn't save your request. Call us on 07 5550 1234 and we'll book it now.");
  assert.ok(await page.locator('[data-call-fallback][href="tel:+61755501234"]').isVisible());
  assert.equal(await sentHeading(page).isVisible(), false);
  assert.equal(await page.inputValue('#field-firstName'), 'Sam');
  assert.equal(await page.inputValue('#field-email'), 'sam@example.com');
  assert.equal(await panel(page, 'check').locator('button[type="submit"]').isDisabled(), false);
});

await step('when the browser blocks storage, the success screen says no copy was kept', async (page, context) => {
  await blockStorage(context);
  await toCheck(page);
  await panel(page, 'check').locator('button[type="submit"]').click();
  await sentHeading(page).waitFor();
  assert.equal(await sentHeading(page).innerText(), 'Booking request sent');
  assert.ok(await notKeptNote(page).isVisible(), 'note shown');
  assert.equal(await notKeptNote(page).innerText(), "This browser couldn't keep a copy of your request. Call us on 07 5550 1234 to be sure we have it.");
  assert.equal(await notKeptNote(page).locator('a').getAttribute('href'), 'tel:+61755501234');
});

await step('double click sends one booking', async (page) => {
  await toCheck(page);
  await panel(page, 'check').locator('button[type="submit"]').dblclick();
  await sentHeading(page).waitFor();
  const stored = await leads(page);
  assert.equal(stored.filter((l) => l.kind === 'booking').length, 1);
});

await step('back after success, then send again, still stores one booking', async (page) => {
  await toCheck(page);
  await panel(page, 'check').locator('button[type="submit"]').click();
  await sentHeading(page).waitFor();
  await page.goBack();
  assert.equal(await current(page), 'check');
  assert.equal(await sentHeading(page).isVisible(), false);
  await panel(page, 'check').locator('button[type="submit"]').click();
  await sentHeading(page).waitFor();
  assert.equal((await leads(page)).filter((l) => l.kind === 'booking').length, 1);
});

await step('end of lease hides how often and books one visit', async (page) => {
  await go(page, '/book/?service=end-of-lease&bed=3&bath=2');
  assert.equal(await panel(page, 'home').locator('[data-frequency-group]').isVisible(), false);
  assert.equal(await panel(page, 'home').locator('[data-book-summary]').first().innerText(), '3 bed, 2 bath, end of lease');
  await choose(page, 'service', 'regular');
  assert.ok(await panel(page, 'home').locator('[data-frequency-group]').isVisible());
  assert.match(page.url(), /service=regular/);
});

await finish();
