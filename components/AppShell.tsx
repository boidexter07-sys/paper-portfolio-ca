'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LandingPage } from './LandingPage';
import { NotificationBell } from './Community/NotificationBell';

type ShellUser = { id: string; email: string } | null;
type ShellProps = {
  user: ShellUser;
  /** True if the user is a member of at least one clan. Drives the
   *  "Clan Challenges" nav visibility per task body — visible only
   *  to clan members. */
  hasClan?: boolean;
  children: React.ReactNode;
};

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/learn', label: 'Learn' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/community', label: 'Community' },
  { href: '/arena', label: 'ARENA' },
];

export function AppShell({ user, hasClan, children }: ShellProps) {
  const pathname = usePathname() || '/';

  // Auth pages render bare — no shell chrome.
  if (pathname === '/login' || pathname === '/signup' || pathname === '/logout') {
    return <div className="min-h-screen bg-paper">{children}</div>;
  }

  if (!user) {
    if (pathname === '/') return <UnauthHome>{children}</UnauthHome>;
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return <div className="p-12 text-center text-stone">Redirecting to log in…</div>;
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const showClanNav = !!hasClan;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <D2Nav user={user} isActive={isActive} showClanNav={showClanNav} />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------
   D2 Top-bar Nav — locked from muse-section-copy.md §nav-persistent.
   Desktop (>=1024px): brand wordmark LEFT, links CENTER/RIGHT, CTA FAR RIGHT.
   Mobile (<1024px): brand LEFT, hamburger RIGHT. Tap → side drawer from RIGHT.
   ------------------------------------------------------------------ */

function D2Nav({
  user,
  isActive,
  showClanNav,
}: {
  user: { id: string; email: string };
  isActive: (href: string) => boolean;
  showClanNav: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [usePathname()]);

  return (
    <>
      <header className="d2-nav" role="banner">
        <div className="d2-nav-inner">
          {/* Brand wordmark LEFT — JetBrains Mono Medium 18px + tagline 12px UPPERCASE letter-spaced +0.08em color #555550 */}
          <Link href="/" className="d2-wordmark" aria-label="Altier Edge home">
            <span className="d2-wordmark-mark">altier edge</span>
            <span className="d2-wordmark-tag">THE INVESTING PRACTICE FIELD</span>
          </Link>

          {/* Desktop nav links CENTER/RIGHT */}
          <nav className="d2-nav-links" aria-label="Primary">
            <Link
              href="/"
              className={`d2-nav-link ${isActive('/') && pathnameExact('/') ? 'is-active' : ''} hidden lg:inline-block`}
            >
              Home
            </Link>
            <Link
              href="/discover"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/discover') ? 'is-active' : ''}`}
            >
              Discover
            </Link>
            <Link
              href="/learn"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/learn') ? 'is-active' : ''}`}
            >
              Learn
            </Link>
            <Link
              href="/portfolio"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/portfolio') ? 'is-active' : ''}`}
            >
              Portfolio
            </Link>
            <Link
              href="/community"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/community') ? 'is-active' : ''}`}
            >
              Community
            </Link>
            <Link
              href="/arena"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/arena') ? 'is-active' : ''}`}
            >
              ARENA
            </Link>
          </nav>

          {/* Right cluster — CTA + user chip + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden md:inline d2-micro">{user.email}</span>
            <Link
              href="/account"
              className="hidden lg:inline-flex pv-btn-ghost"
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              Account
            </Link>
            <Link href="/signup" className="d2-cta hidden lg:inline-flex">
              [ Start free trial ]
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden d2-cta"
              aria-label="Open menu"
              style={{ padding: '8px 12px' }}
            >
              ≡
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="d2-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="d2-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="d2-drawer-header">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="d2-cta"
                style={{ padding: '6px 10px' }}
              >
                ×
              </button>
            </div>
            <nav aria-label="Mobile primary">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`d2-drawer-link ${isActive(n.href) ? 'is-active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/account"
                className="d2-drawer-link"
                onClick={() => setDrawerOpen(false)}
              >
                Account
              </Link>
            </nav>
            <div className="d2-drawer-cta">
              <Link href="/signup" className="d2-cta-filled w-full justify-center">
                [ Start free trial ]
              </Link>
              <p className="d2-micro mt-3 text-center" style={{ color: 'var(--d2-text-tertiary)' }}>
                {user.email}
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// Pathname equality helper (avoids pulling usePathname twice in AppShell scope)
function pathnameExact(href: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === href;
}

function UnauthHome({ children }: { children: React.ReactNode }) {
  return <UnauthD2Layout>{children}</UnauthD2Layout>;
}

/* ------------------------------------------------------------------
   Unauthenticated landing layout — D2 nav for logged-out users.
   ------------------------------------------------------------------ */
function UnauthD2Layout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() || '/';
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="d2-nav">
        <div className="d2-nav-inner">
          <Link href="/" className="d2-wordmark" aria-label="Altier Edge home">
            <span className="d2-wordmark-mark">altier edge</span>
            <span className="d2-wordmark-tag">THE INVESTING PRACTICE FIELD</span>
          </Link>
          <nav className="d2-nav-links" aria-label="Primary">
            <Link href="/" className={`d2-nav-link hidden lg:inline-block ${pathname === '/' ? 'is-active' : ''}`}>
              Home
            </Link>
            <Link
              href="/discover"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/discover') ? 'is-active' : ''}`}
            >
              Discover
            </Link>
            <Link
              href="/learn"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/learn') ? 'is-active' : ''}`}
            >
              Learn
            </Link>
            <Link
              href="/portfolio"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/portfolio') ? 'is-active' : ''}`}
            >
              Portfolio
            </Link>
            <Link
              href="/community"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/community') ? 'is-active' : ''}`}
            >
              Community
            </Link>
            <Link
              href="/arena"
              className={`d2-nav-link hidden lg:inline-block ${isActive('/arena') ? 'is-active' : ''}`}
            >
              ARENA
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden lg:inline-flex pv-btn-ghost"
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              Log in
            </Link>
            <Link href="/signup" className="d2-cta hidden lg:inline-flex">
              [ Start free trial ]
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden d2-cta"
              aria-label="Open menu"
              style={{ padding: '8px 12px' }}
            >
              ≡
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div
            className="d2-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="d2-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="d2-drawer-header">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="d2-cta"
                style={{ padding: '6px 10px' }}
              >
                ×
              </button>
            </div>
            <nav aria-label="Mobile primary">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`d2-drawer-link ${isActive(n.href) ? 'is-active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/login" className="d2-drawer-link" onClick={() => setDrawerOpen(false)}>
                Log in
              </Link>
            </nav>
            <div className="d2-drawer-cta">
              <Link href="/signup" className="d2-cta-filled w-full justify-center">
                [ Start free trial ]
              </Link>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}