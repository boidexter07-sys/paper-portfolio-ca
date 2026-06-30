'use client';

import { useState } from 'react';
import { ChallengeButton } from './ChallengeButton';
import { ReactionBar } from './ReactionBar';
import { ReportButton } from './ReportButton';
import { NewCommentForm } from './NewCommentForm';
import { type CommentRow } from '@/lib/community/queries';
import { type ReactionKind } from '@/lib/community/types';
import { renderBodyWithMentions, type BodySegment } from '@/lib/community/mention-render';

interface Props {
  comment: CommentRow;
  currentUserId: string;
  userReaction: ReactionKind | null;
  // Pre-resolved mention matches for the comment body. We resolve them
  // server-side and pass the parsed structure in so this client
  // component doesn't have to re-import the parser.
  mentionMap: Map<string, { userId: string; displayName: string }>;
  // Depth in the comment tree (0 = top-level reply).
  depth: number;
  // Max render depth for inline comments. Past this, render a
  // "continue thread →" link instead of nesting.
  maxInlineDepth?: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function CommentCard({
  comment,
  currentUserId,
  userReaction,
  mentionMap,
  depth,
  maxInlineDepth = 3,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false);

  // The pre-resolved mention map is keyed by the raw @-token (lowercased
  // not-normalized). The renderer iterates the body for known tokens;
  // tokens that aren't in the map are rendered as plain text.
  const segments: BodySegment[] = renderBodyWithMentions(comment.body, []);

  // If we're past the inline depth, collapse to a "continue thread" link.
  // The link is a no-op for v1 (no per-thread deep-link yet); v2 will
  // generate a permalink for the parent + scroll.
  if (depth > maxInlineDepth) {
    return (
      <div className="ml-4 sm:ml-6 pl-2 border-l border-fog text-caption text-stone py-2">
        <a href={`#comment-${comment.id}`} className="text-mark underline underline-offset-2">
          Continue this thread ({depth} levels deep) →
        </a>
      </div>
    );
  }

  const author = comment.author_display_name ?? 'Unknown';
  const isOwn = comment.author_id === currentUserId;

  return (
    <article
      id={`comment-${comment.id}`}
      className={`pv-card p-3 sm:p-4 space-y-2 ${depth > 0 ? 'ml-4 sm:ml-6 border-l-2 border-fog' : ''}`}
    >
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-body-sm font-medium text-ink">{author}</span>
          <span className="text-caption text-stone">{timeAgo(comment.created_at)}</span>
          {comment.moderation_status !== 'clean' && comment.moderation_status !== 'mod_approved' && (
            <span className="pv-pill text-caption" title="This comment is held for review">
              Under review
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isOwn && <ChallengeButton recipientUserId={comment.author_id} recipientDisplayName={author} currentUserId={currentUserId} />}
          <ReportButton targetType="comment" targetId={comment.id} />
        </div>
      </header>

      <div className="text-body text-ink whitespace-pre-wrap break-words">
        {segments.map((seg, i) =>
          seg.kind === 'text' ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span key={i} className="text-mark font-medium">
              {seg.raw}
            </span>
          )
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ReactionBar
          targetType="comment"
          targetId={comment.id}
          initialScore={comment.reaction_score}
          initialCount={comment.reaction_count}
          initialUserReaction={userReaction}
          compact
        />
        <button
          type="button"
          onClick={() => setReplyOpen((o) => !o)}
          className="pv-btn-ghost text-caption"
        >
          {replyOpen ? 'Cancel' : 'Reply'}
        </button>
      </div>

      {replyOpen && (
        <NewCommentForm
          threadId={comment.thread_id}
          parentCommentId={comment.id}
          inline
          autoFocus
          onClose={() => setReplyOpen(false)}
          placeholder={`Reply to ${author}…`}
        />
      )}
    </article>
  );
}
