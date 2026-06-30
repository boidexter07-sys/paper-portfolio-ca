// /community — Discussion forum index. Lists threads in the active
// category, with a sticky "New thread" composer at the top.
//
// Auth: logged-in users only. The AppShell already redirects
// unauthenticated users; we double-belt with getCurrentUser() so the
// page is safe even if the shell is bypassed (e.g. via a direct link).

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listThreads, countThreads, getUserReactions } from '@/lib/community';
import { isValidCategory, type ThreadCategory } from '@/lib/community/types';
import { CategoryTabs } from '@/components/Community/CategoryTabs';
import { ThreadList } from '@/components/Community/ThreadList';
import { NewThreadForm } from '@/components/Community/NewThreadForm';

const PAGE_SIZE = 20;

export const dynamic = 'force-dynamic';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; offset?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/community');

  const sp = await searchParams;
  const catParam = (sp.category ?? 'all') as ThreadCategory | 'all';
  const category: ThreadCategory | 'all' = isValidCategory(catParam) ? catParam : 'all';
  const offset = Math.max(Number(sp.offset ?? '0') || 0, 0);

  const threads = listThreads({ category, limit: PAGE_SIZE, offset });
  const total = countThreads({ category });
  const ids = threads.map((t) => t.id);
  const reactions = getUserReactions(user.id, ids);
  const userReactions: Record<string, any> = {};
  for (const id of ids) userReactions[id] = reactions.get(id) ?? null;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-3xl">
      <header>
        <p className="pv-eyebrow">Talk shop with other learners</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Community</h1>
        <p className="text-body text-graphite mt-1 max-w-prose">
          Discussions, strategy, market commentary, and clan recruitment. Send challenges to other users
          directly from here. Be respectful — see the community rules.
        </p>
      </header>

      <CategoryTabs active={category} />

      <NewThreadForm defaultCategory={category === 'all' ? 'general' : category} />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-h3 text-ink">
            {category === 'all' ? 'Recent threads' : `${category.replace('_', ' ')} threads`}
          </h2>
          <p className="text-caption text-stone">
            {total} {total === 1 ? 'thread' : 'threads'} · page {Math.floor(offset / PAGE_SIZE) + 1}
          </p>
        </div>
        <ThreadList threads={threads} currentUserId={user.id} userReactions={userReactions} />
      </section>
    </div>
  );
}
