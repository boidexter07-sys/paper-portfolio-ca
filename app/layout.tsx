import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { FirstSignalModal } from '@/components/FirstSignalModal';
import { TrialPaywall } from '@/components/TrialPaywall';
import { Footer } from '@/components/Footer';
import { ToastProvider } from '@/components/ToastProvider';
import { WalkthroughOverlayMount } from '@/components/Walkthrough/WalkthroughOverlayMount';
import { getCurrentUser } from '@/lib/auth';
import { getUserDaysIntoTrial } from '@/lib/trial';
import { listUserClans } from '@/lib/arena/clans';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Altier Edge — The investing practice field',
  description:
    'Altier Edge is a Canadian-built practice field for investors. PRISM scores every stock 0 to 100. ARENA runs paper-trading competitions on top. No real money. Credits, not cash.',
  applicationName: 'Altier Edge',
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const daysIntoTrial = user ? getUserDaysIntoTrial(user.created_at) : 0;
  const trialExpired = user ? daysIntoTrial >= 7 : false;
  const shellUser = user ? { id: user.id, email: user.email } : null;
  const hasClan = user ? listUserClans(user.id).length > 0 : false;

  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${sourceSerif.variable}`}>
      <body className="font-sans">
        <ToastProvider>
          <AppShell user={shellUser} hasClan={hasClan}>
            {children}
            <Footer />
          </AppShell>
          {user && <FirstSignalModal userId={user.id} initialAck={user.acknowledged_first_signal === 1} />}
          {user && <TrialPaywall userId={user.id} expired={trialExpired} daysIntoTrial={daysIntoTrial} />}
          {user && (
            <WalkthroughOverlayMount
              userId={user.id}
              walkthroughCompletedAt={user.walkthrough_completed_at}
            />
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
