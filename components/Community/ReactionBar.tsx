'use client';

import { useState, useTransition } from 'react';
import { toggleReactionAction } from '@/lib/community/actions';
import { REACTION_EMOJI, REACTION_LABEL, type ReactionKind } from '@/lib/community/types';

interface Props {
  targetType: 'thread' | 'comment';
  targetId: string;
  initialScore: number;
  initialCount: number;
  initialUserReaction: ReactionKind | null;
  // Compact = single combined bar (used in lists). Default = expanded (6 buttons).
  compact?: boolean;
}

const VOTING: ReactionKind[] = ['upvote', 'downvote'];
const EMOJI: ReactionKind[] = ['clap', 'fire', 'mind_blown', 'idea'];

export function ReactionBar({ targetType, targetId, initialScore, initialCount, initialUserReaction, compact }: Props) {
  const [score, setScore] = useState(initialScore);
  const [count, setCount] = useState(initialCount);
  const [userReaction, setUserReaction] = useState<ReactionKind | null>(initialUserReaction);
  const [pending, startTransition] = useTransition();

  function react(kind: ReactionKind) {
    if (pending) return;
    // Optimistic update: predict the new state.
    const wasOn = userReaction === kind;
    const wasOtherVote = userReaction && userReaction !== kind;
    let nextScore = score;
    let nextCount = count;
    if (wasOn) {
      // toggle off
      nextScore -= kind === 'upvote' ? 1 : kind === 'downvote' ? -1 : 0;
      nextCount -= 1;
    } else if (wasOtherVote) {
      // switch
      const prevKind = userReaction!;
      nextScore -= prevKind === 'upvote' ? 1 : prevKind === 'downvote' ? -1 : 0;
      nextScore += kind === 'upvote' ? 1 : kind === 'downvote' ? -1 : 0;
    } else {
      // fresh
      nextCount += 1;
      nextScore += kind === 'upvote' ? 1 : kind === 'downvote' ? -1 : 0;
    }
    setUserReaction(wasOn ? null : kind);
    setScore(nextScore);
    setCount(nextCount);

    startTransition(async () => {
      const r = await toggleReactionAction({ targetType, targetId, kind });
      if (!r.ok) {
        // Roll back on server error.
        setUserReaction(userReaction);
        setScore(score);
        setCount(count);
        return;
      }
      // Server returns authoritative counts; overwrite.
      setScore(r.score);
      setCount(r.count);
      setUserReaction(r.state === 'on' ? kind : null);
    });
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-caption text-stone">
        <button
          type="button"
          onClick={() => react('upvote')}
          className={`px-2 py-1 rounded hover:bg-fog ${userReaction === 'upvote' ? 'text-mark' : ''}`}
          aria-pressed={userReaction === 'upvote'}
          title={REACTION_LABEL.upvote}
        >
          ▲
        </button>
        <span className={`font-medium ${score > 0 ? 'text-positive' : score < 0 ? 'text-negative' : 'text-graphite'}`}>
          {score > 0 ? `+${score}` : score}
        </span>
        <button
          type="button"
          onClick={() => react('downvote')}
          className={`px-2 py-1 rounded hover:bg-fog ${userReaction === 'downvote' ? 'text-mark' : ''}`}
          aria-pressed={userReaction === 'downvote'}
          title={REACTION_LABEL.downvote}
        >
          ▼
        </button>
        <span className="text-stone">·</span>
        <span>{count} reactions</span>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-1">
      {[...VOTING, ...EMOJI].map((kind) => {
        const isOn = userReaction === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => react(kind)}
            disabled={pending}
            className={`px-2 py-1 rounded text-body-sm border transition-colors ${
              isOn
                ? 'bg-fog border-mark text-mark'
                : 'bg-bone border-fog text-graphite hover:bg-fog'
            }`}
            aria-pressed={isOn}
            title={REACTION_LABEL[kind]}
          >
            <span className="mr-1">{REACTION_EMOJI[kind]}</span>
            <span className="hidden sm:inline">{REACTION_LABEL[kind]}</span>
          </button>
        );
      })}
      <span className="ml-2 text-caption text-stone">
        score {score > 0 ? `+${score}` : score} · {count} total
      </span>
    </div>
  );
}
