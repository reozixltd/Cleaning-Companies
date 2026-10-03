/** Content pages and their simple forms (Task 15). /offices/ and /book/ have their own files; their shell checks also run here. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, leads, finish } = await harness();

const SERVICES = ['regular', 'deep', 'end-of-lease', 'move-in'];
const AREAS = ['chermside', 'aspley', 'albany-creek', 'everton-park'];
const PAGES = [
  '/',
  '/book/',
  '/offices/',
  '/services/',
  ...SERVICES.map((s) => `/services/${s}/`),
  '/prices/',
  '/areas/',
  ...AREAS.map((a) => `/areas/${a}/`),
  '/about/',
  '/faq/',
  '/careers/',
  '/refer/',
  '/terms/',
  '/privacy/',
  '/accessibility/',
];
/** Simple forms hold the first send made within 3 s of load ("Not sent yet"), so wait like a person would. */
const humanPause = (page) => page.waitForTimeout(3100);
const jsonLdTypes = (page) =>
  page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => JSON.parse(e.textContent)));

// ── Every page ───────────────────────────────────────────────
for (const width of [375, 1280]) {
  await step(`every page has one h1, the ABN and no horizontal scroll at ${width}`, async (page) => {
    for (const path of PAGES) {
      const res = await go(page, path);
      assert.equal(res.status(), 200, `${path} status`);
      assert.equal(await page.locator('h1').count(), 1, `${path} h1 count`);
      assert.match(await page.locator('footer').innerText(), /ABN 00 000 000 000/, `${path} ABN`);
      assert.equal(await overflow(page), 0, `${path} overflows at ${width}px`);
    }
  }, { width });
}

await step('unknown pages get the 404 page with one h1 and a way home', async (page) => {
  const res = await go(page, '/no-such-page/');
  assert.equal(res.status(), 404);
  assert.equal(await page.locator('h1').count(), 1);
  assert.ok(await page.locator('main a[href="/"]').count() >= 1);
  assert.equal(await page.locator('meta[name="robots"][content="noindex"]').count(), 1);
});

// ── Services ─────────────────────────────────────────────────
await step('services page lists all four cleans with a from price', async (page) => {
  await go(page, '/services/');
  for (const s of SERVICES) assert.equal(await page.locator(`main a[href="/services/${s}/"]`).count() >= 1, true, s);
  const text = await page.locator('main').innerText();
  assert.equal((text.match(/from \$\d+/gi) ?? []).length >= 4, true);
});

await step('a service page has the room checklist, from price, duration, FAQs and Book this clean', async (page) => {
  await go(page, '/services/deep/');
  assert.equal(await page.locator('[data-room-list]').count(), 6);
  assert.match(await page.locator('main').innerText(), /from \$\d+/i);
  assert.match(await page.locator('main').innerText(), /4 to 7 hours/);
  assert.equal(await page.locator('main details').count(), 3);
  const book = page.locator('main a', { hasText: 'Book this clean' }).first();
  assert.equal(await book.getAttribute('href'), '/book/?service=deep');
});

await step('end-of-lease page has the REIQ checklist and re-clean promise', async (page) => {
  await go(page, '/services/end-of-lease/');
  const text = await page.locator('main').innerText();
  assert.match(text, /REIQ/);
  assert.match(text, /within 72 hours/);
  assert.ok(await page.locator('[data-print-area] [data-room-list] li').count() > 20);
  assert.ok(await page.locator('[data-print-checklist]').isVisible());
});

await step('printing the end-of-lease page prints just the checklist', async (page) => {
  await go(page, '/services/end-of-lease/');
  await page.evaluate(() => {
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await page.locator('[data-print-checklist]').click();
  assert.equal(await page.evaluate(() => window.__printed), 1);
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.locator('[data-print-area]').isVisible());
  assert.ok(!(await page.locator('header').first().isVisible()), 'header hidden in print');
  assert.ok(!(await page.locator('footer').isVisible()), 'footer hidden in print');
  assert.ok(!(await page.locator('main h1').isVisible()), 'intro hidden in print');
  assert.ok(!(await page.locator('[data-print-checklist]').isVisible()), 'button hidden in print');
}, { width: 1280 });

// ── Prices ───────────────────────────────────────────────────
await step('prices page shows from prices, savings, extras, GST and the sample label', async (page) => {
  await go(page, '/prices/');
  const text = await page.locator('main').innerText();
  assert.equal(await page.locator('[data-from-price]').count(), 4);
  assert.match(text, /\$110/); // regular, 1 bed 1 bath, weekly
  assert.match(text, /15%/);
  assert.match(text, /Inside the oven[\s\S]*\$65/);
  assert.match(text, /GST/);
  assert.match(text, /[Ss]ample prices/);
  assert.match(text, /first visit/i);
  assert.equal(await page.locator('main a[href="/#plan"]').count() >= 1, true);
});

// ── Areas ────────────────────────────────────────────────────
await step('areas page lists every suburb and links the area pages', async (page) => {
  await go(page, '/areas/');
  assert.equal(await page.locator('[data-map-point]').count(), 12);
  assert.equal(await page.locator('[data-suburb-row]').count(), 12);
  for (const a of AREAS) assert.equal(await page.locator(`main a[href="/areas/${a}/"]`).count() >= 1, true, a);
  assert.equal(await page.locator('#waitlist form').count(), 1);
});

await step('waitlist form creates a waitlist lead', async (page) => {
  await go(page, '/areas/?suburb=Kedron#waitlist');
  assert.equal(await page.inputValue('#field-suburb'), 'Kedron');
  await page.fill('#field-firstName', 'Sam');
  await page.fill('#field-email', 'sam@example.com');
  await page.fill('#field-postcode', '4031');
  await humanPause(page);
  await page.locator('#waitlist button[type="submit"]').click();
  await page.locator('#waitlist .form-done').waitFor();
  assert.match(await page.locator('#waitlist .form-done').innerText(), /email you/);
  const stored = await leads(page);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].kind, 'waitlist');
  assert.equal(stored[0].suburb, 'Kedron');
  assert.equal(stored[0].consent.marketingEmail, false);
});

await step('waitlist turns away a suburb we already clean', async (page) => {
  await go(page, '/areas/#waitlist');
  await page.fill('#field-firstName', 'Sam');
  await page.fill('#field-email', 'sam@example.com');
  await page.fill('#field-suburb', 'Chermside');
  await page.fill('#field-postcode', '4032');
  await humanPause(page);
  await page.locator('#waitlist button[type="submit"]').click();
  assert.match(await page.locator('#waitlist [data-error-summary]').innerText(), /We already clean in Chermside/);
  assert.equal((await leads(page)).length, 0);
});

await step('an area page has its intro, local reviews, nearby suburbs and a link to price the home', async (page) => {
  await go(page, '/areas/everton-park/');
  assert.match(await page.locator('h1').innerText(), /Everton Park/);
  const reviews = page.locator('[data-review]');
  assert.equal(await reviews.count(), 2);
  for (let i = 0; i < 2; i++) assert.match(await reviews.nth(i).innerText(), /Everton Park/);
  assert.equal(await page.locator('main a[href="/#plan"]').count() >= 1, true);
  assert.match(await page.locator('[data-nearby]').innerText(), /Stafford/);
  assert.match(await page.locator('[data-not-yet] a').getAttribute('href'), /\/areas\/\?suburb=Mitchelton#waitlist/);
});

// ── About, FAQ, policies ─────────────────────────────────────
await step('about page has the founder, the team and the insurance facts', async (page) => {
  await go(page, '/about/');
  const text = await page.locator('main').innerText();
  assert.match(text, /Mel Hartigan/);
  assert.match(text, /Grace Liufau/);
  assert.match(text, /\$20 million/);
  assert.match(text, /police check/);
  assert.doesNotMatch(text, /bonded/i);
});

await step('faq page groups every question under a heading', async (page) => {
  await go(page, '/faq/');
  assert.equal(await page.locator('main details').count(), 13);
  assert.ok((await page.locator('main h2').count()) >= 4);
  assert.match(await page.locator('main').innerText(), /Keys and alarm codes/);
});

await step('policy pages render their text and the updated date', async (page) => {
  for (const [path, text] of [['/terms/', /48 hours/], ['/privacy/', /Reply STOP/], ['/accessibility/', /WCAG\) 2\.2/]]) {
    await go(page, path);
    assert.match(await page.locator('main').innerText(), text, path);
    assert.equal(await page.locator('main time[datetime="2026-10-03"]').count(), 1, `${path} date`);
  }
  await go(page, '/accessibility/');
  assert.equal(await page.locator('main a[href^="tel:"]').count() >= 1, true);
  assert.equal(await page.locator('main a[href^="mailto:"]').count() >= 1, true);
});

// ── Careers ──────────────────────────────────────────────────
await step('careers form validates then submits', async (page) => {
  await go(page, '/careers/');
  assert.match(await page.locator('main').innerText(), /From \$32 an hour plus travel time/);
  await humanPause(page);
  const send = page.locator('main form button[type="submit"]');
  await send.click();
  const summary = page.locator('main [data-error-summary]');
  assert.ok(await summary.isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-error-summary')), true);
  assert.match(await summary.innerText(), /Enter your first name/);
  assert.equal(await summary.locator('a[href="#field-firstName"]').count(), 1);

  await page.fill('#field-firstName', 'Ana');
  await page.fill('#field-lastName', 'Silva');
  await page.fill('#field-phone', '0412 345 678');
  await page.fill('#field-email', 'ana@example.com');
  await page.fill('#field-suburb', 'Zillmere');
  await page.fill('#field-postcode', '4034');
  await page.selectOption('#field-availability', 'weekdays');
  await page.check('#field-requirements');
  await send.click();
  await page.locator('main .form-done').waitFor();
  const stored = await leads(page);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].kind, 'application');
  assert.equal(stored[0].contact.phone, '0412 345 678');
});

// ── Refer ────────────────────────────────────────────────────
await step('refer page shows one saved 6-character code and copies it', async (page, context) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await go(page, '/refer/');
  assert.match(await page.locator('main').innerText(), /Your friend gets \$20 off their first clean; you get \$20 off your next one after their first visit/);
  const code = await page.locator('[data-referral-code]').innerText();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(await page.evaluate(() => localStorage.getItem('clearday:v1:referral-code')), code);
  await page.reload();
  assert.equal(await page.locator('[data-referral-code]').innerText(), code);
  await page.locator('[data-copy-code]').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), code);
  assert.match(await page.locator('[data-copy-status]').innerText(), /Copied/);
  assert.equal(await page.locator('main input, main textarea, main form').count(), 0, 'no friend details collected');
}, { width: 1280 });

// ── JSON-LD ──────────────────────────────────────────────────
await step('JSON-LD present', async (page) => {
  await go(page, '/');
  const home = await jsonLdTypes(page);
  assert.ok(home.some((b) => b['@type'] === 'HouseCleaning'));
  assert.ok(!JSON.stringify(home).includes('aggregateRating'));
  await go(page, '/faq/');
  assert.ok((await jsonLdTypes(page)).some((b) => b['@type'] === 'FAQPage'));
  await go(page, '/services/end-of-lease/');
  const service = await jsonLdTypes(page);
  assert.ok(service.some((b) => b['@type'] === 'Service' && b.offers.price > 0));
  assert.ok(service.some((b) => b['@type'] === 'FAQPage'));
});

await finish();
