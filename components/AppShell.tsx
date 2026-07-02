'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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

// Persistent numbered left rail — only renders on the homepage.
// Maps the 8 sections to a 7-item rail (hero doesn't carry a rail item).
const RAIL = [
  { id: 'd3-hero',        num: '01', name: 'Hero' },
  { id: 'd3-method',      num: '02', name: 'Method' },
  { id: 'd3-score',       num: '03', name: 'Score a stock' },
  { id: 'd3-credentials', num: '04', name: 'Credentials' },
  { id: 'd3-mechanic',    num: '05', name: 'ARENA — Mechanic' },
  { id: 'd3-rank',        num: '06', name: 'ARENA — Rank' },
  { id: 'd3-trial',       num: '07', name: 'Get started' },
  { id: 'd3-footer',      num: '08', name: 'Footer' },
];

export function AppShell({ user, hasClan, children }: ShellProps) {
  const pathname = usePathname() || '/';

  // Auth pages render bare — no shell chrome.
  if (pathname === '/login' || pathname === '/signup' || pathname === '/logout') {
    return <div className="min-h-screen" style={{ background: 'var(--d3-void)' }}>{children}</div>;
  }

  if (!user) {
    if (pathname === '/') return <UnauthLayout>{children}</UnauthLayout>;
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return <div className="p-12 text-center" style={{ color: 'var(--d3-ink-muted)' }}>Redirecting to log in…</div>;
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const showClanNav = !!hasClan;
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen" style={{ background: 'var(--d3-void)', color: 'var(--d3-ink)' }}>
      <D3Nav user={user} isActive={isActive} showClanNav={showClanNav} />
      {isHome && <NumberedRail />}
      <main className="flex-1 min-w-0" style={{ paddingTop: 0 }}>
        {children}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------
   D3 Sticky Top Bar — locked from task body §1 + d3-tokens.json.
   Desktop (>=1024px): brand wordmark LEFT (serif lowercase + tagline),
   nav links CENTER, "Start free" CTA FAR RIGHT (no brackets).
   Mobile (<1024px): wordmark LEFT, hamburger RIGHT; side drawer from RIGHT.
   ------------------------------------------------------------------ */

function D3Nav({
  user,
  isActive,
  showClanNav,
}: {
  user: { id: string; email: string };
  isActive: (href: string) => boolean;
  showClanNav: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() || '/';

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
    <>
      <header className="d3-nav" role="banner">
        <div className="d3-nav-inner">
          {/* Brand wordmark LEFT — Source Serif 4 700 lowercase + tagline mono uppercase */}
          <Link href="/" className="d3-nav-brand" aria-label="Altier Edge home">
            <span className="d3-nav-brand-name">altier edge</span>
            <span className="d3-nav-brand-tag">THE INVESTING PRACTICE FIELD</span>
          </Link>

          {/* Desktop nav links — Center/Right */}
          <nav className="d3-nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`hidden lg:inline-block ${isActive(n.href) ? 'is-active' : ''}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster — CTA + account + user chip + hamburger */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden md:inline d3-mono" style={{ fontSize: 11, color: 'var(--d3-ink-faint)' }}>
              {user.email}
            </span>
            <Link
              href="/account"
              className="d3-btn-ghost hidden lg:inline-flex"
              style={{ padding: '8px 14px', fontSize: 11 }}
            >
              Account
            </Link>
            <Link href="/signup" className="d3-nav-cta d3-nav-cta-desktop">
             Start free
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="d3-nav-burger"
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div
            className="d3-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="d3-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="d3-drawer-header">
              <Link href="/" className="d3-nav-brand" onClick={() => setDrawerOpen(false)}>
                <span className="d3-nav-brand-name">altier edge</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="d3-drawer-close"
              >
                × Close
              </button>
            </div>
            <nav className="d3-drawer-links" aria-label="Mobile primary">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setDrawerOpen(false)}
                  className={isActive(n.href) ? 'is-active' : ''}
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setDrawerOpen(false)}>
                Account
              </Link>
            </nav>
            <div className="d3-drawer-cta">
              <Link href="/signup" className="d3-btn d3-btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Start free
              </Link>
              <p className="d3-mono" style={{ fontSize: 10, color: 'var(--d3-ink-faint)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 16, textAlign: 'center' }}>
                Free to play · No card · Close any time
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   Numbered Rail — fixed left edge. IntersectionObserver marks active.
   Only mounted when this component renders (homepage).
   ------------------------------------------------------------------ */
function NumberedRail() {
  const [active, setActive] = useState<string>('d3-hero');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = RAIL
      .map((r) => document.getElementById(r.id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the visible target closest to viewport center.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0].target.id;
        setActive(id);
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="d3-rail" aria-label="Section navigation">
      {RAIL.map((r) => (
        <div key={r.id} className={`d3-rail-item ${active === r.id ? 'is-active' : ''}`}>
          <span className="d3-rail-num">{r.num}</span>
          <span className="d3-rail-name">{r.name}</span>
        </div>
      ))}
    </aside>
  );
}

/* ------------------------------------------------------------------
   Unauthenticated layout — D3 nav for logged-out users (homepage only).
   ------------------------------------------------------------------ */
function UnauthLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() || '/';
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const isHome = pathname === '/';

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--d3-void)', color: 'var(--d3-ink)' }}>
      <header className="d3-nav">
        <div className="d3-nav-inner">
          <Link href="/" className="d3-nav-brand" aria-label="Altier Edge home">
            <span className="d3-nav-brand-name">altier edge</span>
            <span className="d3-nav-brand-tag">THE INVESTING PRACTICE FIELD</span>
          </Link>
          <nav className="d3-nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`hidden lg:inline-block ${isActive(n.href) ? 'is-active' : ''}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="d3-btn-ghost hidden lg:inline-flex"
              style={{ padding: '8px 14px', fontSize: 11 }}
            >
              Log in
            </Link>
            <Link href="/signup" className="d3-nav-cta d3-nav-cta-desktop">
             Start free
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="d3-nav-burger"
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {isHome && <NumberedRail />}

      {drawerOpen && (
        <>
          <div
            className="d3-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="d3-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="d3-drawer-header">
              <Link href="/" className="d3-nav-brand" onClick={() => setDrawerOpen(false)}>
                <span className="d3-nav-brand-name">altier edge</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="d3-drawer-close"
              >
                × Close
              </button>
            </div>
            <nav className="d3-drawer-links" aria-label="Mobile primary">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setDrawerOpen(false)}
                  className={isActive(n.href) ? 'is-active' : ''}
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setDrawerOpen(false)}>
                Log in
              </Link>
            </nav>
            <div className="d3-drawer-cta">
              <Link href="/signup" className="d3-btn d3-btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Start free
              </Link>
              <p className="d3-mono" style={{ fontSize: 10, color: 'var(--d3-ink-faint)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 16, textAlign: 'center' }}>
                Free to play · No card · Close any time
              </p>
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
