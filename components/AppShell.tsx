'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LandingPage } from './LandingPage';

type ShellUser = { id: string; email: string } | null;

const NAV = [
  { href: '/', label: 'Home', short: 'Home' },
  { href: '/discover', label: 'Discover', short: 'Discover' },
  { href: '/portfolio', label: 'Portfolio', short: 'Portfolio' },
  { href: '/learn', label: 'Learn', short: 'Learn' },
  { href: '/account', label: 'Account', short: 'Account' },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
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
        <div className="grid grid-cols-5">
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
            <Link href="/login" className="pv-btn-ghost text-body-sm">
              Log in
            </Link>
            <Link href="/signup" className="pv-btn-primary text-body-sm">
              Start your 7-day free trial
            </Link>
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
    case 'Account':
      return <svg viewBox="0 0 24 24" width={20} height={20}><circle cx="12" cy="8" r="4" {...stroke} /><path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" {...stroke} /></svg>;
    default:
      return null;
  }
}
