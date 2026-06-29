import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { FirstSignalModal } from '@/components/FirstSignalModal';
import { TrialPaywall } from '@/components/TrialPaywall';
import { Footer } from '@/components/Footer';
import { ToastProvider } from '@/components/ToastProvider';
import { getCurrentUser } from '@/lib/auth';
import { getUserDaysIntoTrial } from '@/lib/trial';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Paper Portfolio Canada — Practice reading stocks with paper portfolios',
  description:
    'Paper Portfolio Canada is a learning tool for paper portfolios. Search 560 stocks, see plain-language signals, and practice trading with no real money. Nothing here is investment advice.',
  applicationName: 'Paper Portfolio Canada',
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const daysIntoTrial = user ? getUserDaysIntoTrial(user.created_at) : 0;
  const trialExpired = user ? daysIntoTrial >= 7 : false;
  const shellUser = user ? { id: user.id, email: user.email } : null;

  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <ToastProvider>
          <AppShell user={shellUser}>
            {children}
            <Footer />
          </AppShell>
          {user && <FirstSignalModal userId={user.id} initialAck={user.acknowledged_first_signal === 1} />}
          {user && <TrialPaywall userId={user.id} expired={trialExpired} daysIntoTrial={daysIntoTrial} />}
        </ToastProvider>
      </body>
    </html>
  );
}
