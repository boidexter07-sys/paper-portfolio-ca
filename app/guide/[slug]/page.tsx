// T43: Individual guide page — renders one of the 7 guides by slug.
//
// Falls back to a Next 404 (via notFound()) if the slug is unknown.
//
// Layout:
//   - breadcrumb (Guide / <title>)
//   - hero with eyebrow + h1 + intro + reading time
//   - body sections (GuideStep)
//   - "Next guide →" + previous-guide footer
//   - "Take the tour" CTA at the bottom

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GUIDES, findGuide, type GuideSlug } from '@/lib/guide';
import { GuideStep } from '@/components/Guide/GuideStep';
import { GuideCardIcon } from '@/components/Guide/GuideCardIcon';

export const dynamic = 'force-dynamic';

export default async function GuideSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/guide/${guide.slug}`);

  const idx = GUIDES.findIndex((g) => g.slug === guide.slug);
  const prev = idx > 0 ? GUIDES[idx - 1] : null;
  const next = idx < GUIDES.length - 1 ? GUIDES[idx + 1] : null;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-readable mx-auto">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-caption text-stone">
        <Link href="/guide" className="hover:text-ink">
          ← All guides
        </Link>
      </nav>

      {/* Hero */}
      <header className="pv-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <GuideCardIcon iconKey={guide.iconKey} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="pv-eyebrow">Guide · {guide.readingMinutes} min</p>
            <h1 className="font-serif text-h1 sm:text-h1 text-ink leading-tight mt-1">
              {guide.title}
            </h1>
            <p className="text-body text-graphite mt-3 max-w-prose">{guide.intro}</p>
          </div>
        </div>
      </header>

      {/* Body sections */}
      <div className="space-y-3">
        {guide.body.map((s, i) => (
          <GuideStep key={i} heading={s.heading} copy={s.copy} />
        ))}
      </div>

      {/* Footer nav — prev / next guide */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-fog">
        <div>
          {prev && (
            <Link href={`/guide/${prev.slug}`} className="pv-btn-ghost text-body-sm">
              ← {prev.title}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {next && (
            <Link href={`/guide/${next.slug}`} className="pv-btn-secondary text-body-sm">
              {next.title} →
            </Link>
          )}
          <Link href="/walkthrough" className="pv-btn-mark text-body-sm">
            Take the tour
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Pre-render the 7 known slugs so Next builds them as static. */
export function generateStaticParams(): { slug: GuideSlug }[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}
