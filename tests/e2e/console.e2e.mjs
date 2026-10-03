/** Owner console (Task 18): demo sign-in, inbox, confirm, message timeline, filters, CSV, clearing, escaping. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const signIn = async (page, password = 'demo1234') => {
  await go(page, '/console/');
  await page.fill('#signin-email', 'owner@demo.clearday');
  await page.fill('#signin-password', password);
  await page.locator('[data-signin] button[type="submit"]').click();
};
const rows = (page) => page.locator('[data-lead-list] [data-lead-id]');

await step('console shows the demo credentials', async (page) => {
  await go(page, '/console/');
  const text = await page.locator('[data-view="signin"]').innerText();
  assert.match(text, /owner@demo\.clearday/);
  assert.match(text, /demo1234/);
  assert.equal(await page.locator('[data-view="app"]').isVisible(), false);
  assert.equal(await page.locator('meta[name="robots"][content="noindex"]').count(), 1);
});

await step('wrong password shows an error', async (page) => {
  await signIn(page, 'nope');
  assert.equal((await page.locator('[data-signin-error]').innerText()).trim(), 'Use the demo email and password shown above.');
  assert.equal(await page.locator('[data-view="app"]').isVisible(), false);
});

await step('sign in lists the sample leads and remembers the session', async (page) => {
  await signIn(page);
  await page.locator('[data-lead-list] [data-lead-id]').first().waitFor();
  assert.ok((await rows(page).count()) >= 7);
  await page.reload();
  assert.ok(await page.locator('[data-view="app"]').isVisible());
  assert.ok((await rows(page).count()) >= 7);
}, { width: 1280 });

await step('console sign-in, confirm and timeline', async (page) => {
  await signIn(page);
  const booking = page.locator('[data-lead-list] [data-lead-id="S-BK-PRIYA"]');
  await booking.click();
  const detail = page.locator('[data-detail]');
  assert.match(await detail.locator('[data-status-badge]').innerText(), /New/);
  assert.match(await detail.innerText(), /3 bed, 2 bath, fortnightly/);
  assert.equal(await detail.locator('[data-message]').count(), 4);
  assert.match(await detail.locator('[data-message="confirmation"]').innerText(), /Waits for confirmation/);
  await detail.locator('[data-action="confirmed"]').click();
  await page.waitForFunction(() => document.querySelector('[data-detail] [data-status-badge]')?.textContent?.includes('Confirmed'));
  const sms = detail.locator('[data-message][data-channel="sms"]');
  assert.equal(await sms.count(), 4);
  for (let i = 0; i < 4; i++) {
    assert.match(await sms.nth(i).innerText(), /Preview, not sent/);
    assert.equal(await sms.nth(i).locator('time[datetime]').count(), 1);
  }
  assert.match(await sms.first().innerText(), /your clean is confirmed for .+ Clearday Home Cleaning/);
  assert.equal(await detail.locator('[data-action="confirmed"]').count(), 0);
  assert.equal(await detail.locator('[data-action="done"]').count(), 1);
  assert.match(await page.locator('[data-lead-id="S-BK-PRIYA"]').innerText(), /Confirmed/);
}, { width: 1280 });

await step('door codes stay hidden until shown', async (page) => {
  await signIn(page);
  await page.locator('[data-lead-id="S-BK-PRIYA"]').click();
  const code = page.locator('[data-detail] [data-door-code]');
  assert.doesNotMatch(await code.innerText(), /4821/);
  assert.match(await code.innerText(), /••••/);
  await code.getByRole('button', { name: 'Show code' }).click();
  assert.match(await code.innerText(), /4821/);
});

await step('one-off booking with email consent shows the rebook offer', async (page) => {
  await signIn(page);
  await page.locator('[data-lead-id="S-BK-MIA"]').click();
  const offer = page.locator('[data-detail] [data-message="rebook-offer"]');
  assert.equal(await offer.getAttribute('data-channel'), 'email');
  assert.equal(await offer.locator('[data-skip-reason]').count(), 0);
  assert.match(await page.locator('[data-detail]').innerText(), /Marketing email: yes, \w{3} \d{1,2} \w{3}, \d{1,2}:\d{2}(am|pm)/);
}, { width: 1280 });

await step('phone shows the list, then one request with a way back', async (page) => {
  await signIn(page);
  await page.locator('[data-lead-id="S-WT-NORTHSIDE"]').click();
  assert.equal(await page.locator('[data-lead-list]').isVisible(), false);
  assert.match(await page.locator('[data-detail]').innerText(), /Northside Physio/);
  assert.equal(await page.locator('[data-detail] [data-message]').count(), 2);
  await page.getByRole('button', { name: 'Back to the list' }).click();
  assert.ok(await page.locator('[data-lead-list]').isVisible());
  assert.ok(await page.evaluate(() => document.activeElement?.getAttribute('data-lead-id') === 'S-WT-NORTHSIDE'));
});

await step('console filters by kind', async (page) => {
  await signIn(page);
  await rows(page).first().waitFor();
  await page.getByRole('tab', { name: /Walk-throughs/ }).click();
  const kinds = await page.locator('[data-lead-list] [data-kind-label]').allInnerTexts();
  assert.ok(kinds.length >= 1);
  assert.ok(kinds.every((k) => k === 'Walk-through'), kinds.join(', '));
  await page.getByRole('tab', { name: /Walk-throughs/ }).press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: /Job applications/ }).getAttribute('aria-selected'), 'true');
  assert.deepEqual(await page.locator('[data-lead-list] [data-kind-label]').allInnerTexts(), ['Job application']);
}, { width: 1280 });

await step('console filters by status', async (page) => {
  await signIn(page);
  await rows(page).first().waitFor();
  await page.selectOption('[data-status-filter]', 'declined');
  assert.equal(await rows(page).count(), 1);
  assert.match(await rows(page).first().innerText(), /Declined/);
}, { width: 1280 });

await step('CSV export downloads', async (page) => {
  await signIn(page);
  await rows(page).first().waitFor();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export]').click()]);
  assert.match(download.suggestedFilename(), /^clearday-leads-\d{4}-\d{2}-\d{2}\.csv$/);
}, { width: 1280, acceptDownloads: true });

await step('clear leads shows the empty state, and samples load again', async (page) => {
  await signIn(page);
  await rows(page).first().waitFor();
  await page.locator('[data-clear]').click();
  await page.locator('[data-empty]').waitFor();
  assert.match(await page.locator('[data-empty]').innerText(), /Booking requests will appear here\. Send one from the booking page to see how it looks\./);
  assert.equal(await rows(page).count(), 0);
  await page.reload();
  assert.equal(await rows(page).count(), 0, 'clearing sticks after a reload');
  await page.locator('[data-load-samples]').click();
  await rows(page).nth(6).waitFor();
  assert.equal(await rows(page).count(), 7);
}, { width: 1280 });

await step("loading samples on a full device keeps the owner's own requests", async (page) => {
  await go(page, '/console/');
  await page.evaluate(() => {
    const at = new Date().toISOString();
    const own = {
      id: 'L-OWN', kind: 'waitlist', status: 'new', createdAt: at,
      contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570110', email: 'sam@example.com' },
      suburb: 'Kedron', postcode: '4031', consent: { terms: false, marketingSms: false, marketingEmail: false, at },
      payload: { suburb: 'Kedron' }, clientRef: 'own', history: [],
    };
    localStorage.setItem('clearday:v1:seeded', '1');
    localStorage.setItem('clearday:v1:leads', JSON.stringify([own]));
  });
  await signIn(page);
  await page.locator('[data-lead-id="L-OWN"]').waitFor();
  // Storage fills up: the leads list can no longer be written (until the reload below).
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'clearday:v1:leads') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await page.locator('[data-load-samples]').click();
  await page.waitForFunction(() => /Could not load sample leads/.test(document.querySelector('[data-announce]')?.textContent ?? ''));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-summary]')?.textContent);
  assert.deepEqual(await rows(page).evaluateAll((els) => els.map((e) => e.dataset.leadId)), ['L-OWN']);
}, { width: 1280 });

await step('console has no horizontal scroll at 375 and 1280 after sign-in', async (page) => {
  await signIn(page);
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/console/');
    await rows(page).first().waitFor();
    assert.equal(await overflow(page), 0, `${width}px list`);
    await page.locator('[data-lead-id="S-BK-MIA"]').click();
    assert.equal(await overflow(page), 0, `${width}px detail`);
  }
});

await step('lead data renders as text, never as HTML', async (page) => {
  const evil = '<img src=x onerror=alert(1)>';
  await go(page, '/console/');
  await page.evaluate((name) => {
    const at = new Date().toISOString();
    const lead = {
      id: 'L-EVIL', kind: 'booking', status: 'new', createdAt: at,
      contact: { firstName: name, lastName: '<b>bold</b>', phone: '0491570110', email: 'x@example.com' },
      suburb: '<script>alert(2)</script>', postcode: '4032',
      consent: { terms: true, marketingSms: false, marketingEmail: false, at },
      payload: { day: '2099-01-05', windowId: 'morning', selection: {}, access: { method: 'code', detail: '<i>1</i>', parking: name, notes: name }, address: name },
      clientRef: 'evil', history: [{ at, type: 'note', value: name }],
    };
    localStorage.setItem('clearday:v1:seeded', '1');
    localStorage.setItem('clearday:v1:leads', JSON.stringify([lead]));
  }, evil);
  await signIn(page);
  const row = page.locator('[data-lead-id="L-EVIL"]');
  assert.match(await row.innerText(), /<img src=x onerror=alert\(1\)>/);
  await row.click();
  assert.match(await page.locator('[data-detail-name]').innerText(), /<img src=x onerror=alert\(1\)> <b>bold<\/b>/);
  assert.equal(await page.locator('[data-console] img, [data-console] b, [data-console] i, [data-console] script').count(), 0);
}, { width: 1280 });

await finish();
