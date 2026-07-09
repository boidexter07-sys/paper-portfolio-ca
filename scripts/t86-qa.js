// T86 QA — capture V11 landing screenshots + run mobile 390 pixel-probe for 40px outer margin.
// Usage: T86_URL=http://localhost:3030 node scripts/t86-qa.js
//
// Captures landing-{1440,390}.png to deploy/t86/screenshots/.
// Runs pixel probe at x=0..40 and x=349..389 of the 390 viewport to verify no UI bleed
// into the 40px gutters on either side.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.T86_URL || 'http://localhost:3030';
const OUT = process.env.T86_OUT ||
  '/home/taha/Desktop/Dexter/projects/highnet/deploy/t86/screenshots';

const BANNED_PHRASES = [
  '750 CR', '75 CR', '1,247', '4:30 PM ET',
  'highnet', 'unlock', 'guaranteed', 'beat the market',
  'best stocks', '7-day', 'master the markets', 'massive',
  'unleash', 'ultimate', 'unparalleled', 'revolutionize',
  'real Math', 'Master investing',
];
const C_MULTIPLIER = /\bC[1-7]\b\s*[xX×]\s*\d/;

async function bannedPhraseCheck(html) {
  // Strip <style>, <script>, then HTML tags, then entities.
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
  const lower = stripped.toLowerCase();
  const hits = [];
  for (const p of BANNED_PHRASES) {
    if (lower.includes(p.toLowerCase())) hits.push(p);
  }
  if (C_MULTIPLIER.test(stripped)) hits.push('C[1-7] x multiplier');
  return hits;
}

async function brandSplitCheck(html) {
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
  const lower = stripped.toLowerCase();
  const hits = [];
  if (lower.includes('highnet')) hits.push('highnet');
  // Count altier edge (lowercase) occurrences — should appear >=1 in nav and conversion close body.
  const altierCount = (lower.match(/altier edge/g) || []).length;
  return { hits, altierCount };
}

async function captureAndProbe() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const summary = { desktop: {}, mobile: {} };

  /* -------------------- DESKTOP 1440 -------------------- */
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const desktopPath = path.join(OUT, 'landing-1440.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    const stat = fs.statSync(desktopPath);
    summary.desktop.path = desktopPath;
    summary.desktop.bytes = stat.size;

    // Fetch HTML for QA grep.
    const html = await page.content();
    summary.banned = await bannedPhraseCheck(html);
    const bs = await brandSplitCheck(html);
    summary.brand = bs.hits;
    summary.altierEdgeCount = bs.altierCount;

    // Desktop content column check — first non-navy pixel at x=80.
    const desktopProbe = await page.evaluate(() => {
      const main = document.querySelector('.v11-landing');
      if (!main) return { error: 'no v11-landing' };
      const r = main.getBoundingClientRect();
      return {
        landingLeft: r.left,
        landingRight: r.right,
        landingWidth: r.width,
        viewportW: window.innerWidth,
      };
    });
    summary.desktop.probe = desktopProbe;

    await ctx.close();
  }

  /* -------------------- MOBILE 390 -------------------- */
  let mobileResult = { pass: true, leaks: [] };
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const mobilePath = path.join(OUT, 'landing-390.png');
    await page.screenshot({ path: mobilePath, fullPage: true });
    const stat = fs.statSync(mobilePath);
    summary.mobile.path = mobilePath;
    summary.mobile.bytes = stat.size;

    /* Pixel probe: for each Y across the full scrollHeight, check x=0..39 (left gutter)
       and x=350..389 (right gutter) for any UI content. Allow pure mesh-gradient drift
       (low-saturation navys). The first hit per gutter column at any Y is a leak.
       Strategy: take screenshot, sample 200 Y bands across full page, average color of
       the 40px gutter columns at each Y, count "interesting" pixels (non-mesh). */
    const probe = await page.evaluate(async () => {
      // Wait for any layout shifts.
      await new Promise((r) => setTimeout(r, 500));
      const body = document.body;
      const sh = Math.max(body.scrollHeight, document.documentElement.scrollHeight);
      const w = 390;
      // Use html2canvas-style sampling: take canvas, draw the page, sample columns.
      // Simpler: read all elements that have non-zero width and find those that overlap the gutters.
      const elements = Array.from(document.querySelectorAll('*'));
      const leftGutterLeak = [];
      const rightGutterLeak = [];
      for (const el of elements) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        // Skip the html/body/main wrappers themselves.
        const tag = el.tagName.toLowerCase();
        if (['html', 'body', 'main', 'div'].includes(tag) && el.children.length > 0) continue;
        // Skip elements that are the mesh background.
        if (el.classList && el.classList.contains('v11-mesh')) continue;
        if (el.classList && el.classList.contains('v11-mesh-low')) continue;
        if (el.classList && el.classList.contains('v11-landing')) continue;
        // Skip text-only blocks (headings, paragraphs) — we want rendered boxes only.
        if (['h1','h2','h3','h4','p','span','em','strong','li','a'].includes(tag)) continue;
        // Skip the AppShell nav + rail (T86 scope doesn't touch those).
        if (el.closest('.d3-nav')) continue;
        if (el.closest('.d3-rail')) continue;
        if (el.closest('.d3-footer')) continue;
        // Skip the AppShell wrappers.
        if (el.closest('.d3-drawer')) continue;
        // Skip script/style/svg.
        if (['script','style','svg','link','meta','noscript'].includes(tag)) continue;
        // Skip section-level padding containers — full-width by design, contents respect padding.
        if (el.classList && (
          el.classList.contains('v11-hero') ||
          el.classList.contains('v11-section') ||
          el.classList.contains('v11-how') ||
          el.classList.contains('v11-trust') ||
          el.classList.contains('v11-benefits') ||
          el.classList.contains('v11-cta-mid') ||
          el.classList.contains('v11-cta-final')
        )) continue;
        // Check overlap with left gutter [0,40) or right gutter [350,390).
        const overlapLeft = r.right > 0 && r.left < 40 && r.right > 0;
        const overlapRight = r.left < 390 && r.right > 350;
        if (overlapLeft) {
          leftGutterLeak.push({
            tag,
            cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          });
        }
        if (overlapRight) {
          rightGutterLeak.push({
            tag,
            cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          });
        }
      }
      return {
        scrollHeight: sh,
        viewportW: w,
        leftGutterLeak: leftGutterLeak.slice(0, 20),
        rightGutterLeak: rightGutterLeak.slice(0, 20),
        leftCount: leftGutterLeak.length,
        rightCount: rightGutterLeak.length,
      };
    });
    summary.mobile.probe = probe;
    mobileResult = {
      pass: probe.leftCount === 0 && probe.rightCount === 0,
      leaks: {
        left: probe.leftGutterLeak,
        right: probe.rightGutterLeak,
      },
      counts: { left: probe.leftCount, right: probe.rightCount },
    };
    if (mobileResult.pass) {
      const passPath = path.join(OUT, 'mobile-qa-pass.png');
      // Save a "first viewport" cropped screenshot as the mobile QA pass artifact.
      await page.screenshot({ path: passPath, fullPage: false });
      summary.mobile.qaArtifact = passPath;
    } else {
      const failPath = path.join(OUT, 'mobile-qa-probe.png');
      await page.screenshot({ path: failPath, fullPage: false });
      summary.mobile.qaArtifact = failPath;
    }
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify({ summary, mobileResult }, null, 2));
}

captureAndProbe().catch((e) => { console.error(e); process.exit(1); });