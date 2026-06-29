'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok || !data.ok) {
      setErr(data.error || 'Could not log in.');
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
        <p className="pv-eyebrow mb-1">Welcome back</p>
        <h1 className="font-serif text-h1 text-ink mb-2">Log in</h1>
        <p className="text-body-sm text-graphite mb-6">Pick up where you left off.</p>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="block text-caption text-graphite mb-1">Email</label>
            <input className="pv-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-caption text-graphite mb-1">Password</label>
            <input className="pv-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p className="text-caption text-negative">{err}</p>}
          <button type="submit" className="pv-btn-primary w-full" disabled={submitting || !email || !password}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-caption text-stone text-center mt-6">
          New here? <Link href="/signup" className="pv-link">Start a free trial</Link>
        </p>
        <p className="text-caption text-stone text-center mt-2">
          Demo login: <span className="pv-num">demo@paperportfolio.ca</span> / <span className="pv-num">password123</span>
        </p>
      </div>
    </div>
  );
}
