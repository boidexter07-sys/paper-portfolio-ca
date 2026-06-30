// /community/[threadId] — Thread detail with nested comments + live
// polling for new comments.

import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getThread, listComments, getUserReactions, getUserDisplayNames } from '@/lib/community';
import { ThreadView } from '@/components/Community/ThreadView';
import type { ReactionKind } from '@/lib/community/types';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/community');

  const { threadId } = await params;
  const thread = getThread(threadId);
  if (!thread) notFound();

  // Hide non-published / deleted / hidden from non-author.
  if (!thread.published_at || thread.deleted_at || thread.hidden_at) {
    if (thread.author_id !== user.id) notFound();
  }

  const comments = listComments(threadId);

  // Reactions: union of all target ids we care about (thread + every comment).
  const targetIds = [thread.id, ...comments.map((c) => c.id)];
  const reactions = getUserReactions(user.id, targetIds);
  const userReactions: Record<string, ReactionKind | null> = {};
  for (const id of targetIds) userReactions[id] = reactions.get(id) ?? null;

  // Display names: for the @mention renderer.
  const allAuthorIds = Array.from(new Set([thread.author_id, ...comments.map((c) => c.author_id)]));
  const displayNameMap = getUserDisplayNames(allAuthorIds);
  const displayNames: Record<string, string> = {};
  for (const [k, v] of displayNameMap) displayNames[k] = v;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8">
      <ThreadView
        thread={thread}
        comments={comments}
        currentUserId={user.id}
        userReactions={userReactions}
        displayNames={displayNames}
      />
    </div>
  );
}
