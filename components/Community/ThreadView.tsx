'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChallengeButton } from './ChallengeButton';
import { ReactionBar } from './ReactionBar';
import { ReportButton } from './ReportButton';
import { CommentTree } from './CommentTree';
import { NewCommentForm } from './NewCommentForm';
import { THREAD_CATEGORIES } from '@/lib/community/types';
import type { CommentRow, ThreadRow } from '@/lib/community/queries';
import type { ReactionKind } from '@/lib/community/types';

interface Props {
  thread: ThreadRow;
  comments: CommentRow[];
  currentUserId: string;
  userReactions: Record<string, ReactionKind | null>;
  displayNames: Record<string, string>;
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

// POLL_INTERVAL_MS = 4000ms. We hit /api/community/threads/[id]/updates
// with the last seen last_activity_at; if the response is non-empty
// (server says there are new comments), we trigger a router.refresh()
// to re-render the whole tree.
//
// The poll pauses when the tab is hidden (Page Visibility API) to
// spare the battery.
const POLL_INTERVAL_MS = 4000;

export function ThreadView({ thread, comments, currentUserId, userReactions, displayNames }: Props) {
  const router = useRouter();
  const lastActivityRef = useRef(thread.last_activity_at);
  const [, setTick] = useState(0);

  useEffect(() => {
    lastActivityRef.current = thread.last_activity_at;
  }, [thread.last_activity_at]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await fetch(
          `/api/community/threads/${thread.id}/updates?since=${lastActivityRef.current}`,
          { cache: 'no-store' }
        );
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { last_activity_at: number; new_comment_count: number };
          if (json.last_activity_at > lastActivityRef.current) {
            lastActivityRef.current = json.last_activity_at;
            // Trigger a re-fetch of the whole thread + comments.
            router.refresh();
            return;
          }
        }
      } catch {
        // Network blip — ignore, try again next tick.
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [thread.id, router]);

  const cat = THREAD_CATEGORIES.find((c) => c.value === thread.category);
  const author = thread.author_display_name ?? 'Unknown';
  const isOwn = thread.author_id === currentUserId;

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="space-y-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link href="/community" className="text-caption text-stone hover:text-ink">
            ← Back to community
          </Link>
          <span className="pv-pill text-caption">{cat?.label ?? thread.category}</span>
        </div>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">{thread.title}</h1>
        <div className="flex items-center gap-2 text-caption text-stone flex-wrap">
          <span>
            by <span className="text-graphite">{author}</span>
          </span>
          <span>·</span>
          <span>{timeAgo(thread.created_at)}</span>
          {thread.moderation_status !== 'clean' && thread.moderation_status !== 'mod_approved' && (
            <span className="pv-pill text-caption" title="This thread is held for review">
              Under review
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isOwn && <ChallengeButton recipientUserId={thread.author_id} recipientDisplayName={author} currentUserId={currentUserId} />}
          <ReportButton targetType="thread" targetId={thread.id} />
        </div>
      </header>

      <article className="pv-card p-4 sm:p-5 space-y-3">
        <div className="text-body text-ink whitespace-pre-wrap break-words">{thread.body}</div>
        <ReactionBar
          targetType="thread"
          targetId={thread.id}
          initialScore={thread.reaction_score}
          initialCount={thread.reaction_count}
          initialUserReaction={userReactions[thread.id] ?? null}
        />
      </article>

      <section className="space-y-3">
        <h2 className="font-serif text-h3 text-ink">
          {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
        </h2>
        <CommentTree
          comments={comments}
          currentUserId={currentUserId}
          userReactions={userReactions}
          displayNames={displayNames}
        />
      </section>

      <section className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pb-4 pt-3 bg-paper/95 backdrop-blur border-t border-fog sm:border-0 sm:bg-transparent sm:static">
        <NewCommentForm threadId={thread.id} placeholder="Add to the discussion. Use @name to mention someone." />
      </section>
    </div>
  );
}
