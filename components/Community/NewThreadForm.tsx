'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createThreadAction } from '@/lib/community/actions';
import { THREAD_CATEGORIES, MAX_THREAD_BODY, MAX_THREAD_TITLE, type ThreadCategory } from '@/lib/community/types';

export function NewThreadForm({ defaultCategory }: { defaultCategory?: ThreadCategory }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ThreadCategory>(defaultCategory ?? 'general');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await createThreadAction({ title, body, category });
      if (r.ok) {
        if (r.status === 'published' && r.threadId) {
          router.push(`/community/${r.threadId}`);
        } else {
          setInfo(r.userMessage);
          setTitle('');
          setBody('');
        }
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="pv-card p-4 sm:p-5 space-y-3">
      <h3 className="font-serif text-h4 text-ink">New thread</h3>
      <div>
        <label className="block text-caption text-stone mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ThreadCategory)}
          className="pv-input w-full"
        >
          {THREAD_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="text-caption text-stone mt-1">
          {THREAD_CATEGORIES.find((c) => c.value === category)?.description}
        </p>
      </div>
      <div>
        <label className="block text-caption text-stone mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_THREAD_TITLE}
          className="pv-input w-full"
          placeholder="What do you want to discuss?"
          required
        />
        <p className="text-caption text-stone mt-1 text-right">
          {title.length}/{MAX_THREAD_TITLE}
        </p>
      </div>
      <div>
        <label className="block text-caption text-stone mb-1">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_THREAD_BODY}
          rows={8}
          className="pv-input w-full"
          placeholder="Share your pick, your reasoning, or your question. Use @name to mention another user."
          required
        />
        <p className="text-caption text-stone mt-1 text-right">
          {body.length}/{MAX_THREAD_BODY}
        </p>
      </div>
      {error && <p className="text-caption text-negative">{error}</p>}
      {info && <p className="text-caption text-warn">{info}</p>}
      <div className="flex justify-end">
        <button type="submit" className="pv-btn-mark text-body-sm" disabled={pending}>
          {pending ? 'Posting…' : 'Post thread'}
        </button>
      </div>
    </form>
  );
}
