// Capture screenshots of all 8 brief screens at mobile (375) and desktop (1280) viewports.
// Run: npx tsx scripts/screenshots.ts
// Assumes the dev server is running and you have a valid cookie at /tmp/cookies.txt (curl format).

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const URL = process.env.URL || 'http://localhost:3000';
const COOKIE_FILE = process.env.COOKIE || '/tmp/cookies.txt';
const OUT = process.env.OUT || path.join(process.cwd(), 'screenshots');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Parse Netscape cookies.txt (curl-style) into Playwright cookie objects.
function parseCookies(file: string) {
  const text = fs.readFileSync(file, 'utf-8');
  const cookies: any[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('# ')) continue;
    const parts = line.split('\t');
    if (parts.length < 7) continue;
    const [domain, _flag, _path, _secure, _expires, name, value] = parts;
    if (!name || value === undefined) continue;
    const isHttpOnly = rawLine.startsWith('#HttpOnly_');
    const cleanDomain = domain.replace(/^#HttpOnly_/, '');
    cookies.push({
      name,
      value,
      domain: cleanDomain,
      path: _path || '/',
      httpOnly: isHttpOnly,
      secure: _secure === 'TRUE',
      expires: Number(_expires) || -1,
    });
  }
  return cookies;
}

const SCREENS: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'discover', path: '/discover' },
  { name: 'stock', path: '/stock/AAPL' },
  { name: 'stock-deep', path: '/stock/AAPL/deep' },
  { name: 'portfolio', path: '/portfolio' },
  { name: 'community', path: '/community' },
  { name: 'learn', path: '/learn' },
  { name: 'account', path: '/account' },
];

const VIEWPORTS: { name: string; w: number; h: number }[] = [
  { name: '375', w: 375, h: 812 },
  { name: '1280', w: 1280, h: 800 },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const cookies = parseCookies(COOKIE_FILE);
  if (cookies.length === 0) {
    console.error('No cookies parsed from', COOKIE_FILE);
    process.exit(1);
  }
  console.log(`Loaded ${cookies.length} cookies`);

  // First: capture the "first-time PRISM signal" modal on a stock page (one-off, desktop).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    // Reset acknowledgement in the DB to ensure modal shows.
    // (Caller is expected to do this before running; we just navigate.)
    await page.goto(`${URL}/stock/AAPL`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    const out = path.join(OUT, 'first-signal-modal_1280.png');
    await page.screenshot({ path: out, fullPage: false });
    console.log(`  first-signal-modal_1280.png  <- ${URL}/stock/AAPL`);
    await ctx.close();
  }

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    // First navigate to /stock/AAPL to dismiss the first-signal modal via its action.
    await page.goto(`${URL}/stock/AAPL`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);
    // Try to click the "Got it" button if present.
    const btn = page.getByRole('button', { name: /Got it/i });
    if (await btn.count() > 0) {
      try { await btn.first().click({ timeout: 2000 }); } catch {}
    }
    await page.waitForTimeout(400);
    for (const s of SCREENS) {
      const url = `${URL}${s.path}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(900); // let charts/fonts settle
        const out = path.join(OUT, `${s.name}_${vp.name}.png`);
        await page.screenshot({ path: out, fullPage: false });
        console.log(`  ${s.name}_${vp.name}.png  <- ${url}`);
      } catch (e) {
        console.error(`  ! ${s.name}_${vp.name}.png failed: ${(e as Error).message}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\nWrote ${SCREENS.length * VIEWPORTS.length} screenshots + 1 modal to ${OUT}`);
})();
