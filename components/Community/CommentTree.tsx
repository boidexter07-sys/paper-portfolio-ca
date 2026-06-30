'use client';

import { useMemo } from 'react';
import { CommentCard } from './CommentCard';
import type { CommentRow } from '@/lib/community/queries';
import type { ReactionKind } from '@/lib/community/types';

interface Props {
  comments: CommentRow[];
  currentUserId: string;
  // userId -> ReactionKind
  userReactions: Record<string, ReactionKind | null>;
  // userId -> display_name (for @mention rendering in bodies)
  displayNames: Record<string, string>;
}

// Render the flat comment array as a tree. We use a single-pass
// parent-id map. The tree is depth-capped by CommentCard internally.
export function CommentTree({ comments, currentUserId, userReactions, displayNames }: Props) {
  const byParent = useMemo(() => {
    const map = new Map<string | null, CommentRow[]>();
    for (const c of comments) {
      const key = c.parent_comment_id ?? null;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    // Sort each level oldest-first.
    for (const list of map.values()) {
      list.sort((a, b) => a.created_at - b.created_at);
    }
    return map;
  }, [comments]);

  const roots = byParent.get(null) ?? [];

  if (roots.length === 0) {
    return (
      <div className="pv-card p-4 text-center text-body-sm text-stone">
        No comments yet. Be the first to reply.
      </div>
    );
  }

  function renderList(list: CommentRow[], depth: number) {
    return list.map((c) => (
      <div key={c.id} className="space-y-2">
        <CommentCard
          comment={c}
          currentUserId={currentUserId}
          userReaction={userReactions[c.id] ?? null}
          mentionMap={new Map()}
          depth={c.depth}
        />
        {byParent.get(c.id)?.length ? (
          <div className="space-y-2">{renderList(byParent.get(c.id)!, depth + 1)}</div>
        ) : null}
      </div>
    ));
  }

  return <div className="space-y-3">{renderList(roots, 0)}</div>;
}
