// T42: ARENA challenges catalog — single source of truth for the
// 13 v1 challenges. Locked values from the task body (overrides the
// stale catalog values) + v2 spec for metrics.
//
// Reads of this table power the dashboard, the API, and the
// settlement scorer. Never duplicate these numbers elsewhere.

export type ChallengeKind =
  // Individual
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7'
  // Group
  | 'G1' | 'G2' | 'G3' | 'G4'
  // Clan Duel (special)
  | 'G7';

export type ChallengeBucket = 'individual' | 'group' | 'clan_duel';

export type ChallengeCategory =
  | 'direction'        // C1
  | 'range'            // C2
  | 'calibration'      // C3
  | 'basket'           // C4
  | 'event'            // C5
  | 'sector_contest'   // C6
  | 'milestone'        // C7
  | 'clan_benchmark'   // G1
  | 'clan_battle'      // G2
  | 'duel'             // G3
  | 'platform_boss'    // G4
  | 'clan_duel';       // G7

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type CatalogEntry = {
  kind: ChallengeKind;
  bucket: ChallengeBucket;
  category: ChallengeCategory;
  name: string;
  short_name: string;
  description: string;
  stake_free: number;
  stake_sub: number;
  multiplier: number;
  duration_days: number;
  duration_options?: number[];  // for C5 (1-7 range)
  difficulty: Difficulty;
  max_payout_free: number;
  max_payout_sub: number;
  // Visual identity — used by cards. Plain-language tone, no codenames.
  icon: string;            // emoji used on the card
  theme_color: 'sand' | 'moss' | 'ink' | 'rust' | 'plum';
  // Settlement cadence hint for the UI.
  settlement_label: string;
  // Optional metadata.
  notes?: string;
};

// Hard-locked catalog per task body. Numbers verified against
// /prism/arena_challenge_math_v3_summary.md for math traceability.
export const CATALOG: Record<ChallengeKind, CatalogEntry> = {
  // ---- Individual (C1-C7) ------------------------------------------
  C1: {
    kind: 'C1', bucket: 'individual', category: 'direction',
    name: 'Baseline Buster', short_name: 'Baseline Buster',
    description: 'Pick a stock, pick up or down. Closest thing to a coin flip — fastest resolution.',
    stake_free: 5, stake_sub: 12, multiplier: 1.67,
    duration_days: 1, difficulty: 'beginner',
    max_payout_free: Math.round(5 * 1.67 * 100) / 100,
    max_payout_sub: Math.round(12 * 1.67 * 100) / 100,
    icon: '⚡', theme_color: 'sand',
    settlement_label: 'Settles today at 4:05pm ET',
  },
  C2: {
    kind: 'C2', bucket: 'individual', category: 'range',
    name: 'Smart Money', short_name: 'Smart Money',
    description: 'Will the stock move inside or outside a ±2% band today?',
    stake_free: 5, stake_sub: 12, multiplier: 2.0,
    duration_days: 1, difficulty: 'beginner',
    max_payout_free: 5 * 2.0, max_payout_sub: 12 * 2.0,
    icon: '🎯', theme_color: 'sand',
    settlement_label: 'Settles today at 4:05pm ET',
  },
  C3: {
    kind: 'C3', bucket: 'individual', category: 'calibration',
    name: 'Sector Sleeve', short_name: 'Sector Sleeve',
    description: 'Guess the absolute % move of a stock. Closer guess = bigger payout.',
    stake_free: 5, stake_sub: 12, multiplier: 2.4,
    duration_days: 1, difficulty: 'intermediate',
    max_payout_free: 5 * 2.4, max_payout_sub: 12 * 2.4,
    icon: '📏', theme_color: 'moss',
    settlement_label: 'Settles today at 4:05pm ET',
  },
  C4: {
    kind: 'C4', bucket: 'individual', category: 'basket',
    name: 'PRISM Power', short_name: 'PRISM Power',
    description: 'Pick a 5-stock basket (Mega-cap / Tech / Financials / Energy / Consumer). Will it close up over 3 days?',
    stake_free: 15, stake_sub: 20, multiplier: 2.5,
    duration_days: 3, difficulty: 'intermediate',
    max_payout_free: 15 * 2.5, max_payout_sub: 20 * 2.5,
    icon: '🔮', theme_color: 'ink',
    settlement_label: 'Settles Wednesday 4:05pm ET',
  },
  C5: {
    kind: 'C5', bucket: 'individual', category: 'event',
    name: 'Long Shot', short_name: 'Long Shot',
    description: 'Predict whether a stock will beat or miss its next earnings consensus. Pick how many days.',
    stake_free: 15, stake_sub: 20, multiplier: 3.0,
    duration_days: 1, duration_options: [1, 2, 3, 4, 5, 6, 7],
    difficulty: 'advanced',
    max_payout_free: 15 * 3.0, max_payout_sub: 20 * 3.0,
    icon: '🎲', theme_color: 'rust',
    settlement_label: 'Settles at next earnings event',
    notes: 'Player picks 1-7 day window within range. Default 1 day.',
  },
  C6: {
    kind: 'C6', bucket: 'individual', category: 'sector_contest',
    name: 'Moonshot', short_name: 'Moonshot',
    description: 'Pick the sector that will have the highest % gain out of 11 GICS sectors by end of week.',
    stake_free: 25, stake_sub: 35, multiplier: 3.5,
    duration_days: 7, difficulty: 'advanced',
    max_payout_free: 25 * 3.5, max_payout_sub: 35 * 3.5,
    icon: '🚀', theme_color: 'rust',
    settlement_label: 'Settles Friday 4:05pm ET',
  },
  C7: {
    kind: 'C7', bucket: 'individual', category: 'milestone',
    name: 'Unicorn', short_name: 'Unicorn',
    description: 'Pick a stock and predict whether it will hit a new 52-week high or low within 7 days.',
    stake_free: 35, stake_sub: 35, multiplier: 4.5,
    duration_days: 7, difficulty: 'expert',
    max_payout_free: 35 * 4.5, max_payout_sub: 35 * 4.5,
    icon: '🦄', theme_color: 'plum',
    settlement_label: 'Daily check at 4:05pm ET — instant settle on hit',
  },

  // ---- Group (G1-G4) -----------------------------------------------
  G1: {
    kind: 'G1', bucket: 'group', category: 'clan_benchmark',
    name: 'Daily Clan', short_name: 'Daily Clan',
    description: 'Your clan vs the daily market close. Clan with best aggregate % pick wins.',
    stake_free: 5, stake_sub: 5, multiplier: 2.0,
    duration_days: 1, difficulty: 'beginner',
    max_payout_free: 5 * 2.0, max_payout_sub: 5 * 2.0,
    icon: '🏁', theme_color: 'moss',
    settlement_label: 'Settles today at 4:05pm ET',
    notes: '5 cr per member, no opponent needed (vs benchmark).',
  },
  G2: {
    kind: 'G2', bucket: 'group', category: 'clan_battle',
    name: 'Clan Battle 7d', short_name: 'Clan Battle',
    description: 'Two matched clans (within ±2 members) compete over 7 days. Highest aggregate wins.',
    stake_free: 5, stake_sub: 5, multiplier: 2.2,
    duration_days: 7, difficulty: 'intermediate',
    max_payout_free: 5 * 2.2, max_payout_sub: 5 * 2.2,
    icon: '🛡️', theme_color: 'ink',
    settlement_label: 'Settles Friday 4:05pm ET',
    notes: '5 cr per member, matchmaking opt-in.',
  },
  G3: {
    kind: 'G3', bucket: 'group', category: 'duel',
    name: '1v1 Duel', short_name: '1v1 Duel',
    description: 'Two players agree on terms and face off. Highest score wins.',
    stake_free: 10, stake_sub: 10, multiplier: 2.4,
    duration_days: 1, difficulty: 'intermediate',
    max_payout_free: 10 * 2.4, max_payout_sub: 10 * 2.4,
    icon: '🤝', theme_color: 'sand',
    settlement_label: 'Settles today at 4:05pm ET',
    notes: '10 cr per player, direct invite.',
  },
  G4: {
    kind: 'G4', bucket: 'group', category: 'platform_boss',
    name: 'Player vs Platform', short_name: 'Player vs Platform',
    description: 'Take on the platform\'s daily curated boss challenge. Win and unlock a bonus.',
    stake_free: 15, stake_sub: 15, multiplier: 2.4,
    duration_days: 1, difficulty: 'advanced',
    max_payout_free: 15 * 2.4, max_payout_sub: 15 * 2.4,
    icon: '👑', theme_color: 'rust',
    settlement_label: 'Settles today at 4:05pm ET',
    notes: '15 cr per player, daily rotating boss.',
  },

  // ---- Clan Duel (G7) ----------------------------------------------
  G7: {
    kind: 'G7', bucket: 'clan_duel', category: 'clan_duel',
    name: 'Clan Duel', short_name: 'Clan Duel',
    description: 'Two clans build independent hidden portfolios within a shared theme. Winning clan splits the loser side\'s stake minus a 5% platform rake.',
    stake_free: 50, stake_sub: 40, multiplier: 2.4,
    duration_days: 7, duration_options: [1, 3, 7],
    difficulty: 'expert',
    max_payout_free: 50 * 2.4, max_payout_sub: 40 * 2.4,
    icon: '⚔️', theme_color: 'plum',
    settlement_label: '8h pre-live + 1/3/7 days scoring',
    notes: 'Compressed timing: 2h accept / 4h build / 2h roster lock. Leader +20% bonus.',
  },
};

export const CATALOG_ORDER: ChallengeKind[] = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
  'G1', 'G2', 'G3', 'G4', 'G7',
];

export function getCatalogEntry(kind: string): CatalogEntry | null {
  if (!(kind in CATALOG)) return null;
  return CATALOG[kind as ChallengeKind];
}

export function stakeFor(kind: ChallengeKind, isSubscriber: boolean): number {
  const e = CATALOG[kind];
  return isSubscriber ? e.stake_sub : e.stake_free;
}

export function maxPayoutFor(kind: ChallengeKind, isSubscriber: boolean): number {
  const e = CATALOG[kind];
  return isSubscriber ? e.max_payout_sub : e.max_payout_free;
}

export function listIndividualChallenges(): CatalogEntry[] {
  return CATALOG_ORDER.filter((k) => CATALOG[k].bucket === 'individual').map((k) => CATALOG[k]);
}

export function listGroupChallenges(): CatalogEntry[] {
  return CATALOG_ORDER.filter((k) => CATALOG[k].bucket === 'group').map((k) => CATALOG[k]);
}

export function listClanDuelChallenges(): CatalogEntry[] {
  return CATALOG_ORDER.filter((k) => CATALOG[k].bucket === 'clan_duel').map((k) => CATALOG[k]);
}

export function listAllChallenges(): CatalogEntry[] {
  return CATALOG_ORDER.map((k) => CATALOG[k]);
}