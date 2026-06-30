import Link from 'next/link';
import { THREAD_CATEGORIES, type ThreadCategory } from '@/lib/community/types';

interface Props {
  active: ThreadCategory | 'all';
}

export function CategoryTabs({ active }: Props) {
  const items: { value: ThreadCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    ...THREAD_CATEGORIES.map((c) => ({ value: c.value as ThreadCategory | 'all', label: c.label })),
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-1" aria-label="Forum categories">
      {items.map((it) => {
        const isActive = active === it.value;
        const href = it.value === 'all' ? '/community' : `/community?category=${it.value}`;
        return (
          <Link
            key={it.value}
            href={href}
            className={`px-3 py-1.5 rounded-full text-caption whitespace-nowrap border transition-colors ${
              isActive
                ? 'bg-mark text-bone border-mark'
                : 'bg-bone text-graphite border-fog hover:bg-fog'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
