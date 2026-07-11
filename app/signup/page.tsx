'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    setSubmitting(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        investing_style: 'balanced',
        startingCash: 100000,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok || !data.ok) {
      setErr(data.error || 'Sign up failed.');
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
          Get started
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.05, color: '#F7F7F4', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Create your account
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
          Build a virtual portfolio. Track real stocks. Learn at your pace.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
            <p style={{ color: '#6B7280', fontSize: 12, marginTop: 4, marginBottom: 0 }}>
              Use 8+ characters. We never share it.
            </p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            type="button"
            disabled={submitting || !email || !password || !confirm}
            onClick={submit}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: submitting || !email || !password || !confirm ? '#374151' : '#FF6B6B',
              color: submitting || !email || !password || !confirm ? '#6B7280' : '#0E1A2B',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              borderRadius: 10,
              cursor: submitting || !email || !password || !confirm ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </div>

        <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#22D3EE', textDecoration: 'none', fontWeight: 600 }}>
            Log in
          </Link>
        </p>

        <p style={{ color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 16, marginBottom: 0, lineHeight: 1.4 }}>
          By creating an account you confirm Altier Edge is a learning tool, not investment advice, and never connects to any real brokerage.
        </p>
      </div>
    </div>
  );
}