'use client';

import { useState, useTransition } from 'react';
import { setInvestingStyleAction } from '@/app/actions';

const OPTIONS: { value: 'value' | 'growth' | 'balanced'; label: string; desc: string }[] = [
  { value: 'value', label: 'Value', desc: 'I want to find companies that look cheaper than they should be.' },
  { value: 'balanced', label: 'Balanced', desc: 'A mix of value and growth. I am still figuring it out.' },
  { value: 'growth', label: 'Growth', desc: 'I am drawn to companies growing fast, even if they look pricey.' },
];

export function StylePicker({ current }: { current: 'value' | 'growth' | 'balanced' }) {
  const [style, setStyle] = useState(current);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(s: 'value' | 'growth' | 'balanced') {
    setStyle(s);
    setSaved(false);
    const fd = new FormData();
    fd.set('style', s);
    startTransition(async () => {
      await setInvestingStyleAction(fd);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-2">
      {OPTIONS.map((opt) => (
        <label key={opt.value} className={`block p-3 rounded-md border cursor-pointer ${style === opt.value ? 'border-mark bg-mark/5' : 'border-fog bg-bone'}`}>
          <input type="radio" name="style" value={opt.value} checked={style === opt.value} onChange={() => save(opt.value)} className="sr-only" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-ink">{opt.label}</span>
            {style === opt.value && <span className="text-caption text-mark">Selected</span>}
          </div>
          <p className="text-body-sm text-graphite mt-1">{opt.desc}</p>
        </label>
      ))}
      <p className="text-caption text-stone mt-1">
        {pending ? 'Saving…' : saved ? 'Saved.' : ''}
      </p>
    </div>
  );
}
