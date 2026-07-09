// Altier Edge — V12 ParityLine component (Section 6).
// Single-line pill, two halves, accent split (cyan = Build, coral = Play),
// closing "Both free." in muted grey. The dropped V11 "Pick your rhythm.
// Both free." bridge between hero and Build card is repurposed here, below
// the cards, where the meta-choice actually makes sense — after both
// concept intros have explained each area.
//
// Visual cue: cyan accent on the first half, coral on the second. Same
// split pattern as the V11 trust-strip last line. No button, no card chrome —
// it's a connective line, not a CTA.
//
// Copy verbatim from copy/t87-landing-muse-v12/landing-copy.md §6.

import React from 'react';

export function ParityLine() {
  return (
    <div className="v12-parity-wrap" role="note" aria-label="Both areas are free">
      <span className="v12-parity-pill">
        <span className="v12-parity-build">Build it your way.</span>
        <span className="v12-parity-dot" aria-hidden="true" />
        <span className="v12-parity-play">Play it daily.</span>
        <span className="v12-parity-dot" aria-hidden="true" />
        <span className="v12-parity-both">Both free.</span>
      </span>
    </div>
  );
}
