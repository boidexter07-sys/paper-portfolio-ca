// T43: GuideStep — a single body section inside an individual guide
// page. Holds a small heading plus the prose copy. Used twice per
// guide page (every guide has two body sections per the T43 brief).
//
// Copy flows through verbatim; the page passes the {{...}} markers
// in from the GuideMeta and they're rendered as-is. Muse's parallel
// task swaps them for real copy at integration time.

export function GuideStep({ heading, copy }: { heading: string; copy: string }) {
  return (
    <section className="pv-card p-5 sm:p-6">
      <h2 className="font-serif text-h3 text-ink leading-snug">{heading}</h2>
      <p className="text-body text-graphite mt-2 max-w-prose">{copy}</p>
    </section>
  );
}
