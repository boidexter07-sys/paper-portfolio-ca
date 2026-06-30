// T43: /walkthrough — the interactive wizard index.
//
// The "wizard" is really just a redirect to step 1 — the per-step URLs
// are /walkthrough/[step]. We redirect server-side so the URL bar
// shows a real, shareable step on first arrival.

import { redirect } from 'next/navigation';
import { WALKTHROUGH_STEPS } from '@/lib/walkthrough';

export default function WalkthroughIndexPage() {
  redirect(`/walkthrough/${WALKTHROUGH_STEPS[0].key}`);
}
