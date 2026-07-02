// Altier Edge — Learn landing page.
// 6 articles from muse-learn-articles.md, with intro from muse-inside-pages.md.

import Link from 'next/link';
import { ARTICLES } from '@/lib/articles';
import { GLOSSARY_TERMS } from '@/lib/glossary';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';

export const dynamic = 'force-dynamic';

export default function LearnLandingPage() {
  return (
    <div className="d2-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <header style={{ marginBottom: 32 }}>
        <span className="d2-label">[ LEARN ]</span>
        <h1 className="d2-h1" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginTop: 12 }}>
          Learn
        </h1>
        <p className="d2-body-secondary" style={{ marginTop: 12, fontSize: 18, maxWidth: '64ch' }}>
          Short articles written for the investor who is just getting serious about picking stocks. Six
          ship on day one. New ones every two weeks. Same voice, same format, no jargon without a
          definition.
        </p>
      </header>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {ARTICLES.map((a) => (
          <Link
            key={a.slug}
            href={`/learn/${a.slug}`}
            className="d2-card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <p className="d2-micro" style={{ color: 'var(--d2-ink)' }}>{a.readingMinutes} min read</p>
            <h2 className="d2-h3" style={{ marginTop: 8 }}>{a.title}</h2>
            <p className="d2-body" style={{ marginTop: 8, fontSize: 14 }}>{a.summary}</p>
            <p className="d2-micro" style={{ marginTop: 12 }}>[ Read article → ]</p>
          </Link>
        ))}
      </div>

      <section className="d2-section-tight" style={{ marginTop: 48, padding: '24px 0', borderTop: '2px solid var(--d2-ink)' }}>
        <span className="d2-label">[ GLOSSARY ]</span>
        <h2 className="d2-h2" style={{ fontSize: 24, marginTop: 12 }}>A short glossary of terms</h2>
        <p className="d2-body" style={{ marginTop: 8, maxWidth: '64ch' }}>
          {GLOSSARY_TERMS.length} plain-language definitions covering the terms that come up in articles
          and on PRISM cards.
        </p>
        <p className="d2-micro" style={{ marginTop: 12 }}>
          Search the glossary from the Search bar in the top nav.
        </p>
      </section>

      <p className="d2-disclosure">[ {NO_ADVICE_DISCLAIMER.short} ]</p>
    </div>
  );
}