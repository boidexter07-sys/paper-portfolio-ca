// Community library: pure data + pure helpers. No JSX, no fetch — those
// live in the server actions and the page components.
//
// Re-exports live in ./index.ts; the call sites import:
//   import { listThreads, getThread, getCommentTree, ... } from '@/lib/community';

export type ThreadCategory = 'general' | 'market_commentary' | 'strategy' | 'clan_recruitment';

export const THREAD_CATEGORIES: { value: ThreadCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'Anything paper-portfolio related that doesn’t fit the others.' },
  { value: 'market_commentary', label: 'Market commentary', description: 'News, sentiment, sector calls — opinionated.' },
  { value: 'strategy', label: 'Strategy', description: 'How you’re playing the platform: rules, frameworks, lessons.' },
  { value: 'clan_recruitment', label: 'Clan recruitment', description: 'Looking for a circle, or recruiting for yours.' },
];

export function isValidCategory(c: string): c is ThreadCategory {
  return c === 'general' || c === 'market_commentary' || c === 'strategy' || c === 'clan_recruitment';
}

export const MAX_THREAD_TITLE = 140;
export const MAX_THREAD_BODY = 8000;
export const MAX_COMMENT_BODY = 4000;
export const REPORT_NOTE_MAX = 280;

// Reaction kinds. 6 total: 2 voting (upvote/downvote) + 4 emoji.
export type ReactionKind = 'upvote' | 'downvote' | 'clap' | 'fire' | 'mind_blown' | 'idea';

export const REACTION_KINDS: ReactionKind[] = ['upvote', 'downvote', 'clap', 'fire', 'mind_blown', 'idea'];

export const REACTION_EMOJI: Record<ReactionKind, string> = {
  upvote: '▲',
  downvote: '▼',
  clap: '👏',
  fire: '🔥',
  mind_blown: '🤯',
  idea: '💡',
};

export const REACTION_LABEL: Record<ReactionKind, string> = {
  upvote: 'Upvote',
  downvote: 'Downvote',
  clap: 'Clap',
  fire: 'Fire',
  mind_blown: 'Mind blown',
  idea: 'Idea',
};

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'misinformation' | 'off_topic' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Repetitive promotion, link-spam, bot-like behaviour.' },
  { value: 'harassment', label: 'Harassment', description: 'Targeted personal attacks, threats, doxxing.' },
  { value: 'hate', label: 'Hate', description: 'Slurs, identity attacks, dehumanising language.' },
  { value: 'misinformation', label: 'Misinformation', description: 'False claims about a stock, market, or platform feature.' },
  { value: 'off_topic', label: 'Off-topic', description: 'Not relevant to the category or the platform.' },
  { value: 'other', label: 'Other', description: 'Something else — please describe.' },
];

export function isValidReportReason(r: string): r is ReportReason {
  return ['spam', 'harassment', 'hate', 'misinformation', 'off_topic', 'other'].includes(r);
}
