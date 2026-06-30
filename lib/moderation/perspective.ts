// Perspective API client — Layer 2 of the moderation pipeline.
//
// We hit Google's Perspective API for the `TOXICITY`, `SEVERE_TOXICITY`,
// `IDENTITY_ATTACK`, `INSULT`, and `THREAT` attributes. If any score is
// above the configured threshold (0.8) the post is held for review.
//
// Fallback behavior: if the API times out (>800ms), 5xx's, or the
// PERSPECTIVE_API_KEY env var is missing, we resolve to `null` and the
// caller (scan.ts) downgrades the moderation decision to "keyword
// scan only". We never block publication solely because Perspective
// failed; the keyword pass is the floor of safety.
//
// In dev (no key) we resolve to null immediately so the forum remains
// usable for local development. The moderator queue shows the
// `scored_only_keyword` status so a real mod knows the toxicity score
// was unavailable.

export type PerspectiveAttribute =
  | 'TOXICITY'
  | 'SEVERE_TOXICITY'
  | 'IDENTITY_ATTACK'
  | 'INSULT'
  | 'THREAT'
  | 'PROFANITY'
  | 'SEXUALLY_EXPLICIT'
  | 'FLIRTATION';

export interface PerspectiveScore {
  attribute: PerspectiveAttribute;
  score: number; // 0..1
}

export interface PerspectiveResult {
  scores: PerspectiveScore[];
  // ms — how long the call took. Used for SRE; not in the queue UI.
  elapsedMs: number;
  // 'live' | 'failed' — when failed, scores are empty and the caller
  // should fall back to keyword scan only.
  status: 'live' | 'failed';
}

const PERSPECTIVE_ENDPOINT = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const REQUEST_TIMEOUT_MS = 800;

export const TOXICITY_THRESHOLD = 0.8;

const ATTRIBUTES_REQUESTED: PerspectiveAttribute[] = [
  'TOXICITY',
  'SEVERE_TOXICITY',
  'IDENTITY_ATTACK',
  'INSULT',
  'THREAT',
];

// Score a piece of text. Returns a result with status='failed' if the
// call could not complete; the caller should not treat this as a
// pass — it means "we don't know, fall back to keywords only".
export async function scoreText(text: string): Promise<PerspectiveResult> {
  const start = Date.now();
  const apiKey = process.env.PERSPECTIVE_API_KEY;

  if (!apiKey) {
    return { scores: [], elapsedMs: Date.now() - start, status: 'failed' };
  }
  if (!text || text.trim().length < 4) {
    // Too short to score; treat as clean.
    return { scores: [], elapsedMs: Date.now() - start, status: 'live' };
  }

  const body = {
    comment: { text },
    languages: ['en', 'fr'], // Canada is bilingual; en+fr covers it
    requestedAttributes: Object.fromEntries(
      ATTRIBUTES_REQUESTED.map((a) => [a, {}])
    ),
    // Don't store the request — we are a prototype.
    doNotStore: true,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${PERSPECTIVE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { scores: [], elapsedMs: Date.now() - start, status: 'failed' };
    }
    const json = (await res.json()) as {
      attributeScores?: Record<string, { summaryScore?: { value?: number } }>;
    };
    const scores: PerspectiveScore[] = [];
    for (const attr of ATTRIBUTES_REQUESTED) {
      const v = json.attributeScores?.[attr]?.summaryScore?.value;
      if (typeof v === 'number') {
        scores.push({ attribute: attr, score: v });
      }
    }
    return { scores, elapsedMs: Date.now() - start, status: 'live' };
  } catch {
    clearTimeout(timer);
    return { scores: [], elapsedMs: Date.now() - start, status: 'failed' };
  }
}

// Given a Perspective result, return the highest score, or null if the
// call failed / returned no scores. Used by scan.ts.
export function maxScore(result: PerspectiveResult): number | null {
  if (result.status !== 'live' || result.scores.length === 0) return null;
  return result.scores.reduce((m, s) => Math.max(m, s.score), 0);
}

// Given a Perspective result, return the names of the attributes that
// crossed the threshold. Empty array = nothing to flag.
export function overThreshold(result: PerspectiveResult): PerspectiveAttribute[] {
  if (result.status !== 'live') return [];
  return result.scores.filter((s) => s.score > TOXICITY_THRESHOLD).map((s) => s.attribute);
}
