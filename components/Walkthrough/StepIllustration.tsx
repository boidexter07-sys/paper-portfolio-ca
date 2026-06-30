// T43: StepIllustration — a lightweight SVG mock per walkthrough
// step. The brief allows either real screenshots from the app or
// simple SVG mockups; for v1 these are simple ink+mark illustrations
// the size of a 16:9 card.
//
// Each illustration is a single SVG with a 16:9 viewBox so it slots
// into the step card with `aspect-video` and never reflows. The two
// colors are only the two brand ones (mark + ink); backgrounds are
// bone + fog so they pass WCAG AA even on the dimmest screens.

import type { WalkthroughStep } from '@/lib/walkthrough';

const stroke = { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
// Same shape minus the `fill` key — use when the element also has an
// explicit fill (so we don't trigger TypeScript's "fill specified twice"
// warning and the JSX is unambiguous about which value wins).
const strokeNoFill = { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function StepIllustration({ kind }: { kind: WalkthroughStep['illustration'] }) {
  return (
    <div
      className="w-full aspect-video rounded-md overflow-hidden bg-fog flex items-center justify-center"
      aria-hidden
    >
      {renderIllustration(kind)}
    </div>
  );
}

function renderIllustration(kind: WalkthroughStep['illustration']) {
  switch (kind) {
    case 'welcome':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill="#F7F7F4" />
          <circle cx="160" cy="78" r="36" fill="#FFFFFF" stroke="#0F1419" {...strokeNoFill} />
          <path d="M148 78 L156 70 L172 86" stroke="#7A5230" {...stroke} strokeWidth={2.4} />
          <rect x="80" y="130" width="160" height="8" rx="2" fill="#E8EAED" />
          <rect x="100" y="146" width="120" height="6" rx="2" fill="#E8EAED" />
        </svg>
      );
    case 'pick-challenge':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="180" fill="#F7F7F4" />
          {[0, 1, 2].map((row) => (
            <g key={row} transform={`translate(0, ${20 + row * 48})`}>
              <rect x="32" width="256" height="40" rx="6" fill="#FFFFFF" stroke="#E8EAED" />
              <circle cx="56" cy="20" r="10" fill="#7A5230" opacity={row === 0 ? '1' : '0.2'} />
              <rect x="80" y="12" width="120" height="6" rx="2" fill="#0F1419" opacity={row === 0 ? '0.8' : '0.2'} />
              <rect x="80" y="22" width="80" height="5" rx="2" fill="#3A424C" opacity={row === 0 ? '0.7' : '0.15'} />
            </g>
          ))}
        </svg>
      );
    case 'build-portfolio':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect width="320" height="180" fill="#F7F7F4" />
          <rect x="32" y="20" width="120" height="140" rx="8" fill="#FFFFFF" stroke="#E8EAED" />
          <rect x="40" y="32" width="56" height="6" rx="2" fill="#0F1419" />
          {[0, 1, 2].map((row) => (
            <g key={row} transform={`translate(40, ${52 + row * 32})`}>
              <rect width="104" height="22" rx="3" fill="#F7F7F4" />
              <circle cx="14" cy="11" r="7" fill="#E8EAED" />
              <rect x="28" y="8" width="60" height="5" rx="2" fill="#3A424C" />
            </g>
          ))}
          <line x1="180" y1="30" x2="280" y2="60" stroke="#7A5230" {...stroke} strokeDasharray="3 3" />
          <rect x="180" y="80" width="108" height="70" rx="6" fill="#FFFFFF" stroke="#7A5230" strokeWidth={1.4} />
          <rect x="190" y="92" width="40" height="5" rx="2" fill="#7A5230" />
          <rect x="190" y="106" width="80" height="4" rx="2" fill="#3A424C" />
          <rect x="190" y="116" width="60" height="4" rx="2" fill="#3A424C" />
        </svg>
      );
    case 'submit-track':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect width="320" height="180" fill="#F7F7F4" />
          <polyline points="32,140 70,110 110,124 150,80 190,98 230,60 270,72 290,52" fill="none" stroke="#7A5230" {...strokeNoFill} strokeWidth={2.2} />
          <circle cx="32" cy="140" r="3" fill="#7A5230" />
          <circle cx="70" cy="110" r="3" fill="#7A5230" />
          <circle cx="110" cy="124" r="3" fill="#7A5230" />
          <circle cx="150" cy="80" r="3" fill="#7A5230" />
          <circle cx="190" cy="98" r="3" fill="#7A5230" />
          <circle cx="230" cy="60" r="3" fill="#7A5230" />
          <circle cx="270" cy="72" r="3" fill="#7A5230" />
          <circle cx="290" cy="52" r="3" fill="#7A5230" />
        </svg>
      );
    case 'earn-credits':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect width="320" height="180" fill="#F7F7F4" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${40 + i * 60}, ${50 + (i % 2) * 18})`}>
              <circle cx="24" cy="24" r="24" fill="#FFFFFF" stroke="#7A5230" {...strokeNoFill} strokeWidth={1.6} />
              <circle cx="24" cy="24" r="14" fill="#7A5230" />
              <text x="24" y="28" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#FFFFFF">C</text>
            </g>
          ))}
          <rect x="40" y="120" width="240" height="32" rx="4" fill="#FFFFFF" stroke="#E8EAED" />
          <rect x="52" y="132" width="80" height="6" rx="2" fill="#0F1419" />
          <rect x="220" y="128" width="48" height="16" rx="8" fill="#7A5230" />
        </svg>
      );
    case 'spend-merch':
      return (
        <svg viewBox="0 0 320 180" width="100%" height="100%">
          <rect width="320" height="180" fill="#F7F7F4" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${44 + i * 80}, 30)`}>
              <rect width="68" height="90" rx="6" fill="#FFFFFF" stroke="#E8EAED" />
              <circle cx="34" cy="32" r="14" fill="#E8EAED" />
              <rect x="14" y="56" width="40" height="4" rx="2" fill="#3A424C" />
              <rect x="14" y="66" width="28" height="4" rx="2" fill="#3A424C" />
              <rect x="14" y="76" width="40" height="6" rx="2" fill="#7A5230" />
            </g>
          ))}
          <rect x="44" y="134" width="120" height="10" rx="4" fill="#7A5230" opacity="0.85" />
          <rect x="172" y="134" width="80" height="10" rx="4" fill="#E8EAED" />
        </svg>
      );
    default:
      return null;
  }
}
