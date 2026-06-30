'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCommentAction } from '@/lib/community/actions';
import { MAX_COMMENT_BODY } from '@/lib/community/types';

interface Props {
  threadId: string;
  parentCommentId?: string;
  // When true, the form is a compact inline reply (no own card chrome).
  inline?: boolean;
  // Auto-focus on mount (used when opened from a "Reply" button).
  autoFocus?: boolean;
  // Called when the user submits or cancels.
  onClose?: () => void;
  placeholder?: string;
}

export function NewCommentForm({
  threadId,
  parentCommentId,
  inline,
  autoFocus,
  onClose,
  placeholder = 'Add a comment. Use @name to mention someone.',
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await createCommentAction({
        threadId,
        parentCommentId: parentCommentId ?? null,
        body,
      });
      if (r.ok) {
        if (r.status === 'published') {
          setBody('');
          onClose?.();
          router.refresh();
        } else {
          setInfo(r.userMessage);
        }
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className={inline ? 'space-y-2' : 'pv-card p-3 sm:p-4 space-y-2'}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_COMMENT_BODY}
        rows={inline ? 2 : 3}
        className="pv-input w-full"
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-stone">
          {body.length}/{MAX_COMMENT_BODY}
        </p>
        <div className="flex items-center gap-2">
          {onClose && (
            <button type="button" onClick={onClose} className="pv-btn-ghost text-caption" disabled={pending}>
              Cancel
            </button>
          )}
          <button type="submit" className="pv-btn-mark text-caption" disabled={pending || !body.trim()}>
            {pending ? 'Posting…' : inline ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
      {error && <p className="text-caption text-negative">{error}</p>}
      {info && <p className="text-caption text-warn">{info}</p>}
    </form>
  );
}
