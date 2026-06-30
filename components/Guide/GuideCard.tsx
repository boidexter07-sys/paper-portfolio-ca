// T43: GuideCard — the index card used on /guide.
//
// Renders an icon, eyebrow ("guide"), title, blurb, and a 5-min read
// pill. Uses the shared .pv-card surface so the visual weight matches
// the rest of the app. Icons are inline SVGs (no icon library).

import Link from 'next/link';
import type { GuideMeta } from '@/lib/guide';
import { GuideCardIcon } from './GuideCardIcon';

export function GuideCard({ guide }: { guide: GuideMeta }) {
  return (
    <Link
      href={`/guide/${guide.slug}`}
      className="pv-card p-4 sm:p-5 flex gap-4 hover:shadow-modal transition-shadow group"
      data-walk-target={`guide-${guide.slug}`}
    >
      <div className="shrink-0">
        <GuideCardIcon iconKey={guide.iconKey} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="pv-eyebrow">Guide · {guide.readingMinutes} min</p>
        <h3 className="font-serif text-h4 text-ink mt-1 group-hover:text-mark transition-colors">
          {guide.title}
        </h3>
        <p className="text-body-sm text-graphite mt-1 max-w-prose line-clamp-3">
          {guide.blurb}
        </p>
      </div>
    </Link>
  );
}
