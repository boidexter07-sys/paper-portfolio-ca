// T43: client wrapper that mounts the WalkthroughHighlight overlay only
// when:
//   - the user is signed in (passed in by the server layout), AND
//   - the user hasn't completed the tour yet, AND
//   - the current pathname isn't one we want to exclude:
//     - /walkthrough/* — the user opted into the wizard explicitly
//     - /login, /signup, /logout — auth surface should stay bare
//
// Renders nothing when any of those conditions are false. The
// component is mounted once per session by app/layout.tsx so the
// highlight shows on first login on any page (per the T43 brief).

'use client';

import { usePathname } from 'next/navigation';
import { WalkthroughHighlight } from './Highlight';

interface Props {
  walkthroughCompletedAt: number | null;
  userId: string;
}

export function WalkthroughOverlayMount({ walkthroughCompletedAt, userId }: Props) {
  const pathname = usePathname() || '/';
  // Don't show on the wizard pages — users there are already on the
  // guided experience and a competing overlay would be confusing.
  if (pathname.startsWith('/walkthrough')) return null;
  if (pathname === '/login' || pathname === '/signup' || pathname === '/logout') return null;
  if (walkthroughCompletedAt != null) return null;

  // Mount the overlay. Wrapping in a key by userId remounts cleanly
  // if the session changes (e.g. logout/login).
  return <WalkthroughHighlight key={userId} />;
}
