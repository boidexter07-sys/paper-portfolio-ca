// Altier Edge — V12 ConceptIntro component.
// Renders one of the two editorial concept headers that introduce an area
// before its card lands: "What's paper trading?" (calm, Build) or
// "What's the challenge?" (energetic, Play). Same editorial shape, opposite voice.
//
// V12 motion policy extended: Build intro has zero animation (study surface).
// Play intro's eyebrow pip is the first pulse on the page — the visual cue
// that the page is about to switch from calm to energetic mode. 1.4s pulse,
// same cadence as Play card and mid-CTA eyebrow.
//
// All copy strings are V12 verbatim from copy/t87-landing-muse-v12/landing-copy.md
// §2 (paper trading) and §4 (challenge). Banned phrases are absent. Brand split:
// "altier edge" wordmark does NOT appear in either intro (the wordmark lives in
// the conversion close and the footer per V11).

import React from 'react';

export type ConceptIntroVariant = 'paper-trading' | 'challenge';

const COPY: Record<ConceptIntroVariant, { eyebrow: string; headline: React.ReactNode; body: React.ReactNode }> = {
  // §2 — "What's paper trading?" (calm, Build)
  'paper-trading': {
    eyebrow: "WHAT'S PAPER TRADING?",
    headline: (
      <>
        Same market.{' '}
        <span className="v12-intro-headline-accent v12-build-accent">No real money.</span>
      </>
    ),
    body: (
      <>
        Paper trading means buying and selling real stocks with{' '}
        <em className="v12-build-accent">virtual money</em>. No broker, no account, no dollars at risk —
        just the same prices and the same moves, with room to make mistakes.
      </>
    ),
  },
  // §4 — "What's the challenge?" (energetic, Play)
  'challenge': {
    eyebrow: "WHAT'S THE CHALLENGE?",
    headline: (
      <>
        One game a day.{' '}
        <span className="v12-intro-headline-accent v12-play-accent">One leaderboard.</span>
      </>
    ),
    body: (
      <>
        The challenge is a <em className="v12-play-accent">daily game</em>. Pick a stock, lock your read
        before the bell, and see how you landed at the close. Climb the leaderboard against friends,
        your clan, or the whole field.
      </>
    ),
  },
};

export function ConceptIntro({ variant }: { variant: ConceptIntroVariant }) {
  const copy = COPY[variant];
  const isChallenge = variant === 'challenge';

  return (
    <div
      className={`v12-intro ${isChallenge ? 'v12-intro-play' : 'v12-intro-build'}`}
      aria-labelledby={`v12-intro-${variant}-eyebrow`}
    >
      <div className="v12-intro-eyebrow-row">
        {isChallenge ? (
          <span className="v12-intro-pip" aria-hidden="true" />
        ) : (
          <span className="v12-intro-rule" aria-hidden="true" />
        )}
        <span id={`v12-intro-${variant}-eyebrow`} className="v12-intro-eyebrow">
          {copy.eyebrow}
        </span>
      </div>

      <h3 className="v12-intro-headline">{copy.headline}</h3>

      <p className="v12-intro-body">{copy.body}</p>
    </div>
  );
}
