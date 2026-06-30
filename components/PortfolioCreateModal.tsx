'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { CashSlider } from './CashSlider';
import { DEFAULT_PORTFOLIO_CASH_CAD } from '@/lib/constants';

type Style = 'value' | 'growth' | 'balanced';

const STYLE_OPTIONS: { value: Style; label: string; desc: string }[] = [
  { value: 'balanced', label: 'Balanced', desc: 'A mix of value and growth. Still figuring it out.' },
  { value: 'value', label: 'Value', desc: 'Companies that look cheaper than they should be.' },
  { value: 'growth', label: 'Growth', desc: 'Fast-growing companies, even if the price looks rich.' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * T41: "Create new portfolio" modal. Opened from /portfolio's "+ Create new
 * portfolio" button. Wraps the shared CashSlider + a style picker + name
 * input, then POSTs to /api/portfolio which validates and inserts the
 * row. Server revalidates /portfolio so the new card appears without a
 * client refresh.
 */
export function PortfolioCreateModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [style, setStyle] = useState<Style>('balanced');
  const [startingCash, setStartingCash] = useState<number>(DEFAULT_PORTFOLIO_CASH_CAD);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { push } = useToast();

  // Reset whenever the modal opens so a previous "started typing" state
  // doesn't leak between sessions.
  useEffect(() => {
    if (!open) return;
    setName('');
    setStyle('balanced');
    setStartingCash(DEFAULT_PORTFOLIO_CASH_CAD);
    setErr(null);
    setSubmitting(false);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (name.trim().length > 60) {
      setErr('Name must be 60 characters or fewer.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          style,
          startingCash,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error || 'Could not create portfolio.');
        setSubmitting(false);
        return;
      }
      push(`Created ${data.portfolio.name}.`, 'positive');
      onClose();
      router.refresh();
    } catch {
      setErr('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-create-modal-title"
    >
      <div className="pv-card w-full max-w-md p-6 shadow-modal">
        <p className="pv-eyebrow">New paper portfolio</p>
        <h2 id="portfolio-create-modal-title" className="font-serif text-h3 text-ink mb-1">
          Create another paper portfolio
        </h2>
        <p className="text-body-sm text-graphite mb-4">
          Each portfolio tracks its own cash and holdings independently. Useful for trying a different strategy side by side.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-caption text-graphite mb-1">Name (optional)</label>
            <input
              type="text"
              className="pv-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dividend sleeve"
              maxLength={60}
              autoFocus
            />
            <p className="text-caption text-stone mt-1">Leave blank to use "My paper portfolio".</p>
          </div>
          <div>
            <p className="block text-caption text-graphite mb-1">Style</p>
            <div className="space-y-2">
              {STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`block p-3 rounded-md border cursor-pointer ${
                    style === opt.value ? 'border-mark bg-mark/5' : 'border-fog bg-bone'
                  }`}
                >
                  <input
                    type="radio"
                    name="new-portfolio-style"
                    value={opt.value}
                    checked={style === opt.value}
                    onChange={() => setStyle(opt.value)}
                    className="sr-only"
                  />
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-ink">{opt.label}</span>
                  </div>
                  <p className="text-body-sm text-graphite mt-0.5">{opt.desc}</p>
                </label>
              ))}
            </div>
          </div>
          <CashSlider
            value={startingCash}
            onChange={setStartingCash}
            label="Starting cash"
            ariaLabel="Starting cash for the new portfolio"
          />
          {err && <p className="text-caption text-negative">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="pv-btn-ghost flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="pv-btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}