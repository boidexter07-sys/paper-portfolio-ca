import Link from 'next/link';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';
import { LESSON_CARDS, GLOSSARY_TERMS } from '@/lib/glossary';
import { GlossaryIndex } from '@/components/GlossaryIndex';

// Map glossary terms to lesson cards by joining on lowercased terms. Done
// here (server side) so the lesson card chips show the resolved term names
// without re-implementing it on the client.
function findTerm(name: string) {
  return GLOSSARY_TERMS.find(
    (g) => g.term.toLowerCase() === name.toLowerCase()
  );
}

// Slugify locally — importing the client component's slugifyTerm from a
// server component pulls the entire client bundle into the server chunk.
function slugifyTerm(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function LearnPage() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-8 max-w-5xl">
      <header>
        <p className="pv-eyebrow">Learn at your own pace</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">
          Learning hub
        </h1>
        <p className="text-body text-graphite mt-1 max-w-prose">
          Short, plain-language explainers. No textbook, no jargon. Each lesson takes five minutes.
          Use it alongside the {GLOSSARY_TERMS.length}-term glossary to find what a word means.
        </p>
      </header>

      {/* Lesson cards — T21 brief: "lesson cards tied to glossary terms" */}
      <section aria-labelledby="lessons-heading">
        <div className="flex items-baseline justify-between mb-3">
          <h2 id="lessons-heading" className="font-serif text-h2 text-ink">
            Plain-language explainers
          </h2>
          <p className="text-caption text-stone hidden sm:block">
            {LESSON_CARDS.length} outlines, all 5 minutes
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LESSON_CARDS.map((lesson) => (
            <article key={lesson.slug} className="pv-card p-4 hover:border-mist">
              <p className="pv-eyebrow">
                {lesson.words} words · {lesson.minutes} min read
              </p>
              <h3 className="font-serif text-h3 text-ink mt-1 leading-snug">{lesson.title}</h3>
              <p className="text-body-sm text-graphite mt-2">{lesson.hook}</p>
              <p className="text-caption text-stone mt-3">
                Outline ready · full article coming soon
              </p>
              {lesson.terms.length > 0 && (
                <p className="text-caption mt-3 flex flex-wrap gap-1.5">
                  <span className="text-stone mr-1">Jump to:</span>
                  {lesson.terms.map((name) => {
                    const t = findTerm(name);
                    if (!t) return null;
                    return (
                      <a
                        key={name}
                        href={`#glossary-${slugifyTerm(t.term)}`}
                        className="px-2 py-0.5 rounded-full text-graphite bg-fog hover:bg-mark/10 hover:text-mark"
                      >
                        {t.term}
                      </a>
                    );
                  })}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Glossary — full 100 terms, alphabetised, filterable by category */}
      <section aria-labelledby="glossary-heading">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="pv-eyebrow">Reference</p>
            <h2 id="glossary-heading" className="font-serif text-h2 text-ink">
              Glossary, A–Z
            </h2>
            <p className="text-body-sm text-graphite mt-1">
              {GLOSSARY_TERMS.length} terms. Filter by category or search by word.
            </p>
          </div>
        </div>
        <GlossaryIndex />
      </section>

      {/* A note about what this is */}
      <section>
        <div className="pv-card p-4 sm:p-5 bg-fog/40">
          <p className="pv-eyebrow mb-2">A note on what this is</p>
          <p className="text-body-sm text-graphite max-w-prose">{NO_ADVICE_DISCLAIMER.long}</p>
        </div>
      </section>

      <p className="text-caption text-stone text-center">
        Looking for the math?{' '}
        <Link href="/discover" className="pv-link">
          Browse stocks
        </Link>
        , pick one, then read the Plain Score breakdown.
      </p>
    </div>
  );
}
