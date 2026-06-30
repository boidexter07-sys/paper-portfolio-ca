'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

const METRICS = [
  { id: 'M1', label: 'M1 — Price return' },
  { id: 'M2', label: 'M2 — End-of-day value' },
  { id: 'M3', label: 'M3 — End-of-week value' },
  { id: 'M4', label: 'M4 — PRISM delta' },
  { id: 'M5', label: 'M5 — Risk-adjusted Sharpe' },
  { id: 'M6', label: 'M6 — Lowest drawdown' },
  { id: 'M7', label: 'M7 — Sector-relative return' },
  { id: 'M8', label: 'M8 — RSI reversal' },
  { id: 'M9', label: 'M9 — MACD crossover' },
  { id: 'M10', label: 'M10 — Volume spike' },
  { id: 'M11', label: 'M11 — 50-day MA breakout' },
  { id: 'M12', label: 'M12 — PE improvement' },
  { id: 'M13', label: 'M13 — Earnings surprise' },
  { id: 'M14', label: 'M14 — Revenue growth' },
  { id: 'M15', label: 'M15 — D/E improvement' },
];

export default function DuelInviteFormClient({ clanId }: { clanId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [clanBId, setClanBId] = useState('');
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(7);
  const [rosterSize, setRosterSize] = useState(15);
  const [stake, setStake] = useState(50);
  const [theme, setTheme] = useState('Technology');
  const [metric, setMetric] = useState('M1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/arena/duels/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clanAId: clanId,
          clanBId,
          durationDays,
          rosterSize,
          stakePerMember: stake,
          theme,
          metric,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not send invite.');
        setSubmitting(false);
        return;
      }
      push(`Invite sent — expires in 2h`, 'positive');
      router.refresh();
      setSubmitting(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="pv-eyebrow block mb-1">Opposing clan id</label>
        <input
          type="text"
          value={clanBId}
          onChange={(e) => setClanBId(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink font-mono text-body-sm"
          placeholder="paste clan id from /arena/clans"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="pv-eyebrow block mb-1">Duration</label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value) as 1 | 3 | 7)}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>
        </div>
        <div>
          <label className="pv-eyebrow block mb-1">Roster size</label>
          <input
            type="number"
            min={10}
            max={20}
            value={rosterSize}
            onChange={(e) => setRosterSize(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
          />
        </div>
        <div>
          <label className="pv-eyebrow block mb-1">Stake / member</label>
          <input
            type="number"
            min={10}
            max={100}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
          />
        </div>
        <div>
          <label className="pv-eyebrow block mb-1">Theme</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
            placeholder="Technology"
          />
        </div>
      </div>
      <div>
        <label className="pv-eyebrow block mb-1">Metric</label>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
        >
          {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      {error && <p className="text-body-sm text-negative">{error}</p>}
      <button type="submit" disabled={submitting || !clanBId} className="pv-btn-mark">
        {submitting ? 'Sending…' : 'Send invite (2h accept window)'}
      </button>
    </form>
  );
}