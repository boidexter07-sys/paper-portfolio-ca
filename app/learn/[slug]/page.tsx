// Altier Edge — Learn article detail page.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findArticle, ARTICLES } from '@/lib/articles';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';

export const dynamic = 'force-dynamic';

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = findArticle(params.slug);
  if (!article) notFound();

  // Render the body as plain paragraphs + headings.
  const blocks = article.body.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="d2-container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: '40rem' }}>
      <p className="d2-micro">
        <Link href="/learn" style={{ color: 'inherit' }}>← All articles</Link>
      </p>
      <header style={{ marginTop: 16, marginBottom: 24 }}>
        <p className="d2-micro" style={{ color: 'var(--d2-ink)' }}>Article · {article.readingMinutes} min read</p>
        <h1 className="d2-h1" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginTop: 12 }}>{article.title}</h1>
        <p className="d2-body-secondary" style={{ marginTop: 8, fontSize: 16 }}>{article.summary}</p>
      </header>

      <article className="d2-body" style={{ fontSize: 16, lineHeight: 1.65 }}>
        {blocks.map((block, i) => {
          if (block.startsWith('#### ')) {
            return (
              <h3 key={i} className="d2-h3" style={{ marginTop: 32, marginBottom: 8 }}>
                {block.replace(/^####\s+/, '')}
              </h3>
            );
          }
          if (block.startsWith('### ')) {
            return (
              <h2 key={i} className="d2-h2" style={{ marginTop: 32, marginBottom: 8, fontSize: 22 }}>
                {block.replace(/^###\s+/, '')}
              </h2>
            );
          }
          if (block.startsWith('## ')) {
            return (
              <h2 key={i} className="d2-h2" style={{ marginTop: 32, marginBottom: 8 }}>
                {block.replace(/^##\s+/, '')}
              </h2>
            );
          }
          if (block.startsWith('- ') || block.startsWith('* ')) {
            const items = block.split(/\n/).map((l) => l.replace(/^[-*]\s+/, ''));
            return (
              <ul key={i} style={{ marginTop: 8, marginBottom: 16, paddingLeft: 20 }}>
                {items.map((item, j) => (
                  <li key={j} className="d2-body" style={{ marginBottom: 4, fontSize: 16 }}>{item}</li>
                ))}
              </ul>
            );
          }
          if (/^\d+\.\s/.test(block)) {
            const items = block.split(/\n/).map((l) => l.replace(/^\d+\.\s+/, ''));
            return (
              <ol key={i} style={{ marginTop: 8, marginBottom: 16, paddingLeft: 20 }}>
                {items.map((item, j) => (
                  <li key={j} className="d2-body" style={{ marginBottom: 4, fontSize: 16 }}>{item}</li>
                ))}
              </ol>
            );
          }
          // paragraph — preserve inline bold via simple parser
          return (
            <p key={i} className="d2-body" style={{ marginBottom: 16, fontSize: 16, lineHeight: 1.65 }}>
              {renderInline(block)}
            </p>
          );
        })}
      </article>

      <div className="d2-disclosure" style={{ marginTop: 32 }}>
        [ {NO_ADVICE_DISCLAIMER.short} ]
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href={article.cta.href} className="d2-cta">
          [ {article.cta.label} ]
        </Link>
        <Link href="/learn" className="d2-cta">
          [ All articles ]
        </Link>
      </div>

      <RelatedArticles slug={article.slug} />
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // very small bold parser: **word** → <strong>
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={i++}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function RelatedArticles({ slug }: { slug: string }) {
  const others = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);
  return (
    <section className="d2-section-tight" style={{ marginTop: 48, borderTop: '2px solid var(--d2-ink)', padding: '24px 0' }}>
      <span className="d2-label">[ READ NEXT ]</span>
      <ul style={{ marginTop: 12 }}>
        {others.map((o) => (
          <li key={o.slug} style={{ marginBottom: 8 }}>
            <Link href={`/learn/${o.slug}`} className="d2-cta" style={{ display: 'block' }}>
              [ {o.title} → ]
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}