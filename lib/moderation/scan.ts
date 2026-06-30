// Moderation scan orchestrator — combines Layers 1, 2, 5 of the v1
// moderation pipeline. Layer 3 (reports) and Layer 4 (pattern-detection
// auto-suspend) live elsewhere; Layer 6 (clan immunity) is enforced by
// simply not adding any clan-based exemptions here.
//
// Returns a ModerationDecision that the caller (the createThread /
// createComment server actions) uses to:
//   - decide whether to publish or hold
//   - record the queue row context
//   - tell the user the right inline message
//
// The decision is one of:
//   'publish'             — content goes live
//   'hold_keyword'        — Layer 1 hit; queued
//   'hold_toxicity'       — Layer 2 hit; queued
//   'hold_cooldown'       — Layer 5 (new-user); queued
//   'hold_keyword_and_toxicity' — both layers hit; queued (priority++)
//   'hold_scored_keyword_only' — Perspective failed, keyword hit; queued
//
// Why is everything "hold" rather than "reject"? Because the v1 spec
// has no mod UI yet, and we'd rather queue too much than silently drop
// user content. v2 can add a "auto-reject" mode for high-confidence
// matches once we have a mod team and tuning data.

import { findKeywordHit, findDoxxingHit, findPhishingHit, type KeywordEntry } from './keywords';
import { maxScore, overThreshold, scoreText, type PerspectiveAttribute } from './perspective';

export type ModerationDecision =
  | 'publish'
  | 'hold_keyword'
  | 'hold_toxicity'
  | 'hold_cooldown'
  | 'hold_keyword_and_toxicity'
  | 'hold_scored_keyword_only';

export interface ModerationContext {
  // The matched keyword entry, if any. Used to populate the queue row.
  keywordHit?: KeywordEntry;
  // The matched doxxing pattern, if any. Doxxing is high-severity —
  // we hold the post and surface this in the queue.
  doxxingHit?: { description: string; match: string };
  // The matched phishing pattern, if any.
  phishingHit?: { description: string; match: string };
  // The Perspective scores, if we got them.
  perspectiveScores?: { attribute: PerspectiveAttribute; score: number }[];
  // Highest toxicity score, or null if Perspective failed.
  toxicityScore: number | null;
  // The list of attributes that crossed the threshold.
  overThreshold: PerspectiveAttribute[];
  // Whether the user is in the 24h new-user cooldown window.
  isNewUser: boolean;
  // Whether the user is currently suspended.
  isSuspended: boolean;
}

export interface ModerationOutcome {
  decision: ModerationDecision;
  context: ModerationContext;
  // Human-readable inline message for the author. Always safe to show.
  userMessage: string;
  // Queue priority: 0 (low) .. 100 (high). Used to order the mod
  // dashboard (when it exists in v2).
  priority: number;
}

const MAX_BODY_LENGTH = 8000; // matches the v1 spec
const MAX_BODY_FOR_SCAN = 4000; // Perspective charges per char; cap it

export interface ScanInputs {
  text: string;
  // The author's user.created_at (ms). Used to decide Layer 5 cooldown.
  authorCreatedAt: number;
  // The author's current suspension status. Resolved by the caller
  // (we don't take a DB handle here).
  isSuspended: boolean;
  // The author is a moderator? If true, skip Layers 1, 2, 5.
  isModerator: boolean;
}

export async function scanContent(input: ScanInputs): Promise<ModerationOutcome> {
  const { text, authorCreatedAt, isSuspended, isModerator } = input;
  const trimmed = (text || '').slice(0, MAX_BODY_LENGTH);
  const now = Date.now();

  // If the author is a moderator, skip the pre-publish layers entirely.
  // Reports (Layer 3) and pattern detection (Layer 4) still apply.
  if (isModerator) {
    return {
      decision: 'publish',
      context: { toxicityScore: null, overThreshold: [], isNewUser: false, isSuspended },
      userMessage: 'Posted.',
      priority: 0,
    };
  }

  // Suspended users cannot post at all — short-circuit.
  if (isSuspended) {
    return {
      decision: 'hold_cooldown', // re-use the field; caller checks isSuspended
      context: { toxicityScore: null, overThreshold: [], isNewUser: false, isSuspended: true },
      userMessage: 'Your account is currently suspended. You can read existing discussions but new posts are paused.',
      priority: 100,
    };
  }

  // Layer 1: keyword scan (synchronous, no IO)
  const keywordHit = findKeywordHit(trimmed);
  const doxxingHit = findDoxxingHit(trimmed);
  const phishingHit = findPhishingHit(trimmed);

  // Layer 5: new-user cooldown. 24h since signup.
  const isNewUser = now - authorCreatedAt < 24 * 60 * 60 * 1000;

  // Layer 2: Perspective (async, with timeout fallback)
  const scanText = trimmed.slice(0, MAX_BODY_FOR_SCAN);
  const perspective = await scoreText(scanText);
  const perspectiveScores = perspective.scores;
  const topToxicity = maxScore(perspective);
  const over = overThreshold(perspective);

  const context: ModerationContext = {
    keywordHit: keywordHit || undefined,
    doxxingHit: doxxingHit || undefined,
    phishingHit: phishingHit || undefined,
    perspectiveScores: perspectiveScores.length > 0 ? perspectiveScores : undefined,
    toxicityScore: topToxicity,
    overThreshold: over,
    isNewUser,
    isSuspended: false,
  };

  // Doxxing is always a hold, regardless of other signals.
  // Phishing is always a hold.
  const hasHardHit = !!doxxingHit || !!phishingHit;
  const hasKeyword = !!keywordHit;
  const hasToxicity = over.length > 0;
  const cooldown = isNewUser;

  let decision: ModerationDecision;
  let userMessage: string;
  let priority: number;

  if (hasHardHit) {
    decision = hasToxicity ? 'hold_keyword_and_toxicity' : 'hold_keyword';
    userMessage = 'Your post is under review. A moderator will check it shortly.';
    priority = 90;
  } else if (hasKeyword && hasToxicity) {
    decision = 'hold_keyword_and_toxicity';
    userMessage = 'Your post is under review. A moderator will check it shortly.';
    priority = 70;
  } else if (hasKeyword) {
    if (topToxicity === null) {
      // Keyword hit but Perspective failed — degraded mode.
      decision = 'hold_scored_keyword_only';
      userMessage = 'Your post is under review (auto-scan in degraded mode). A moderator will check it shortly.';
      priority = 50;
    } else {
      decision = 'hold_keyword';
      userMessage = 'Your post is under review. A moderator will check it shortly.';
      priority = 50;
    }
  } else if (hasToxicity) {
    decision = 'hold_toxicity';
    userMessage = 'Your post is under review. A moderator will check it shortly.';
    priority = 40;
  } else if (cooldown) {
    decision = 'hold_cooldown';
    userMessage = 'You’re new here — your first 24 hours of posts are reviewed by a moderator. After that, posts go live automatically.';
    priority = 10;
  } else {
    decision = 'publish';
    userMessage = 'Posted.';
    priority = 0;
  }

  return { decision, context, userMessage, priority };
}

// Build the JSON we stash in moderation_queue.context_json. Redacts
// literal slurs; everything else is safe to surface in the mod UI.
export function queueContextFor(o: ModerationOutcome): string {
  const ctx = o.context;
  return JSON.stringify({
    decision: o.decision,
    priority: o.priority,
    keyword: ctx.keywordHit
      ? {
          category: ctx.keywordHit.category,
          // Use the mask if present, else the phrase. The mask is the
          // safe-for-UI variant for slurs.
          display: ctx.keywordHit.maskForReview ?? ctx.keywordHit.phrase,
        }
      : null,
    doxxing: ctx.doxxingHit ?? null,
    phishing: ctx.phishingHit ?? null,
    perspective: ctx.perspectiveScores ?? null,
    toxicityScore: ctx.toxicityScore,
    isNewUser: ctx.isNewUser,
  });
}
