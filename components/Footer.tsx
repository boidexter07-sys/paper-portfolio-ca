import { FOOTER_DISCLOSURE } from '@/lib/disclosures';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-fog py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-caption text-stone">
        <p className="max-w-prose">{FOOTER_DISCLOSURE.long}</p>
        <p className="text-stone shrink-0">© Paper Portfolio Canada · Educational tool only</p>
      </div>
    </footer>
  );
}
