// Measure discover / glossary / portfolio / watchlist page layout to
// find the right (x, y, w, h) clip for each tile.
process.env.PLAYWRIGHT_BROWSERS_PATH = '/home/taha/.cache/ms-playwright';

const { chromium } = require('/home/taha/Desktop/Dexter/projects/highnet/app/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3019';

const DEMO_EMAIL = 'demo@paperportfolio.ca';
let DEMO_PASSWORD = '';
try {
  const pwPath = '/tmp/pv_demo_pw.txt';
  if (fs.existsSync(pwPath)) DEMO_PASSWORD = fs.readFileSync(pwPath, 'utf-8').trim();
} catch (_) {}
if (!DEMO_PASSWORD) DEMO_PASSWORD = process.env.DEMO_PW || '';

async function loginViaApi() {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error('login failed: ' + (await res.text()));
  const setCookie = res.headers.get('set-cookie') || '';
  const m = setCookie.match(/pp_session=([^;]+)/) || setCookie.match(/pv_session=([^;]+)/);
  return m[1];
}

async function measure(page, url, label) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(function () {
    const out = { docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight };
    // Sidebar: usually the first <aside> or fixed-position <nav> with width ~250
    const aside = document.querySelector('aside');
    if (aside) {
      const r = aside.getBoundingClientRect();
      out.aside = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    // Main content: typically <main> or the first big <div> after the aside
    const main = document.querySelector('main');
    if (main) {
      const r = main.getBoundingClientRect();
      out.main = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    // Find the H1 / H2 of the page to know where the heading is.
    const h1 = document.querySelector('h1');
    if (h1) {
      const r = h1.getBoundingClientRect();
      out.h1 = { text: h1.textContent.trim().slice(0, 50), left: r.left, top: r.top, width: r.width };
    }
    const h2 = document.querySelector('h2');
    if (h2) {
      const r = h2.getBoundingClientRect();
      out.h2 = { text: h2.textContent.trim().slice(0, 50), left: r.left, top: r.top, width: r.width };
    }
    return out;
  });
  console.log('  ' + label + ':', JSON.stringify(m));
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cookie = await loginViaApi();
  await ctx.addCookies([{
    name: 'pp_session', value: cookie, domain: 'localhost', path: '/',
    httpOnly: true, sameSite: 'Lax',
  }]);
  const page = await ctx.newPage();
  // Dismiss the first-signal modal once
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const modal = await page.$('text=Got it, show me the signals');
  if (modal) { await modal.click(); await page.waitForTimeout(400); }

  await measure(page, '/discover', '/discover');
  await measure(page, '/portfolio', '/portfolio');
  await measure(page, '/learn', '/learn');
  await browser.close();
})();
