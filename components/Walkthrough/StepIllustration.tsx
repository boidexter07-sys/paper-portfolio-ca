// T43: StepIllustration — lightweight ink+signal SVG mock per walkthrough
// step. D2-aligned: ink on bone, signal orange (#FF3B00) reserved for
// the action element on each step. 16:9 viewBox so it slots into the
// step card with `aspect-video` and never reflows.
//
// Illustration kinds are locked from copy/muse-guided-tour.md and
// declared in lib/walkthrough.ts: account-setup, run-prism, watchlist,
// enter-challenge, leaderboard, claim-merch, find-learn, follow-clan.

import type { WalkthroughStep } from '@/lib/walkthrough';

const INK = '#0A0A0A';
const PAPER = '#FAFAF7';
const FOG = '#ECECE7';
const RULE = '#D5D3CC';
const SIGNAL = '#FF3B00';
const SECONDARY = '#555550';
const stroke = { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const strokeNoFill = { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function StepIllustration({ kind }: { kind: WalkthroughStep['illustration'] }) {
  return (
    <div
      className="w-full aspect-video overflow-hidden bg-paper flex items-center justify-center"
      aria-hidden
    >
      {renderIllustration(kind)}
    </div>
  );
}

function renderIllustration(kind: WalkthroughStep['illustration']) {
  switch (kind) {
    case 'account-setup':
      // form mock — input rows + signal CTA
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <rect x="40" y="24" width="240" height="132" stroke={INK} strokeWidth={2} fill="none" />
          <rect x="56" y="40" width="80" height="6" fill={INK} />
          <rect x="56" y="56" width="208" height="14" stroke={RULE} strokeWidth={1} fill="none" />
          <rect x="56" y="78" width="60" height="6" fill={INK} />
          <rect x="56" y="94" width="208" height="14" stroke={RULE} strokeWidth={1} fill="none" />
          <rect x="56" y="120" width="72" height="20" fill={SIGNAL} />
          <rect x="64" y="128" width="56" height="4" fill={PAPER} />
        </svg>
      );
    case 'run-prism':
      // PRISM card mock — 5-layer mono table with signal score numeral
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <rect x="32" y="20" width="256" height="140" stroke={INK} strokeWidth={2} fill="none" />
          <text x="48" y="40" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={INK}>SHOP.TO</text>
          <text x="248" y="40" fontFamily="JetBrains Mono, monospace" fontSize="13" fill={SIGNAL}>74 / 100</text>
          <line x1="48" y1="52" x2="272" y2="52" stroke={INK} strokeWidth={1} />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1="48" y1={68 + i * 16} x2="272" y2={68 + i * 16} stroke={RULE} strokeWidth={1} />
              <text x="48" y={66 + i * 16} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={SECONDARY}>L · 0{i + 1}</text>
              <text x="240" y={66 + i * 16} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={INK}>72</text>
            </g>
          ))}
          <line x1="48" y1="148" x2="272" y2="148" stroke={INK} strokeWidth={1} />
        </svg>
      );
    case 'watchlist':
      // watchlist rows with ticker + score + signal star
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          {['SHOP.TO', 'RY.TO', 'ENB.TO', 'AAPL'].map((t, i) => (
            <g key={t} transform={`translate(0, ${20 + i * 32})`}>
              <line x1="32" y1="28" x2="288" y2="28" stroke={RULE} strokeWidth={1} />
              <text x="40" y="20" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={INK}>{t}</text>
              <text x="200" y="20" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={SECONDARY}>PRISM</text>
              <text x="260" y="20" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={SIGNAL}>{[74, 71, 58, 46][i]}</text>
            </g>
          ))}
          <line x1="32" y1="148" x2="288" y2="148" stroke={INK} strokeWidth={1} />
        </svg>
      );
    case 'enter-challenge':
      // challenge card with stake input + signal CTA
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <rect x="32" y="24" width="256" height="132" stroke={INK} strokeWidth={2} fill="none" />
          <text x="48" y="46" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={SECONDARY}>[ ROOKIE · C1 ]</text>
          <text x="48" y="64" fontFamily="JetBrains Mono, monospace" fontSize="13" fill={INK}>BASELINE BUSTER</text>
          <text x="48" y="86" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={SECONDARY}>3D · PRISM DELTA</text>
          <text x="48" y="110" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={INK}>STAKE 5</text>
          <rect x="180" y="120" width="92" height="22" fill={SIGNAL} />
          <text x="194" y="135" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={PAPER}>[ ENTER ]</text>
        </svg>
      );
    case 'leaderboard':
      // anonymized leaderboard with PRISM delta + signal on positive
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <text x="32" y="24" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={SECONDARY}>[ ARENA — RANK · LAST 7D ]</text>
          <line x1="32" y1="32" x2="288" y2="32" stroke={INK} strokeWidth={1} />
          {[
            { rank: '01', id: 'M-2914', delta: '+12', pl: '+18.4%' },
            { rank: '02', id: 'Q-1102', delta: '+8', pl: '+12.1%' },
            { rank: '03', id: 'A-7743', delta: '+5', pl: '+9.7%' },
            { rank: '04', id: 'K-0029', delta: '-3', pl: '+1.8%' },
          ].map((r, i) => (
            <g key={r.id} transform={`translate(0, ${44 + i * 26})`}>
              <text x="40" y="14" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={INK}>{r.rank}</text>
              <text x="80" y="14" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={INK}>{r.id}</text>
              <text x="180" y="14" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={SIGNAL}>{r.delta}</text>
              <text x="240" y="14" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={INK}>{r.pl}</text>
              <line x1="32" y1="22" x2="288" y2="22" stroke={RULE} strokeWidth={1} />
            </g>
          ))}
        </svg>
      );
    case 'claim-merch':
      // merch catalog cards with signal item highlighted
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${36 + i * 86}, 28)`}>
              <rect x="0" y="0" width="76" height="92" stroke={i === 0 ? SIGNAL : INK} strokeWidth={i === 0 ? 2 : 1} fill="none" />
              <rect x="14" y="14" width="48" height="32" fill={i === 0 ? SIGNAL : FOG} />
              <rect x="14" y="56" width="48" height="4" fill={INK} />
              <rect x="14" y="64" width="32" height="4" fill={SECONDARY} />
              <rect x="14" y="76" width="20" height="6" fill={INK} />
            </g>
          ))}
          <text x="36" y="148" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={SECONDARY}>[ MERCH ]</text>
        </svg>
      );
    case 'find-learn':
      // learn article card mock — title + body + read CTA
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <rect x="32" y="24" width="256" height="132" stroke={INK} strokeWidth={2} fill="none" />
          <text x="48" y="44" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={SECONDARY}>[ LEARN · ARTICLE 01 ]</text>
          <text x="48" y="64" fontFamily="JetBrains Mono, monospace" fontSize="14" fill={INK}>WHAT IS A STOCK, REALLY?</text>
          <rect x="48" y="78" width="220" height="4" fill={INK} />
          <rect x="48" y="88" width="200" height="4" fill={SECONDARY} />
          <rect x="48" y="98" width="180" height="4" fill={SECONDARY} />
          <rect x="48" y="108" width="190" height="4" fill={SECONDARY} />
          <rect x="48" y="128" width="68" height="16" fill="none" stroke={INK} strokeWidth={1.5} />
          <text x="56" y="139" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={INK}>[ READ ]</text>
        </svg>
      );
    case 'follow-clan':
      // clan card mock — clan name + roster + join CTA
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill={PAPER} />
          <rect x="32" y="24" width="256" height="132" stroke={INK} strokeWidth={2} fill="none" />
          <text x="48" y="44" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={SECONDARY}>[ CLAN · 7 MEMBERS ]</text>
          <text x="48" y="64" fontFamily="JetBrains Mono, monospace" fontSize="14" fill={INK}>NORTHFIELD</text>
          <rect x="48" y="78" width="220" height="4" fill={INK} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${48 + i * 72}, 96)`}>
              <rect x="0" y="0" width="60" height="24" stroke={RULE} strokeWidth={1} fill="none" />
              <text x="6" y="14" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={INK}>M-2914</text>
            </g>
          ))}
          <rect x="48" y="128" width="68" height="16" fill={SIGNAL} />
          <text x="56" y="139" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={PAPER}>[ JOIN ]</text>
        </svg>
      );
    default:
      return null;
  }
}