// Client-side glossary index with category filter and per-letter anchor
// scrollspy. The list renders all 100 terms (sorted alphabetically) and
// groups them by first letter. Each glossary row links back to the
// matching lesson card above via a stable id (`glossary-{term-slug}`).
//
// We deliberately do NOT render the long <details> on every term — a
// collapsible text body would feel like a textbook. Instead each term is
// shown flat: name, definition, see-also chips. Clicking a see-also
// chip focuses that other glossary entry; clicking the term itself
// copies a deep link.

'use client';

import { useState, useMemo } from 'react';
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, type GlossaryTerm } from '@/lib/glossary';

function slugify(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function GlossaryIndex() {
  const [activeCat, setActiveCat] = useState<GlossaryTerm['category'] | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((t) => {
      if (activeCat !== 'all' && t.category !== activeCat) return false;
      if (!ql) return true;
      return (
        t.term.toLowerCase().includes(ql) ||
        t.definition.toLowerCase().includes(ql)
      );
    }).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  }, [activeCat, q]);

  // Group by first letter for the rendered list.
  const grouped = useMemo(() => {
    const out: Record<string, GlossaryTerm[]> = {};
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      out[letter] = out[letter] || [];
      out[letter].push(t);
    }
    return out;
  }, [filtered]);

  const letters = Object.keys(grouped).sort();
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: GLOSSARY_TERMS.length };
    for (const t of GLOSSARY_TERMS) c[t.category] = (c[t.category] || 0) + 1;
    return c;
  }, []);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <div className="flex-1">
          <label className="sr-only" htmlFor="glossary-search">Search the glossary</label>
          <input
            id="glossary-search"
            className="pv-input"
            placeholder="Search the 100-term glossary"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pv-scroll-hide">
          <button
            type="button"
            onClick={() => setActiveCat('all')}
            className={`px-3 py-2 rounded-md text-caption font-medium whitespace-nowrap ${
              activeCat === 'all' ? 'bg-ink text-bone' : 'bg-fog text-graphite'
            }`}
          >
            All ({counts['all']})
          </button>
          {GLOSSARY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCat(cat.key)}
              className={`px-3 py-2 rounded-md text-caption font-medium whitespace-nowrap ${
                activeCat === cat.key ? 'bg-ink text-bone' : 'bg-fog text-graphite'
              }`}
            >
              {cat.label} ({counts[cat.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Quick alphabet jump (only render the letters that have results) */}
      {letters.length > 0 && (
        <nav
          aria-label="Jump to letter"
          className="flex flex-wrap gap-1 mb-3 text-caption text-stone"
        >
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="px-2 py-1 rounded hover:bg-fog text-graphite"
            >
              {l}
            </a>
          ))}
        </nav>
      )}

      {filtered.length === 0 ? (
        <div className="pv-card p-6 text-center">
          <p className="text-body text-graphite">No terms match that filter.</p>
          <p className="text-caption text-stone mt-1">Try a different word, or pick a different category.</p>
        </div>
      ) : (
        <div className="pv-card divide-y divide-fog">
          {letters.map((l) => (
            <section key={l} id={`letter-${l}`} aria-labelledby={`letter-h-${l}`}>
              <h3
                id={`letter-h-${l}`}
                className="px-4 pt-3 pb-2 text-caption uppercase tracking-wide text-stone sticky top-14 bg-bone/95 backdrop-blur z-10"
              >
                {l}
              </h3>
              {grouped[l].map((t) => (
                <article
                  key={t.term}
                  id={`glossary-${slugify(t.term)}`}
                  className="p-4"
                >
                  <header className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-ink">{t.term}</p>
                    <span className="text-caption text-stone uppercase tracking-wide">
                      {t.category.replace('_', ' ')}
                    </span>
                  </header>
                  <p className="text-body-sm text-graphite mt-1 max-w-prose">{t.definition}</p>
                  {t.see_also && t.see_also.length > 0 && (
                    <p className="text-caption text-stone mt-2">
                      See also:{' '}
                      {t.see_also.map((s, i) => (
                        <span key={s}>
                          {i > 0 ? ', ' : ''}
                          <a
                            href={`#glossary-${slugify(s)}`}
                            className="underline text-graphite hover:text-ink"
                          >
                            {s}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                </article>
              ))}
            </section>
          ))}
        </div>
      )}

      <p className="text-caption text-stone mt-3">
        Showing {filtered.length} of {GLOSSARY_TERMS.length} terms · sorted A–Z.
      </p>
    </>
  );
}

export function slugifyTerm(t: string) {
  return slugify(t);
}
