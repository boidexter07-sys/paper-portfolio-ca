// /arena/clans/new — clan creation form (client component for live validation).

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

export default function NewClanPage() {
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarColor, setAvatarColor] = useState<'sand' | 'moss' | 'ink' | 'rust' | 'plum'>('sand');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/arena/clans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description, avatarColor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not create clan.');
        setSubmitting(false);
        return;
      }
      push(`Clan created: ${name}`, 'positive');
      router.push(`/arena/clan/${data.clanId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-readable">
      <header className="mb-4">
        <p className="pv-eyebrow">Create a new clan</p>
        <h1 className="font-serif text-h1 text-ink">New clan</h1>
        <p className="text-body text-graphite mt-1">
          Pick a name (3–30 characters). You&apos;ll be the leader and the first member.
        </p>
      </header>

      <form onSubmit={onSubmit} className="pv-card p-4 sm:p-5 space-y-4">
        <div>
          <label htmlFor="clan-name" className="pv-eyebrow block mb-1">Name</label>
          <input
            id="clan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={30}
            required
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
            placeholder="The Bulls"
          />
        </div>

        <div>
          <label htmlFor="clan-desc" className="pv-eyebrow block mb-1">Description (optional)</label>
          <textarea
            id="clan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
            placeholder="What this clan is about"
          />
        </div>

        <div>
          <p className="pv-eyebrow mb-2">Avatar color</p>
          <div className="flex gap-2 flex-wrap">
            {(['sand', 'moss', 'ink', 'rust', 'plum'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                className={`px-3 py-1.5 rounded-md text-body-sm border ${avatarColor === c ? 'border-mark bg-fog' : 'border-fog bg-bone'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-body-sm text-negative">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="pv-btn-mark">
            {submitting ? 'Creating…' : 'Create clan'}
          </button>
          <Link href="/arena?tab=clan" className="pv-btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}