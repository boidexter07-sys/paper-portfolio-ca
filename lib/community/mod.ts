// Moderator helpers — single source of truth for "is this user a mod",
// "write a mod-log row", and the mod-only API gate.
//
// The flag lives on the `users` table (`users.is_moderator`). First
// moderator (Muse) is backfilled at db init from MUSE_EMAIL or the
// locked default (Taha decision §13.3). Future mods are promoted by
// flipping the column directly — there's no UI for promotion in v1
// (Taha explicitly delegated that to a human ops action).

import { getDb } from '@/lib/db';
import { getCurrentUser, type User } from '@/lib/auth';

export type ModAction =
  | 'queue_approved'
  | 'queue_rejected'
  | 'queue_escalated'
  | 'post_unhidden'
  | 'post_auto_hidden_off_topic'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'pattern_3_30d'
  | 'escalation_3_90d';

export type ModTargetType = 'thread' | 'comment' | 'queue_item' | 'user' | null;

/**
 * Returns true if the user is a moderator. Reads `users.is_moderator`
 * directly. Use this in the server actions and the API routes — it's
 * the single check that gates mod-only paths.
 */
export function isModerator(userId: string): boolean {
  if (!userId) return false;
  const row = getDb()
    .prepare('SELECT is_moderator FROM users WHERE id = ?')
    .get(userId) as { is_moderator: number } | undefined;
  return !!row && row.is_moderator === 1;
}

/**
 * Convenience wrapper for server actions / API routes. Returns the
 * current user if they are a moderator, or null otherwise.
 */
export async function requireModerator(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return isModerator(user.id) ? user : null;
}

/**
 * Write an append-only row to community_mod_log. Every moderator
 * action calls this exactly once so the audit trail is complete.
 *
 * Failure to write the log is non-fatal (we still return success on the
 * primary action) but we surface the error in the console so a future
 * T39 mod UI can warn on missing-log rows.
 */
export function recordModAction(opts: {
  modUserId: string;
  action: ModAction;
  targetType?: ModTargetType;
  targetId?: string | null;
  context?: Record<string, unknown> | null;
}): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO community_mod_log
         (mod_user_id, action, target_type, target_id, context_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        opts.modUserId,
        opts.action,
        opts.targetType ?? null,
        opts.targetId ?? null,
        opts.context ? JSON.stringify(opts.context) : null,
        Date.now()
      );
  } catch (e) {
    // Don't throw — the primary action already succeeded. Log the
    // audit failure for the T39 mod UI to surface.
    // eslint-disable-next-line no-console
    console.error('[community_mod_log] failed to write audit row', {
      modUserId: opts.modUserId,
      action: opts.action,
      err: (e as Error).message,
    });
  }
}

/**
 * Cron-emitted rows (Layer 4 pattern detection, 3-in-90d escalation)
 * write to the same log table but are not user actions — the mod_user_id
 * is the SYSTEM sentinel. This is a const so the UI can render cron
 * rows distinctly from human mod actions.
 */
export const SYSTEM_MOD_USER_ID = 'system';
