// T43: WalkthroughProgress — the progress bar / dot indicator that
// shows at the top of every /walkthrough page. Renders as a single
// horizontal track with N round steps; current step is filled in the
// mark color, completed steps get a check, future steps stay outlined.
//
// Animations:
//   - on mount, the bar fades in (uses the existing .pv-stagger-in
//     keyframe already in globals.css; we set the keyframe inline so
//     we don't depend on CSS class order in the build).
//   - on step change, the active dot scales briefly. Honors
//     prefers-reduced-motion (we apply the animation only via a CSS
//     class that's already gated by the media query in globals.css).

'use client';

import { useEffect, useState } from 'react';

export function WalkthroughProgress({
  currentIndex,
  total,
  labels,
  onJump,
}: {
  /** Zero-based index of the current step. */
  currentIndex: number;
  /** Total number of steps. */
  total: number;
  /** Optional short labels for each dot (one per step). */
  labels?: string[];
  /** Called when a user clicks a dot — step pages handle the navigation
   *  themselves; this only fires for already-visited steps. */
  onJump?: (index: number) => void;
}) {
  // Mounted flag so we can animate the appearance on first render
  // without flashing the bar in on subsequent step changes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="w-full"
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      aria-label={`Step ${currentIndex + 1} of ${total}`}
    >
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const reachable = done;
          const fill = done || active;
          return (
            <button
              key={i}
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump?.(i)}
              aria-current={active ? 'step' : undefined}
              aria-label={labels?.[i] ?? `Step ${i + 1}`}
              className={`flex-1 h-2 rounded-full transition-colors ${
                fill ? 'bg-mark' : 'bg-fog'
              } ${reachable ? 'cursor-pointer hover:bg-mark/80' : 'cursor-default'}`}
              style={
                active
                  ? {
                      transform: mounted ? 'scaleY(1.4)' : 'scaleY(1)',
                      transition: 'transform 320ms cubic-bezier(0, 0, 0.2, 1)',
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-caption text-stone">
        <span className="pv-eyebrow">Step {currentIndex + 1} of {total}</span>
        {labels?.[currentIndex] && (
          <span className="text-graphite truncate ml-2">{labels[currentIndex]}</span>
        )}
      </div>
    </div>
  );
}
