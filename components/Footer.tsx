import { FOOTER_DISCLOSURE } from '@/lib/disclosures';

export function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-ink py-6 px-4 sm:px-6 bg-paper">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="max-w-prose d2-body" style={{ fontSize: 12, color: 'var(--d2-text-tertiary)' }}>
          {FOOTER_DISCLOSURE.long}
        </p>
        <p className="d2-micro shrink-0">© Altier Edge · 2026 · built in Canada</p>
      </div>
    </footer>
  );
}