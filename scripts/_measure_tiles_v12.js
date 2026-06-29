// Measure the actual rendered tile-card width at 1280px viewport.
// One-shot, no build artifacts.

process.env.PLAYWRIGHT_BROWSERS_PATH = '/home/taha/.cache/ms-playwright';

const { chromium } = require('/home/taha/Desktop/Dexter/projects/highnet/app/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3019/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Diagnostic: list h2s.
  const debugH2 = await page.evaluate(() =>
    [...document.querySelectorAll('h2')].map(h => h.textContent?.trim().slice(0, 80))
  );
  console.log('DEBUG h2s:', JSON.stringify(debugH2, null, 2));
  console.log('DEBUG title:', await page.title());
  console.log('DEBUG url:', page.url());
  // Find the surface card image containers. We tagged them with
  // aspect-[16/9] and bg-fog/40 — both are Tailwind classes compiled to
  // .aspect-\[16\/9\] and .bg-fog\/40. Easier: find the parent .pv-card
  // under the "What you can look at" heading.
  const dims = await page.evaluate(() => {
    const out = [];
    // Find the section that contains "What you can look at"
    const h2s = [...document.querySelectorAll('h2')];
    const wyla = h2s.find(h => h.textContent.includes('Four surfaces'));
    if (!wyla) return { error: 'wyla h2 not found' };
    const section = wyla.closest('section');
    if (!section) return { error: 'section not found' };
    const grid = section.querySelector('div.grid');
    if (!grid) return { error: 'grid not found' };
    const cards = [...grid.children];
    cards.forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const imgWrap = card.querySelector('div.relative');
      const img = card.querySelector('img');
      const out_ = {
        i,
        cardWidth: cardRect.width,
        cardLeft: cardRect.left,
        imgWrapWidth: imgWrap ? imgWrap.getBoundingClientRect().width : null,
        imgNatW: img ? img.naturalWidth : null,
        imgNatH: img ? img.naturalHeight : null,
        imgDispW: img ? img.getBoundingClientRect().width : null,
        imgDispH: img ? img.getBoundingClientRect().height : null,
      };
      out.push(out_);
    });
    return { sectionWidth: section.getBoundingClientRect().width, cards: out };
  });
  console.log(JSON.stringify(dims, null, 2));
  await browser.close();
})();
