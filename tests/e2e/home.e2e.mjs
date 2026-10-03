/** Shell, hero calculator and home sections (Tasks 12 to 14). */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { base: BASE, step, go, overflow, finish } = await harness();

// ── Shell (Task 12) ──────────────────────────────────────────
await step('home has one h1, a tap-to-call link and the ABN in the footer', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('h1').count(), 1);
  assert.ok(await page.locator('header a[href="tel:+61755501234"]').first().isVisible());
  const footer = await page.locator('footer').innerText();
  assert.match(footer, /ABN 00 000 000 000/);
  assert.match(footer, /Clearday Cleaning Services Pty Ltd/);
}, { width: 1280 });

await step('demo ribbon shows in demo mode', async (page) => {
  await go(page, '/');
  assert.ok(await page.locator('[data-demo-ribbon]').isVisible());
});

await step('theme switches with ?theme=eucalyptus and persists for the session', async (page, context) => {
  await go(page, '/?theme=eucalyptus');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'eucalyptus');
  await go(page, '/');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'eucalyptus');
  const fresh = await context.browser().newPage();
  await fresh.goto(BASE + '/');
  assert.equal(await fresh.locator('html').getAttribute('data-theme'), 'floorplan');
  await fresh.close();
});

await step('menu button opens the navigation on mobile', async (page) => {
  await go(page, '/');
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.ok(await page.locator('#mobile-menu a[href="/services/"]').isVisible());
});

// ── Hero calculator (Task 13) ────────────────────────────────
const price = (page) => page.locator('#plan [data-price-per-visit]').innerText();

await step('hero plan prices the default home', async (page) => {
  await go(page, '/');
  assert.equal(await price(page), '$179');
  assert.match(await page.locator('#plan [data-price-first-visit]').innerText(), /\$318/);
  assert.equal(await page.locator('#plan [data-price-summary]').innerText(), '3 bed, 2 bath, fortnightly');
}, { width: 1280 });

await step('adding a bedroom updates the plan and price', async (page) => {
  await go(page, '/');
  const before = await price(page);
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
  assert.notEqual(await price(page), before);
  assert.equal(await price(page), '$197');
}, { width: 1280 });

await step('clicking an available room adds it', async (page) => {
  await go(page, '/');
  await page.locator('#plan [data-room-id="add-study"]').click();
  assert.equal(await page.locator('#plan [data-room-id="study"]').count(), 1);
  assert.equal(await page.locator('[data-toggle="study"]').getAttribute('aria-pressed'), 'true');
}, { width: 1280 });

await step('keyboard can add a room', async (page) => {
  await go(page, '/');
  await page.locator('#plan [data-room-id="add-bathroom"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#plan [data-room-id="bath-3"]').count(), 1);
  const focused = await page.evaluate(() => document.activeElement?.closest('[data-plan]') !== null);
  assert.ok(focused, 'focus stays in the plan');
}, { width: 1280 });

await step('end of lease hides the frequency and prices once', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] label:has(input[value="end-of-lease"])').click();
  assert.equal(await page.locator('#plan [data-price-summary]').innerText(), '3 bed, 2 bath, end of lease');
  assert.equal(await price(page), '$438');
  assert.ok(!(await page.locator('[data-frequency-group]').isVisible()));
  assert.ok(!(await page.locator('#plan [data-price-first-visit-row]').isVisible()));
}, { width: 1280 });

await step('Choose a time carries the selection', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  const href = await page.locator('#plan [data-choose-time]').getAttribute('href');
  assert.match(href, /bed=4/);
  assert.match(href, /freq=fortnightly/);
}, { width: 1280 });

await step('selection survives a reload', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.reload();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
}, { width: 1280 });

await step('suburb check answers in and out', async (page) => {
  await go(page, '/');
  await page.fill('#suburb-input', '4032');
  await page.locator('[data-suburb-check] button[type="submit"]').click();
  assert.match(await page.locator('[data-suburb-result]').innerText(), /We clean in Chermside\./);
  await page.fill('#suburb-input', 'Kedron');
  await page.locator('[data-suburb-check] button[type="submit"]').click();
  assert.match(await page.locator('[data-suburb-result]').innerText(), /We don.t clean in Kedron yet\./);
  assert.match(await page.locator('[data-suburb-result] a').getAttribute('href'), /#waitlist/);
});

await step('mobile booking bar appears after a change', async (page) => {
  await go(page, '/');
  assert.ok(!(await page.locator('[data-booking-bar]').isVisible()));
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.ok(await page.locator('[data-booking-bar]').isVisible());
  assert.equal(await page.locator('[data-booking-bar] a[href^="tel:"]').count(), 1);
  assert.match(await page.locator('[data-booking-bar] [data-price-per-visit]').innerText(), /\$197/);
});

await step('home has no horizontal scroll at 320, 375 and 1280', async (page) => {
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/');
    assert.equal(await overflow(page), 0, `${width}px`);
  }
});

// ── Home sections (Task 14) ──────────────────────────────────
await step('room checklist follows the clicked room', async (page) => {
  await go(page, '/');
  await page.locator('#whats-included [data-room-id="kitchen"]').click();
  const panel = page.locator('#whats-included [data-room-panel]:visible');
  assert.equal(await panel.count(), 1);
  assert.equal(await panel.locator('h3').innerText(), 'Kitchen');
  assert.equal(await page.locator('#whats-included [data-room-id="kitchen"]').getAttribute('aria-pressed'), 'true');
}, { width: 1280 });

await step('checklist follows the chosen service', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] label:has(input[value="end-of-lease"])').click();
  await page.locator('#whats-included [data-room-id="kitchen"]').click();
  const panel = page.locator('#whats-included [data-room-panel]:visible');
  assert.equal(await panel.getAttribute('data-service'), 'end-of-lease');
  assert.match(await panel.innerText(), /Inside oven/);
}, { width: 1280 });

await step('services list links to every service page with a from price', async (page) => {
  await go(page, '/');
  const links = page.locator('#services a[href^="/services/"]');
  assert.equal(await links.count(), 4);
  const text = await page.locator('#services').innerText();
  assert.equal((text.match(/from \$\d+/g) ?? []).length, 4);
});

await step('reviews show name, suburb and date', async (page) => {
  await go(page, '/');
  const reviews = page.locator('[data-review]');
  assert.ok((await reviews.count()) >= 3);
  for (let i = 0; i < 3; i++) assert.equal(await reviews.nth(i).locator('time[datetime]').count(), 1);
});

await step('how a booking works is an ordered list of 4', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#how ol > li').count(), 4);
});

await step('coverage map marks every suburb and links the area pages', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#areas [data-map-point]').count(), 12);
  assert.equal(await page.locator('#areas a[href^="/areas/"]').count() >= 4, true);
});

await step('desktop booking tag pins after scrolling past the hero', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.ok(!(await page.locator('[data-booking-tag]').isVisible()));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#plan').getBoundingClientRect().bottom + window.scrollY + 200));
  await page.waitForTimeout(300);
  assert.ok(await page.locator('[data-booking-tag]').isVisible());
}, { width: 1280 });

await finish();
