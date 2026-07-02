// Altier Edge — D3 Landing page client wrapper.
// Mounts IntersectionObserver for rank-row entrance motion (single language).
// Fallback: if rows are still hidden after 1.5s, mark them as in — a static
// visitor or a non-scrolling screenshot must see the data, not an empty card.

'use client';

import { useEffect } from 'react';

export function LandingPageClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.d3-rank-row'));
    if (rows.length === 0) return;

    if (reduce) {
      rows.forEach((r) => r.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    rows.forEach((r) => io.observe(r));

    // Defensive fallback: if anything is still hidden after 1.5s (e.g. user
    // hasn't scrolled, or screenshot capture) — reveal it. Motion is additive,
    // not a gate on the data.
    const fallback = window.setTimeout(() => {
      rows.forEach((r) => {
        if (!r.classList.contains('is-in')) r.classList.add('is-in');
      });
    }, 1500);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return null;
}
