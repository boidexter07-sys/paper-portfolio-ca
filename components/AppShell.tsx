'use client';

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
  { href: '/', label: 'Home', short: 'Home', walkTarget: 'discover-link' },
  { href: '/discover', label: 'Discover', short: 'Discover', walkTarget: 'discover-link' },
  { href: '/portfolio', label: 'Portfolio', short: 'Portfolio', walkTarget: 'portfolio-link' },
  { href: '/learn', label: 'Learn', short: 'Learn', walkTarget: null },
  { href: '/guide', label: 'Guide', short: 'Guide', walkTarget: null },
  { href: '/account', label: 'Account', short: 'Account', walkTarget: null },
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
      <header className="sticky top-0 z-30 bg-bone/90 backdrop-blur border-b border-fog">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-mark" />
            <span className="font-serif text-h4 text-ink">Paper Portfolio</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-caption text-stone">
            <span className="pv-eyebrow">Learning tool</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="hidden sm:inline text-caption text-stone">{user.email}</span>
            <Link href="/account" className="pv-btn-ghost text-body-sm">Account</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex">
        <aside className="hidden md:block w-56 shrink-0 py-6 pr-4">
          <nav className="sticky top-20 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                data-walk-target={n.walkTarget ?? undefined}
                className={`block px-3 py-2 rounded-md text-body-sm transition-colors ${
                  isActive(n.href) ? 'bg-fog text-ink font-medium' : 'text-graphite hover:bg-fog'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-fog">
              <Link
                href="/community"
                className={`block px-3 py-2 rounded-md text-body-sm transition-colors ${
                  isActive('/community') ? 'bg-fog text-ink font-medium' : 'text-graphite hover:bg-fog'
                }`}
              >
                Community
              </Link>
              {showClanNav && (
                <Link
                  href="/arena"
                  className={`block px-3 py-2 rounded-md text-body-sm transition-colors ${
                    isActive('/arena') ? 'bg-fog text-ink font-medium' : 'text-graphite hover:bg-fog'
                  }`}
                >
                  Clan Challenges
                </Link>
              )}
            </div>
            <div className="pt-4 text-caption text-stone px-3">
              Paper trading only.<br />Nothing is investment advice.
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bone border-t border-fog">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center justify-center py-2 text-caption ${
                isActive(n.href) ? 'text-mark' : 'text-graphite'
              }`}
            >
              <NavIcon name={n.short} active={isActive(n.href)} />
              <span className="mt-0.5">{n.short}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function UnauthHome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-fog bg-bone sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-mark" />
            <span className="font-serif text-h4 text-ink">Paper Portfolio</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* T29: added whitespace-nowrap so the two buttons never break
                onto two lines when the viewport tightens. Also shortened
                the CTA copy so both fit comfortably at 1280px and 375px.
                The `pv-btn-primary` class sets `display: inline-flex`
                which beats Tailwind's `.hidden` utility at the same
                specificity (CSS source order). So we wrap each Link in
                a `<span>` that owns the responsive visibility — the
                span's `.hidden` rule applies cleanly, and the Link's
                `.pv-btn-primary` styling is untouched. */}
            <Link href="/login" className="pv-btn-ghost text-body-sm whitespace-nowrap">
              Log in
            </Link>
            <span className="hidden sm:inline-flex">
              <Link
                href="/signup"
                className="pv-btn-primary text-body-sm whitespace-nowrap"
              >
                Start free trial
              </Link>
            </span>
            <span className="inline-flex sm:hidden">
              <Link
                href="/signup"
                className="pv-btn-primary text-body-sm whitespace-nowrap"
              >
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <LandingPage />
        {children}
      </main>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-label="Paper Portfolio logo">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="currentColor" />
      <path d="M8 18 L14 8 L20 18" stroke="#F7F7F4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 18 L14 13 L17 18" stroke="#F7F7F4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#7A5230' : '#3A424C';
  const stroke = { stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (name) {
    case 'Home':
      return <svg viewBox="0 0 24 24" width={20} height={20}><path d="M3 11 L12 4 L21 11 V20 H15 V14 H9 V20 H3 Z" {...stroke} /></svg>;
    case 'Discover':
      return <svg viewBox="0 0 24 24" width={20} height={20}><circle cx="11" cy="11" r="6" {...stroke} /><path d="M16 16 L21 21" {...stroke} /></svg>;
    case 'Portfolio':
      return <svg viewBox="0 0 24 24" width={20} height={20}><path d="M4 8 H20 V20 H4 Z" {...stroke} /><path d="M9 8 V5 H15 V8" {...stroke} /></svg>;
    case 'Learn':
      return <svg viewBox="0 0 24 24" width={20} height={20}><path d="M4 5 H20 V19 H4 Z" {...stroke} /><path d="M4 5 L12 11 L20 5" {...stroke} /></svg>;
    case 'Guide':
      return <svg viewBox="0 0 24 24" width={20} height={20}><circle cx="12" cy="12" r="9" {...stroke} /><path d="M15 9 L11 11 L9 15 L13 13 Z" {...stroke} /></svg>;
    case 'Account':
      return <svg viewBox="0 0 24 24" width={20} height={20}><circle cx="12" cy="8" r="4" {...stroke} /><path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" {...stroke} /></svg>;
    default:
      return null;
  }
}
