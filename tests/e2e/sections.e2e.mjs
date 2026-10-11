/** The home page's sections below the estimator (spec §5.3 to §5.10) and the Reveal system (spec §8). */
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const THEMES = ['floorplan', 'eucalyptus'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/** Scroll the whole page in steps so every block has been on screen, then wait for the last fade to finish. */
async function revealAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
}

async function seriousIssues(page) {
  // Scan from the top: content scrolled under the sticky header reads as "obscured" to axe.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
}

const opacities = (page) => page.$$eval('[data-reveal]', (els) => els.map((el) => getComputedStyle(el).opacity));

// ── Reveal (spec §8) ─────────────────────────────────────────
await step('without JavaScript every block is visible', async (page) => {
  for (const path of ['/', '/about/']) {
    await go(page, path);
    const found = await opacities(page);
    assert.ok(found.length > 0, `${path} has blocks marked data-reveal`);
    assert.ok(found.every((o) => o === '1'), `${path}: ${found.join(' ')}`);
  }
}, { width: 1280, javaScriptEnabled: false });

await step('a block below the fold waits, shows once it is scrolled to, and stays shown', async (page) => {
  await go(page, '/');
  const head = page.locator('#how [data-reveal]').first();
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '0');
  await head.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#how [data-reveal]')).opacity === '1');
  assert.ok(await head.evaluate((el) => el.classList.contains('is-in')));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '1');
}, { width: 1280 });

await step('what is already on screen at load never fades', async (page) => {
  await go(page, '/');
  const onScreen = await page.$$eval('[data-reveal]', (els) =>
    els.filter((el) => el.getBoundingClientRect().top < window.innerHeight).map((el) => `${el.classList.contains('is-in')} ${getComputedStyle(el).opacity}`));
  assert.ok(onScreen.length > 0, 'a 3000px-tall screen shows some blocks at load');
  assert.ok(onScreen.every((s) => s === 'true 1'), onScreen.join(', '));
}, { width: 1280, height: 3000 });

await step('reduced motion leaves every block in place', async (page) => {
  await go(page, '/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
  const found = await opacities(page);
  assert.ok(found.length > 0 && found.every((o) => o === '1'), found.join(' '));
}, { width: 1280, reducedMotion: 'reduce' });

await step('the owner console gets no motion', async (page) => {
  await go(page, '/console/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
}, { width: 1280 });

await step('printing shows every block, scrolled to or not', async (page) => {
  await go(page, '/services/end-of-lease/');
  await page.emulateMedia({ media: 'print' });
  const found = await opacities(page);
  assert.ok(found.length > 0 && found.every((o) => o === '1'), found.join(' '));
}, { width: 1280 });

await step('the booking page has nothing that fades in', async (page) => {
  await go(page, '/book/');
  assert.equal(await page.locator('[data-reveal]').count(), 0);
}, { width: 1280 });

await step('scroll progress is exactly 0 below the screen and exactly 1 above it', async (page) => {
  await go(page, '/');
  const p = () => page.locator('.scene-hero').evaluate((el) => el.style.getPropertyValue('--p'));
  assert.equal(await p(), '0.0000');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.scene-hero').style.getPropertyValue('--p') === '1.0000');
}, { width: 1280 });

// ── Trust, process, FAQ (spec §5.3, §5.8, §5.10) ─────────────
await step('the four trust proofs rise one after another', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('.trust__item[data-reveal]').count(), 4);
  await page.locator('.trust__item').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.trust__item .icon')].every((el) => getComputedStyle(el).opacity === '1'));
  // The stagger delay sits on the shown rule, so it is read once every item is in.
  const delays = await page.$$eval('.trust__item[data-reveal]', (els) => els.map((el) => parseFloat(getComputedStyle(el).transitionDelay)));
  assert.equal(delays.length, 4);
  assert.deepEqual([...delays].sort((a, b) => a - b), delays);
  assert.ok(delays[3] > delays[0], delays.join(' '));
}, { width: 1280 });

const fillOf = () => new DOMMatrix(getComputedStyle(document.querySelector('#how .steps'), '::after').transform).a;
const lastNumber = (page) => page.locator('#how .steps li').last().evaluate((li) => Number(getComputedStyle(li, '::before').opacity));

await step('the process line fills, and its numbers darken, as the steps cross the screen', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#how ol.steps > li').count(), 4);
  const toSteps = (fromTop) =>
    page.locator('#how .steps').evaluate((ol, y) => window.scrollTo({ top: ol.getBoundingClientRect().top + window.scrollY - y, behavior: 'instant' }), fromTop);
  await toSteps(780); // the list has only just come on screen
  await page.waitForFunction(`(${fillOf})() < 0.1`);
  assert.ok((await lastNumber(page)) < 0.7, 'the last number starts quiet');
  await toSteps(120); // the list is near the top
  await page.waitForFunction(`(${fillOf})() === 1`);
  assert.equal(await lastNumber(page), 1);
}, { width: 1280 });

await step('under reduced motion the process line is complete from the start', async (page) => {
  await go(page, '/');
  assert.equal(await page.evaluate(fillOf), 1);
  assert.equal(await lastNumber(page), 1);
}, { width: 1280, reducedMotion: 'reduce' });

await step('the FAQ keeps its native accordion', async (page) => {
  await go(page, '/');
  const first = page.locator('#faq details').first();
  await first.locator('summary').click();
  assert.equal(await first.evaluate((d) => d.open), true);
  assert.ok(await first.locator('p').isVisible());
});

// ── Services and reviews (spec §5.4, §5.6) ───────────────────
/** Reveal moves a card with `translate`; wait until every service block that has come on screen has landed before reading boxes or aiming the mouse. */
const servicesSettled = (page) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('#services [data-reveal]')].filter((el) => el.getBoundingClientRect().top < window.innerHeight).every((el) => {
      const s = getComputedStyle(el);
      return (!document.documentElement.classList.contains('motion') || el.classList.contains('is-in')) && s.opacity === '1' && s.translate === 'none';
    }));

await step('the four services are cards, two across on a desktop, each with its link and from price', async (page) => {
  await go(page, '/');
  const cards = page.locator('#services [data-tilt]');
  assert.equal(await cards.count(), 4);
  for (let i = 0; i < 4; i++) {
    assert.equal(await cards.nth(i).locator('a[href^="/services/"]').count(), 1);
    assert.match(await cards.nth(i).innerText(), /from \$\d+/);
  }
  await cards.first().scrollIntoViewIfNeeded();
  await cards.nth(2).scrollIntoViewIfNeeded();
  await servicesSettled(page);
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => cards.nth(i).boundingBox()));
  assert.ok(Math.abs(a.y - b.y) < 2 && b.x > a.x + a.width - 2, 'the first two sit side by side');
  assert.ok(c.y > a.y + a.height - 2, 'the third starts a new row');
}, { width: 1280 });

await step('a service card leans toward a fine pointer by at most 4 degrees', async (page) => {
  await go(page, '/');
  const card = page.locator('#services [data-tilt]').first();
  await card.scrollIntoViewIfNeeded();
  await servicesSettled(page);
  const box = await card.boundingBox();
  await page.mouse.move(box.x + 24, box.y + 24);
  await page.waitForFunction(() => document.querySelector('#services [data-tilt]').style.getPropertyValue('--tilt-x') !== '');
  const [x, y] = await card.evaluate((el) => ['--tilt-x', '--tilt-y'].map((v) => parseFloat(el.style.getPropertyValue(v))));
  assert.ok(Math.abs(x) > 2 && Math.abs(x) <= 4 && Math.abs(y) > 2 && Math.abs(y) <= 4, `${x} ${y}`);
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector('#services [data-tilt]').style.getPropertyValue('--tilt-x') === '');
}, { width: 1280 });

await step('a service card keeps its lean with the pointer near its edge', async (page) => {
  await go(page, '/');
  const card = page.locator('#services [data-tilt]').first();
  await card.scrollIntoViewIfNeeded();
  await servicesSettled(page);
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await page.waitForTimeout(400);
  assert.notEqual(await card.evaluate((el) => el.style.getPropertyValue('--tilt-y')), '');
  assert.ok(await card.locator('.service').evaluate((el) => el.matches(':hover') || el.parentElement.matches(':hover')));
}, { width: 1280 });

for (const [name, options] of [['a touch screen', { hasTouch: true, isMobile: true }], ['reduced motion', { width: 1280, reducedMotion: 'reduce' }]]) {
  await step(`a service card stays flat for ${name}`, async (page) => {
    await go(page, '/');
    const card = page.locator('#services [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    await servicesSettled(page);
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 24, box.y + 24);
    await page.waitForTimeout(200);
    assert.equal(await card.evaluate((el) => el.style.getPropertyValue('--tilt-x')), '');
  }, options);
}

const reviewShift = (page) => page.$$eval('#reviews [data-review] figure', (els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).f));

await step('review cards drift at different rates, with no faces', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#reviews img').count(), 0);
  await page.locator('#reviews').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.7, behavior: 'instant' }));
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#reviews')).getPropertyValue('--p')) > 0);
  const shifts = await reviewShift(page);
  assert.equal(shifts.length, 3);
  assert.equal(new Set(shifts.map((s) => s.toFixed(1))).size, 3, shifts.join(' '));
}, { width: 1280 });

await step('review cards hold still under reduced motion', async (page) => {
  await go(page, '/');
  await page.locator('#reviews').scrollIntoViewIfNeeded();
  assert.deepEqual(await reviewShift(page), [0, 0, 0]);
}, { width: 1280, reducedMotion: 'reduce' });

// ── Room stage (spec §5.5) ───────────────────────────────────
const STAGE = '#whats-included [data-stage]';
const untilPhase = (page, want) => page.waitForFunction((w) => document.querySelector('#whats-included [data-stage]').dataset.phase === w, want);
const shownRooms = (page) => page.$$eval('[data-stage-room]:not([hidden])', (els) => els.map((el) => el.dataset.stageRoom));
const pinned = (page) => page.locator('[data-stage-pin]').evaluate((el) => getComputedStyle(el).position === 'sticky');

/** Pinned layout: scroll to fraction f (0 to 1) of the stage's travel. */
const pinTo = (page, f) =>
  page.evaluate((f) => {
    const pin = document.querySelector('[data-stage-pin]');
    const track = pin.parentElement;
    const start = track.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(pin).top);
    window.scrollTo({ top: start + (track.offsetHeight - pin.offsetHeight) * f, behavior: 'instant' });
  }, f);

/** Unpinned layout: put the stage's centre where its progress is f. */
const passTo = (page, f) =>
  page.evaluate((f) => {
    const r = document.querySelector('#whats-included [data-stage]').getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight * (0.85 - 0.55 * f), behavior: 'instant' });
  }, f);

function clipRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('/media/action-kitchen')) urls.push(request.url());
  });
  return urls;
}

await step('on a tall desktop screen the stage holds still and plays before, action, sweep, after', async (page) => {
  await go(page, '/');
  assert.equal(await pinned(page), true);
  const pin = page.locator('[data-stage-pin]');
  await pinTo(page, 0.1);
  await untilPhase(page, 'before');
  assert.deepEqual(await shownRooms(page), ['kitchen']);
  assert.ok(!(await page.locator('[data-stage-book] a').isVisible()), 'no booking button yet');
  const box = await pin.boundingBox();
  assert.ok(box.y + box.height <= 900, `the pinned block fits the screen (bottom at ${box.y + box.height})`);
  await pinTo(page, 0.45);
  await untilPhase(page, 'action');
  assert.equal(Math.round((await pin.boundingBox()).y), Math.round(box.y), 'still pinned in the action beat');
  await pinTo(page, 0.75);
  await untilPhase(page, 'sweep');
  const sweep = await page.locator(STAGE).evaluate((el) => Number(el.style.getPropertyValue('--sweep')));
  assert.ok(sweep > 0.3 && sweep < 0.7, `--sweep is ${sweep}`);
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  const book = page.locator('[data-stage-book] a');
  await book.waitFor();
  assert.match(await book.getAttribute('href'), /^\/book\//);
  assert.equal((await book.innerText()).trim(), 'Book a clean');
  assert.equal((await page.locator('[data-stage-block] figcaption').innerText()).trim(), "Illustration, not a client's home.");
  for (const img of await page.locator('[data-stage-room]:not([hidden]) img').all()) assert.ok((await img.getAttribute('alt')).length > 20, 'before and after pictures are described');
}, { width: 1280, height: 900 });

await step('a wide screen plays the kitchen clip in the action beat and stops it afterwards', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  await pinTo(page, 0.1);
  await page.waitForTimeout(500);
  assert.deepEqual(urls, [], 'nothing is fetched before the beat');
  await pinTo(page, 0.45);
  await page.locator('[data-stage-action] [data-scene][data-playing]').waitFor();
  assert.ok(urls.some((u) => /\/media\/action-kitchen\.(webm|mp4)$/.test(u)), urls.join(', '));
  assert.ok(await page.locator('[data-stage-action] [data-scene-toggle]').isVisible(), 'the clip has a pause button');
  assert.ok(await page.locator('[data-stage-action] .sample-tag').isVisible(), 'the cleaner is marked as a sample');
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  await page.waitForFunction(() => document.querySelector('[data-stage-action] video').paused);
}, { width: 1280, height: 900 });

await step('choosing a room swaps the stage where it stands, and a room without pictures hides it', async (page) => {
  await go(page, '/');
  await page.locator('#plan [data-room-id="add-study"]').click(); // a study has a checklist and no pictures
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  await page.locator('#whats-included .room--included[data-kind="bathroom"]').first().click();
  assert.deepEqual(await shownRooms(page), ['bathroom']);
  assert.equal(await page.locator(STAGE).getAttribute('data-phase'), 'after');
  await page.locator('#whats-included .room--included[data-kind="study"]').first().click();
  assert.ok(await page.locator('[data-stage-block]').isHidden());
  assert.equal((await page.locator('#whats-included [data-room-panel]:visible h3').innerText()).trim(), 'Study');
  await page.locator('#whats-included [data-room-id="kitchen"]').click();
  assert.ok(await page.locator('[data-stage-block]').isVisible());
  assert.deepEqual(await shownRooms(page), ['kitchen']);
}, { width: 1280, height: 900 });

await step('the living room fades to its finished state instead of sweeping', async (page) => {
  await go(page, '/');
  await pinTo(page, 0.75);
  await untilPhase(page, 'sweep');
  await page.locator('#whats-included .room--included[data-kind="living"]').first().click();
  const after = page.locator('[data-stage-room="living"] .stage__after');
  const [opacity, transform] = await after.evaluate((el) => [Number(getComputedStyle(el).opacity), getComputedStyle(el).transform]);
  assert.ok(opacity > 0.3 && opacity < 0.7, `opacity is ${opacity}`);
  assert.equal(transform, 'none');
  assert.ok(await page.locator(`${STAGE} .stage__band`).isHidden(), 'no light band over a fade');
}, { width: 1280, height: 900 });

await step('on a short desktop screen nothing pins and the stage plays as it crosses the screen', async (page) => {
  await go(page, '/');
  assert.equal(await pinned(page), false);
  assert.equal(await page.locator('[data-stage-pin]').evaluate((el) => el.parentElement.offsetHeight - el.offsetHeight), 0, 'no empty travel');
  await passTo(page, 0.1);
  await untilPhase(page, 'before');
  await passTo(page, 0.97);
  await untilPhase(page, 'after');
  await page.locator('[data-stage-book] a').waitFor();
  assert.ok(await page.locator('#whats-included [data-room-panel]:visible h3').isVisible(), 'the checklist is in reach');
}, { width: 1280, height: 700 });

await step('phones get a still of the cleaner in the action beat and never ask for the clip', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  assert.equal(await pinned(page), false);
  await passTo(page, 0.45);
  await untilPhase(page, 'action');
  const action = page.locator('[data-stage-action]');
  await action.waitFor();
  assert.equal(await action.locator('img').count(), 1);
  assert.match(await action.locator('img').getAttribute('alt'), /cleaner/i);
  assert.equal(await action.locator('video source').count(), 0);
  await passTo(page, 0.97);
  await untilPhase(page, 'after');
  await page.waitForTimeout(400);
  assert.deepEqual(urls, []);
});

await step('reduced motion: the finished room, the booking button, no pinning, no clip', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  assert.equal(await pinned(page), false);
  const stage = page.locator(STAGE);
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await stage.getAttribute('data-phase'), 'after');
  assert.ok(!(await stage.evaluate((el) => el.classList.contains('is-live'))));
  assert.equal(await page.locator('[data-stage-room="kitchen"] .stage__after').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e), 0, '"after" is fully uncovered');
  assert.ok(await page.locator('[data-stage-book] a').isVisible());
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(400);
  assert.equal(await stage.getAttribute('data-phase'), 'after');
  assert.deepEqual(urls, []);
}, { width: 1280, height: 900, reducedMotion: 'reduce' });

await step('without JavaScript the stage shows the finished kitchen, its caption and the booking button', async (page) => {
  await go(page, '/');
  assert.deepEqual(await shownRooms(page), ['kitchen']);
  assert.equal(await page.locator(STAGE).getAttribute('data-phase'), 'after');
  assert.ok(await page.locator('[data-stage-book] a').isVisible());
  assert.equal((await page.locator('[data-stage-block] figcaption').innerText()).trim(), "Illustration, not a client's home.");
  assert.ok(await page.locator('[data-stage-action]').isHidden());
}, { width: 1280, height: 900, javaScriptEnabled: false });

// ── After every block has shown ──────────────────────────────
for (const theme of THEMES) {
  for (const width of [375, 1280]) {
    await step(`axe finds no serious or critical issues once everything has been revealed (${theme}, ${width})`, async (page) => {
      const found = [];
      for (const path of ['/', '/about/', '/areas/chermside/']) {
        await go(page, `${path}?theme=${theme}`);
        await revealAll(page);
        found.push(...(await seriousIssues(page)).map((i) => `${path}: ${i}`));
      }
      assert.deepEqual(found, []);
    }, { width });
  }
}

for (const width of [320, 375, 768, 1280]) {
  await step(`no horizontal scroll once every section has shown (${width})`, async (page) => {
    await go(page, '/');
    await revealAll(page);
    assert.equal(await overflow(page), 0);
  }, { width });
}

await finish();
