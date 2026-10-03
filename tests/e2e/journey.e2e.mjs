/**
 * The whole demo story across pages: a visitor prices their home, requests a
 * slot on /book/, and the owner finds that request in the console, confirms it
 * and sees the messages that would go out.
 */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, finish } = await harness();

const bookPanel = (page, id) => page.locator(`[data-book-step="${id}"]`);
const next = (page, id) => bookPanel(page, id).locator('[data-next]').click();
const choose = (page, name, value) => page.locator(`#book-form label:has(input[name="${name}"][value="${value}"])`).click();

await step('a request sent from /book/ shows in the console with its price and messages', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.locator('#plan [data-choose-time]').click();
  await page.waitForURL(/\/book\/\?/);

  await next(page, 'home');
  await page.locator('#book-form label:has(input[name="day"])').first().click();
  await choose(page, 'window', 'afternoon');
  await next(page, 'when');
  await choose(page, 'method', 'code');
  await page.fill('#field-detail', '4821');
  await next(page, 'access');
  const contact = { firstName: 'Jordan', lastName: 'Example', phone: '0412 345 678', email: 'jordan@example.com', address: '3 Hamilton Road', suburb: 'Chermside', postcode: '4032' };
  for (const [name, value] of Object.entries(contact)) await page.fill(`#field-${name}`, value);
  await page.locator('label:has(#field-terms)').click();
  await next(page, 'you');
  await bookPanel(page, 'check').locator('button[type="submit"]').click();
  await page.locator('[data-booking-done]').waitFor();

  await go(page, '/console/');
  await page.fill('#signin-email', 'owner@demo.clearday');
  await page.fill('#signin-password', 'demo1234');
  await page.locator('[data-signin] button[type="submit"]').click();
  const row = page.locator('[data-lead-list] [data-lead-id]', { hasText: 'Jordan Example' });
  await row.waitFor();
  assert.equal(await row.count(), 1, 'the visitor request is listed once, next to the samples');
  // The inbox keeps "12–2pm" on one line with an invisible word joiner.
  const rowText = (await row.innerText()).replace(/⁠/g, '');
  assert.match(rowText, /4 bed, 2 bath, fortnightly\. \w{3} \d{1,2} \w{3}, 12–2pm/);

  await row.click();
  const detail = page.locator('[data-detail]');
  assert.match(await detail.innerText(), /\$197/);
  assert.equal(await detail.innerText().then((t) => t.includes('4821')), false, 'door code hidden until shown');
  await detail.locator('[data-action="confirmed"]').click();
  await page.waitForFunction(() => document.querySelector('[data-detail] [data-status-badge]')?.textContent?.includes('Confirmed'));
  const first = await detail.locator('[data-message="confirmation"]').innerText();
  assert.match(first, /Hi Jordan, your clean is confirmed for \w{3} \d{1,2} \w{3}, arriving 12–2pm\. \$197 a visit\./);
}, { width: 1280 });

await finish();
