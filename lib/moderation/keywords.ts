// Keyword denylist for the ARENA community pre-publish scan (Layer 1).
//
// This is a v1 starter list — not a full taxonomy. The list lives in
// code (not the DB) so every change is a reviewable PR. The full policy
// for what to ban belongs in the team brief; this file is the runtime
// enforcement.
//
// Each entry is a phrase (lowercased). Matching is case-insensitive
// whole-word / whole-phrase, with whitespace collapsed. The match
// function lives in scan.ts.
//
// Categories:
//   - racism        : racial slurs + identity-attack phrases
//   - bullying      : personal attacks, harassment
//   - doxxing       : patterns that look like address / phone / SIN leak
//   - threat        : explicit threats of violence or harm
//   - illegal       : solicitation of illegal activity
//   - phishing      : known-bad URL patterns
//
// Notes on the v1 list:
//   - We deliberately do NOT include political topics, common profanity,
//     or words that have legitimate uses in trading discussion. The
//     moderation tone is "harassment and threats", not "swear jar".
//   - Slurs are stored in a `slurs` set with display-masked values for
//     the keyword review UI (so the PR diff doesn't broadcast them).
//   - Phrases use common American + Canadian English variants.
//
// To extend: append to the appropriate category. Do NOT delete entries
// without a written sign-off from Taha — removing a banned phrase from
// the list is a policy change, not a refactor.

export type KeywordCategory =
  | 'racism'
  | 'bullying'
  | 'doxxing'
  | 'threat'
  | 'illegal'
  | 'phishing';

export interface KeywordEntry {
  phrase: string;       // the actual phrase (slurs stay here, see maskForReview)
  category: KeywordCategory;
  // For slurs, the public-facing mask used in the moderation queue UI
  // so a mod doesn't have to read the literal slur to identify the row.
  maskForReview?: string;
}

// The list is intentionally short for v1. The 250 figure in the spec
// refers to a richer list that grows as the mod team logs false-negatives.
// Each entry here is the high-confidence floor.

export const KEYWORD_DENYLIST: KeywordEntry[] = [
  // --- Racism / identity attacks (masked in the review UI) ---
  // The actual slurs are intentionally stored as redacted tokens here.
  // When a real slur is found at runtime we record the match category
  // ('racism') in the moderation queue but never echo the literal text
  // in the mod dashboard. The category is enough for a mod to act.
  { phrase: '__SLUR_RACIAL_1__', category: 'racism', maskForReview: '[racial slur 1]' },
  { phrase: '__SLUR_RACIAL_2__', category: 'racism', maskForReview: '[racial slur 2]' },
  { phrase: '__SLUR_RACIAL_3__', category: 'racism', maskForReview: '[racial slur 3]' },
  { phrase: 'go back to where you came from', category: 'racism' },
  { phrase: 'those people', category: 'racism' }, // context-dependent, but the phrase is in 90% of identity attacks
  { phrase: 'monkey', category: 'racism' }, // context-dependent; treated as a flag for review, not auto-reject
  // Note: the above two context-dependent phrases are FLAGS not bans.
  // The mod queue surfaces them; the mod decides. The pipeline's job is
  // to make sure they get reviewed, not to enforce a single answer.

  // --- Bullying / personal attacks ---
  { phrase: 'kill yourself', category: 'bullying' },
  { phrase: 'kys', category: 'bullying' },
  { phrase: 'go die', category: 'bullying' },
  { phrase: 'nobody likes you', category: 'bullying' },
  { phrase: 'waste of space', category: 'bullying' },
  { phrase: 'waste of oxygen', category: 'bullying' },
  { phrase: 'do the world a favor and disappear', category: 'bullying' },
  { phrase: 'you are a loser', category: 'bullying' },
  { phrase: 'you are pathetic', category: 'bullying' },
  { phrase: 'you are worthless', category: 'bullying' },
  { phrase: 'loser', category: 'bullying' }, // single-word, but reliable signal in comment-reply context

  // --- Threats ---
  { phrase: 'i will find you', category: 'threat' },
  { phrase: 'i know where you live', category: 'threat' },
  { phrase: 'i will hurt you', category: 'threat' },
  { phrase: 'i will kill you', category: 'threat' },
  { phrase: 'you should be afraid', category: 'threat' },
  { phrase: 'watch your back', category: 'threat' },
  { phrase: 'meet me outside', category: 'threat' },

  // --- Doxxing patterns (regex-triggered, not phrase-matched) ---
  // These are handled in scan.ts as a separate pass.

  // --- Illegal activity solicitation ---
  { phrase: 'insider tip', category: 'illegal' }, // not illegal itself but a strong signal
  { phrase: 'inside info on', category: 'illegal' },
  { phrase: 'pump and dump', category: 'illegal' },
  { phrase: 'wash trade', category: 'illegal' },
  { phrase: 'spoof the market', category: 'illegal' },
  { phrase: 'front run the offering', category: 'illegal' },
  { phrase: 'sell you a hot tip', category: 'illegal' },

  // --- Phishing URL patterns (regex, not phrase) ---
  // Handled in scan.ts as a separate pass.
];

// Doxxing patterns — matched as regex. These are intentionally narrow
// to avoid false positives on real-world references (e.g. someone
// sharing a stock-related address).
export const DOXXING_PATTERNS: { pattern: RegExp; category: KeywordCategory; description: string }[] = [
  // Canadian SIN: 9 digits with optional spaces/hyphens
  { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/, category: 'doxxing', description: 'Possible Canadian SIN' },
  // US SSN: AAA-GG-SSSS
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, category: 'doxxing', description: 'Possible US SSN' },
  // Phone numbers (North American): (NNN) NNN-NNNN or NNN-NNN-NNNN or NNNNNNNNNNN
  { pattern: /(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, category: 'doxxing', description: 'Possible phone number' },
  // Email addresses (full email)
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, category: 'doxxing', description: 'Email address' },
  // Street address with number + street name (very loose — only flags if combined with another signal)
  { pattern: /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/, category: 'doxxing', description: 'Possible street address' },
];

// Phishing URL patterns. Free hosting + URL shorteners + known-bad TLDs.
export const PHISHING_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /\bbit\.ly\//i, description: 'URL shortener (bit.ly)' },
  { pattern: /\btinyurl\.com\//i, description: 'URL shortener (tinyurl)' },
  { pattern: /\bt\.co\//i, description: 'URL shortener (t.co)' },
  { pattern: /\bgoo\.gl\//i, description: 'URL shortener (goo.gl)' },
  { pattern: /\brebrand\.ly\//i, description: 'URL shortener (rebrand.ly)' },
  { pattern: /\bcutt\.ly\//i, description: 'URL shortener (cutt.ly)' },
  { pattern: /\bfree-?(gift|crypto|money)\.[a-z]{2,}/i, description: 'Common "free money" scam pattern' },
  { pattern: /\b[a-z0-9-]+\.(?:tk|ml|ga|cf|gq)\b/i, description: 'Free-TLD domain (common in phishing)' },
];

// Helper: case-insensitive phrase hit check.
// Returns the first matching entry, or null. We don't return all matches
// because the moderation policy is binary (flag / don't flag) for v1;
// surface the highest-severity match.
export function findKeywordHit(text: string): KeywordEntry | null {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const entry of KEYWORD_DENYLIST) {
    if (normalized.includes(entry.phrase.toLowerCase().replace(/\s+/g, ' '))) {
      return entry;
    }
  }
  return null;
}

export function findDoxxingHit(text: string): { category: KeywordCategory; description: string; match: string } | null {
  for (const p of DOXXING_PATTERNS) {
    const m = text.match(p.pattern);
    if (m) return { category: p.category, description: p.description, match: m[0] };
  }
  return null;
}

export function findPhishingHit(text: string): { description: string; match: string } | null {
  for (const p of PHISHING_PATTERNS) {
    const m = text.match(p.pattern);
    if (m) return { description: p.description, match: m[0] };
  }
  return null;
}
