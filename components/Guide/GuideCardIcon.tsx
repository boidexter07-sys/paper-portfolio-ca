// T43: Inline SVG icons for GuideCard. No icon library — each is a
// 24x24 viewBox stroke icon that tints via currentColor. Keep the set
// small; adding new keys means updating lib/guide.ts GuideMeta['iconKey'].

import type { GuideMeta } from '@/lib/guide';

export function GuideCardIcon({ iconKey }: { iconKey: GuideMeta['iconKey'] }) {
  const stroke = { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const common = {
    width: 32,
    height: 32,
    viewBox: '0 0 24 24',
    stroke: '#7A5230',
    'aria-hidden': true,
  };
  switch (iconKey) {
    case 'compass':
      return (
        <svg {...common} {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9 L11 11 L9 15 L13 13 Z" fill="#7A5230" stroke="none" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg {...common} {...stroke}>
          <path d="M9 4 H15 V7 H20 V13 H17 V15 H20 V20 H13 V17 H11 V20 H4 V15 H7 V13 H4 V7 H9 Z" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...common} {...stroke}>
          <path d="M5 20 V4" />
          <path d="M5 5 H17 L14 9 L17 13 H5" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common} {...stroke}>
          <path d="M4 20 H20" />
          <path d="M6 16 L10 11 L13 14 L18 7" />
          <circle cx="10" cy="11" r="1.2" fill="#7A5230" stroke="none" />
          <circle cx="13" cy="14" r="1.2" fill="#7A5230" stroke="none" />
          <circle cx="18" cy="7" r="1.2" fill="#7A5230" stroke="none" />
        </svg>
      );
    case 'coin':
      return (
        <svg {...common} {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9 H15" />
          <path d="M9 13 H15" />
          <path d="M12 7 V15" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common} {...stroke}>
          <path d="M4 5 H20 V16 H12 L8 20 V16 H4 Z" />
          <path d="M8 10 H16" />
          <path d="M8 13 H13" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common} {...stroke}>
          <path d="M5 5 H10 C12 5 12 7 12 7 V20 C12 20 12 18 10 18 H5 Z" />
          <path d="M19 5 H14 C12 5 12 7 12 7 V20 C12 20 12 18 14 18 H19 Z" />
        </svg>
      );
    default:
      return null;
  }
}
