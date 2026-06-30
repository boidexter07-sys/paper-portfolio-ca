// T43: ARENA walkthrough \u2014 server-only DB helpers.
//
// Kept in lib/walkthrough.server.ts (not lib/walkthrough.ts) so client
// components can `import { WALKTHROUGH_STEPS } from '@/lib/walkthrough'`
// without dragging better-sqlite3 / node:fs into the browser bundle.
// Next.js enforces the `.server.ts` convention: anything matching the
// pattern is excluded from client builds.

import 'server-only';
import { getDb } from './db';

/**
 * Mark the walkthrough as completed for the given user. Idempotent \u2014
 * re-running it just refreshes the timestamp.
 */
export function markWalkthroughComplete(userId: string): number {
  const ts = Date.now();
  getDb()
    .prepare('UPDATE users SET walkthrough_completed_at = ? WHERE id = ?')
    .run(ts, userId);
  return ts;
}

/**
 * Reset the walkthrough. Used by the "Restart walkthrough" button in
 * /account \u2014 clears the timestamp so the next login mounts the
 * WalkthroughHighlight overlay again.
 */
export function resetWalkthrough(userId: string): void {
  getDb()
    .prepare('UPDATE users SET walkthrough_completed_at = NULL WHERE id = ?')
    .run(userId);
}
