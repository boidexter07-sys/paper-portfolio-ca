// T43: client-side helpers for the in-app walkthrough overlay.
//
// We re-export WALKTHROUGH_STEPS from lib/walkthrough so the highlight
// component stays self-contained, and we expose
// `markWalkthroughCompleteClient()` which POSTs to
// /api/walkthrough/complete without throwing on network errors.

export { WALKTHROUGH_STEPS } from '@/lib/walkthrough';

/** POST /api/walkthrough/complete — client variant. Best-effort. */
export async function markWalkthroughCompleteClient(): Promise<void> {
  try {
    await fetch('/api/walkthrough/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
  } catch {
    // Swallow network errors silently — the user explicitly opted out of
    // the tour and shouldn't see a toast for what is effectively an
    // analytics write. The next login will reset their state.
  }
}
