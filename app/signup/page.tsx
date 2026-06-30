'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CashSlider } from '@/components/CashSlider';
import { DEFAULT_PORTFOLIO_CASH_CAD } from '@/lib/constants';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [style, setStyle] = useState<'value' | 'growth' | 'balanced'>('balanced');
  const [startingCash, setStartingCash] = useState<number>(DEFAULT_PORTFOLIO_CASH_CAD);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setErr(null);
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    if (!ageConfirmed) {
      setErr('Please confirm you are 18 or older.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        investing_style: style,
        startingCash,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok || !data.ok) {
      setErr(data.error || 'Sign up failed.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="pv-card w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <svg viewBox="0 0 28 28" className="h-7 w-7 text-mark" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="6" fill="currentColor" />
            <path d="M8 18 L14 8 L20 18" stroke="#F7F7F4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-serif text-h3 text-ink">Paper Portfolio</span>
        </Link>
        <p className="pv-eyebrow mb-1">Start your 7-day free trial</p>
        <h1 className="font-serif text-h1 text-ink mb-2">Create your account</h1>
        <p className="text-body-sm text-graphite mb-6">Paper portfolios, plain-language signals, zero real money.</p>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-caption text-graphite mb-1">Email</label>
              <input className="pv-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-caption text-graphite mb-1">Password</label>
              <input className="pv-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              <p className="text-caption text-stone mt-1">Use 8+ characters. We never share it.</p>
            </div>
            <div>
              <label className="block text-caption text-graphite mb-1">Confirm password</label>
              <input className="pv-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {err && <p className="text-caption text-negative">{err}</p>}
            <button type="button" className="pv-btn-primary w-full" disabled={!email || !password} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="font-serif text-h3 text-ink">How would you describe your style?</p>
            <p className="text-body-sm text-graphite -mt-1">Pick the one that sounds most like you. You can change it later.</p>
            {([
              { value: 'value', label: 'Value', desc: 'I want to find companies that look cheaper than they should be.' },
              { value: 'balanced', label: 'Balanced', desc: 'A mix of value and growth. I am still figuring it out.' },
              { value: 'growth', label: 'Growth', desc: 'I am drawn to companies growing fast, even if they look pricey.' },
            ] as const).map((opt) => (
              <label key={opt.value} className={`block p-4 rounded-md border cursor-pointer ${style === opt.value ? 'border-mark bg-mark/5' : 'border-fog bg-bone'}`}>
                <input type="radio" name="style" value={opt.value} checked={style === opt.value} onChange={() => setStyle(opt.value)} className="sr-only" />
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-ink">{opt.label}</span>
                </div>
                <p className="text-body-sm text-graphite mt-1">{opt.desc}</p>
              </label>
            ))}
            {err && <p className="text-caption text-negative">{err}</p>}
            <div className="flex gap-2">
              <button type="button" className="pv-btn-ghost flex-1" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="pv-btn-primary flex-1" onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="font-serif text-h3 text-ink">Are you 18 or older?</p>
            <p className="text-body-sm text-graphite -mt-1">Paper Portfolio is built for adults. We do not collect any government ID.</p>
            <label className="flex items-start gap-2 p-3 rounded-md border border-fog cursor-pointer">
              <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="mt-1" />
              <span className="text-body-sm text-ink">Yes, I am 18 or older.</span>
            </label>
            {err && <p className="text-caption text-negative">{err}</p>}
            <div className="flex gap-2">
              <button type="button" className="pv-btn-ghost flex-1" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="pv-btn-primary flex-1" disabled={!ageConfirmed} onClick={() => setStep(4)}>
                Continue
              </button>
            </div>
            <p className="text-caption text-stone text-center pt-2">
              By creating an account you confirm Paper Portfolio is a learning tool, not investment advice, and never connects to any real brokerage.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="pv-eyebrow">Set your paper trading budget</p>
            <h2 className="font-serif text-h3 text-ink leading-tight">
              How much paper money do you want to start with?
            </h2>
            <p className="text-body-sm text-graphite -mt-1">
              This is your virtual bankroll. You can add more later by creating another portfolio. Min $50,000, max $1,000,000.
            </p>
            <CashSlider
              value={startingCash}
              onChange={setStartingCash}
              label="Starting cash"
              ariaLabel="Starting cash for your paper portfolio"
            />
            {err && <p className="text-caption text-negative">{err}</p>}
            <button
              type="button"
              className="pv-btn-primary w-full"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? 'Creating…' : 'Continue'}
            </button>
            <button
              type="button"
              className="text-caption text-graphite hover:text-mark transition-colors w-full text-center"
              onClick={submit}
              disabled={submitting}
            >
              Skip — use $100K default
            </button>
          </div>
        )}

        <p className="text-caption text-stone text-center mt-6">
          Already have an account? <Link href="/login" className="pv-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}