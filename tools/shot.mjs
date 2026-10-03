// Screenshot helper: node tools/shot.mjs <path> <width> <out.png> [fullPage=1]
// Base URL: SHOT_BASE (default http://localhost:4321).
import { chromium } from 'playwright';
const [, , path = '/', width = '375', out = 'shot.png', full = '1'] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${process.env.SHOT_BASE ?? 'http://localhost:4321'}${path}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: full === '1' });
if (errors.length) console.log('ERRORS:', errors.join('\n'));
await browser.close();
