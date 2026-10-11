/**
 * How many bytes the home page transfers, once loaded and after scrolling the
 * whole page, in Chromium, for a phone at device pixel ratio 1 (comparable with
 * the redesign's "Before" figures), the same phone at ratio 3 (what a current
 * phone downloads, because it fetches larger pictures), and a desktop. Needs a
 * running preview. Exits 1 if the home page does not answer with a success.
 *
 *   node tools/page-weight.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
for (const [label, width, height, deviceScaleFactor] of [
  ['phone, 375 wide, pixel ratio 1', 375, 800, 1],
  ['phone, 375 wide, pixel ratio 3', 375, 800, 3],
  ['desktop, 1280 wide, pixel ratio 1', 1280, 800, 1],
]) {
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor })).newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  let bytes = 0;
  // Every chunk of every body as it arrives, so a clip the browser stops fetching part way is still counted (response headers are not).
  cdp.on('Network.dataReceived', (e) => (bytes += e.encodedDataLength));
  const response = await page.goto(base + '/', { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    console.error(`${base}/ answered ${response ? `${response.status()} ${response.statusText()}` : 'nothing'}: not measuring an error page as the home page.`);
    await browser.close();
    process.exit(1);
  }
  const atLoad = bytes;
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 150));
    }
  });
  await page.waitForLoadState('networkidle');
  console.log(`${label}: at load ${kb(atLoad)}, after scrolling the whole page ${kb(bytes)}`);
  await page.close();
}
await browser.close();
