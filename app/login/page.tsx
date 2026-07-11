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
    router.replace('/portfolio');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0E1A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#13243A', border: '1px solid #1F3552', borderRadius: 16, padding: '32px 28px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24, textDecoration: 'none' }}>
          <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: 8, background: '#FF6B6B' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F7F7F4', letterSpacing: '-0.01em' }}>altier edge</span>
        </Link>

        <p style={{ color: '#22D3EE', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Welcome back
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.05, color: '#F7F7F4', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Log in
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
          Pick up where you left off.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0E1A2B',
                border: '1px solid #1F3552',
                borderRadius: 8,
                color: '#F7F7F4',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#22D3EE'}
              onBlur={(e) => e.target.style.borderColor = '#1F3552'}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0E1A2B',
                border: '1px solid #1F3552',
                borderRadius: 8,
                color: '#F7F7F4',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#22D3EE'}
              onBlur={(e) => e.target.style.borderColor = '#1F3552'}
            />
          </div>
          {err && <p style={{ color: '#FF6B6B', fontSize: 13, margin: 0 }}>{err}</p>}
          <button
            type="submit"
            disabled={submitting || !email || !password}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: submitting || !email || !password ? '#374151' : '#FF6B6B',
              color: submitting || !email || !password ? '#6B7280' : '#0E1A2B',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              borderRadius: 10,
              cursor: submitting || !email || !password ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
          New here?{' '}
          <Link href="/signup" style={{ color: '#22D3EE', textDecoration: 'none', fontWeight: 600 }}>
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}