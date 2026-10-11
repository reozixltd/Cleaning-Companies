/**
 * How many bytes the home page transfers, at a phone and a desktop width: once
 * loaded, and after scrolling the whole page. Needs a running preview.
 *
 *   node tools/page-weight.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [width, height] of [[375, 800], [1280, 800]]) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const atLoad = bytes;
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 150));
    }
  });
  await page.waitForLoadState('networkidle');
  console.log(`${width}px  at load ${(atLoad / 1024).toFixed(0)} KB  after scrolling the whole page ${(bytes / 1024).toFixed(0)} KB`);
  await page.close();
}
await browser.close();
