'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export function MerchRedeemClient({
  itemKey,
  itemName,
  credits,
  canAfford,
}: {
  itemKey: string;
  itemName: string;
  credits: number;
  canAfford: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!canAfford) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/arena/merch/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        push(data?.error || 'Could not redeem.', 'negative');
        setSubmitting(false);
        return;
      }
      push(`Redemption request submitted: ${itemName}`, 'positive');
      router.refresh();
      setSubmitting(false);
    } catch {
      push('Network error', 'negative');
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!canAfford || submitting}
      className={`mt-3 ${canAfford ? 'pv-btn-mark' : 'pv-btn-ghost opacity-50 cursor-not-allowed'} text-body-sm w-full`}
    >
      {submitting ? 'Submitting…' : canAfford ? 'Redeem' : 'Not enough credits'}
    </button>
  );
}