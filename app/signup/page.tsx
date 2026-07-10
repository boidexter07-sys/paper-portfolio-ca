'use client';

import Link from 'next/link';

// Sign up — placeholder page.
// Sign-up is being upgraded. The old SQLite form is gone. New auth (Clerk + Resend)
// ships in a follow-up release. Until then, this page does not accept input.

export default function SignupPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0E1A2B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#13243A',
          border: '1px solid #1F3552',
          borderRadius: 16,
          padding: '32px 28px',
        }}
      >
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24, textDecoration: 'none' }}>
          <span
            style={{
              display: 'inline-block',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#FF6B6B',
            }}
          />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F7F7F4', letterSpacing: '-0.01em' }}>altier edge</span>
        </Link>

        <p
          style={{
            color: '#22D3EE',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Create your account
        </p>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.05,
            color: '#F7F7F4',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          Sign-up is being upgraded.
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
          We&rsquo;re moving to a real authentication provider. The previous demo flow is offline. New accounts open shortly.
        </p>

        <div
          style={{
            background: '#0E1A2B',
            border: '1px solid #1F3552',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <p style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            <span style={{ color: '#FF6B6B', fontWeight: 600 }}>For friends testing the link:</span> you can browse the marketing landing and the public portfolio preview right now. Account creation opens once the new sign-up ships.
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: 'block',
            textAlign: 'center',
            background: '#FF6B6B',
            color: '#0E1A2B',
            fontSize: 15,
            fontWeight: 700,
            padding: '14px 20px',
            borderRadius: 10,
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          Back to landing
        </Link>

        <p style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#22D3EE', textDecoration: 'none', fontWeight: 600 }}>
            See sign-in status
          </Link>
        </p>
      </div>
    </div>
  );
}