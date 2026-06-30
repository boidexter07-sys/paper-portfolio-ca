// Pure mention token-finding + body renderer. No DB calls, no Node
// imports — safe to import from client components.
//
// The DB-resolving function (resolveMentions) lives in resolve.ts
// because it pulls in better-sqlite3, which is server-only.

export interface MentionMatch {
  // The raw @-token as it appears in the body, e.g. "@sam k."
  raw: string;
  // The matched user's id.
  userId: string;
  // The canonical display name (as stored).
  displayName: string;
  // Offset into the body (for highlighting in v2; not used in v1).
  start: number;
  end: number;
}

const MAX_MENTION_LENGTH = 40;

// Hand-rolled mention token finder. Rationale lives in resolve.ts;
// this file is the pure side of the parser that any component can use.
export function findMentionTokens(body: string): { raw: string; start: number; end: number }[] {
  const out: { raw: string; start: number; end: number }[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '@' && (i === 0 || /[\s(\[\{"',;:!?]/.test(body[i - 1]))) {
      let j = i + 1;
      while (j < body.length && j - i <= MAX_MENTION_LENGTH) {
        const c = body[j];
        if (/\s/.test(c) || c === ',' || c === ';') break;
        j++;
      }
      if (j > i + 1) {
        const raw = body.slice(i, j);
        if (!seen.has(raw.toLowerCase())) {
          seen.add(raw.toLowerCase());
          out.push({ raw, start: i, end: j });
        }
        i = j;
        continue;
      }
    }
    i++;
  }
  return out;
}

export type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; raw: string; userId: string; displayName: string };

// Render a body with @mentions replaced by a clickable span. Returns
// a list of segments (plain + mention) the React component can iterate.
export function renderBodyWithMentions(body: string, matches: MentionMatch[]): BodySegment[] {
  if (matches.length === 0) return [{ kind: 'text', text: body }];
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const segments: BodySegment[] = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.start > cursor) segments.push({ kind: 'text', text: body.slice(cursor, m.start) });
    segments.push({ kind: 'mention', raw: m.raw, userId: m.userId, displayName: m.displayName });
    cursor = m.end;
  }
  if (cursor < body.length) segments.push({ kind: 'text', text: body.slice(cursor) });
  return segments;
}
