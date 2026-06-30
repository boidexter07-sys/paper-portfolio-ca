import Link from 'next/link';
import { ThreadCard } from './ThreadCard';
import type { ThreadRow } from '@/lib/community/queries';
import type { ReactionKind } from '@/lib/community/types';

interface Props {
  threads: ThreadRow[];
  currentUserId: string;
  userReactions: Record<string, ReactionKind | null>;
}

export function ThreadList({ threads, currentUserId, userReactions }: Props) {
  if (threads.length === 0) {
    return (
      <div className="pv-card p-6 text-center text-body-sm text-stone">
        No threads in this category yet. Be the first to post.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {threads.map((t) => (
        <ThreadCard
          key={t.id}
          thread={t}
          currentUserId={currentUserId}
          userReaction={userReactions[t.id] ?? null}
        />
      ))}
      <div className="pt-2 text-center text-caption text-stone">
        End of list. <Link href="/community?offset=20" className="text-mark underline underline-offset-2">Load more</Link>
      </div>
    </div>
  );
}
