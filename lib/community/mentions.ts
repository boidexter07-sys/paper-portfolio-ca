// Server-only mention resolver. Looks up @-tokens against the
// user_community table and returns the resolved user ids.
//
// Client components should import from mention-render.ts instead —
// this file pulls in better-sqlite3 via @/lib/db.

import { getDb } from '@/lib/db';
import { findMentionTokens, type MentionMatch } from './mention-render';

export { findMentionTokens, renderBodyWithMentions, type MentionMatch, type BodySegment } from './mention-render';

export function resolveMentions(body: string): MentionMatch[] {
  const tokens = findMentionTokens(body);
  if (tokens.length === 0) return [];

  const normalized = tokens.map((t) => t.raw.slice(1).toLowerCase());
  const db = getDb();
  const placeholders = normalized.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT user_id, display_name FROM user_community WHERE lower(display_name) IN (${placeholders})`
    )
    .all(...normalized) as { user_id: string; display_name: string }[];

  const byName = new Map<string, { user_id: string; display_name: string }>();
  for (const r of rows) byName.set(r.display_name.toLowerCase(), r);

  const out: MentionMatch[] = [];
  for (const t of tokens) {
    const key = t.raw.slice(1).toLowerCase();
    const hit = byName.get(key);
    if (hit) {
      out.push({
        raw: t.raw,
        userId: hit.user_id,
        displayName: hit.display_name,
        start: t.start,
        end: t.end,
      });
    }
  }
  return out;
}
