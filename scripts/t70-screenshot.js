// T70 — vision-verify screenshot at 1440x.
// Captures the homepage at production viewport + a 390px mobile viewport.

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const url = 'http://127.0.0.1:4111/';

  // Desktop 1440px
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const pageD = await ctxD.newPage();
  await pageD.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await pageD.waitForTimeout(2500); // let motion + fallback settle
  await pageD.screenshot({ path: '/home/taha/Desktop/Dexter/projects/highnet/deploy/t70/t70-prod-screenshot.png', fullPage: true });
  console.log('desktop 1440px screenshot OK');

  // Mobile 390px
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const pageM = await ctxM.newPage();
  await pageM.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await pageM.waitForTimeout(2500);
  await pageM.screenshot({ path: '/home/taha/Desktop/Dexter/projects/highnet/deploy/t70/t70-prod-screenshot-mobile.png', fullPage: true });
  console.log('mobile 390px screenshot OK');

  await browser.close();
})().catch((e) => { console.error('FAIL:', e); process.exit(1); });
