import Link from 'next/link';
import type { ThreadRow } from '@/lib/community/queries';
import { THREAD_CATEGORIES } from '@/lib/community/types';
import { ReactionBar } from './ReactionBar';

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

interface Props {
  thread: ThreadRow;
  currentUserId: string;
  userReaction: 'upvote' | 'downvote' | 'clap' | 'fire' | 'mind_blown' | 'idea' | null;
}

export function ThreadCard({ thread, currentUserId, userReaction }: Props) {
  const cat = THREAD_CATEGORIES.find((c) => c.value === thread.category);
  const author = thread.author_display_name ?? 'Unknown';
  return (
    <article className="pv-card p-4 space-y-2 hover:shadow-card transition-shadow">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="pv-pill text-caption" style={{ background: 'rgba(122,82,48,0.08)' }}>
          {cat?.label ?? thread.category}
        </span>
        <h2 className="font-serif text-h4 text-ink">
          <Link href={`/community/${thread.id}`} className="hover:underline underline-offset-2">
            {thread.title}
          </Link>
        </h2>
      </div>
      <p className="text-body-sm text-graphite line-clamp-2">{thread.body}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap text-caption text-stone">
        <span>
          by <span className="text-graphite">{author}</span> · {timeAgo(thread.created_at)}
        </span>
        <span>
          {thread.comment_count} {thread.comment_count === 1 ? 'comment' : 'comments'}
          {thread.recent_comment_count > 0 ? ` · ${thread.recent_comment_count} new in 24h` : ''}
        </span>
      </div>
      <ReactionBar
        targetType="thread"
        targetId={thread.id}
        initialScore={thread.reaction_score}
        initialCount={thread.reaction_count}
        initialUserReaction={userReaction}
        compact
      />
    </article>
  );
}
