'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const NAV_ITEMS = [
  { href: '/record', labelKey: 'nav.record' },
  { href: '/train', labelKey: 'nav.train' },
  { href: '/cognition', labelKey: 'nav.cognition' },
  { href: '/', labelKey: 'nav.dashboard' },
] as const;

// 현재 경로가 해당 메뉴에 속하는지 — 대시보드(/)는 정확히 일치할 때만,
// 나머지는 하위 경로(예: /mindmap는 기록 흐름)까지 활성으로 본다.
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const { t } = useI18n();
  const pathname = usePathname() ?? '/';

  return (
    <nav className="mx-auto grid max-w-lg grid-cols-4 gap-1.5 px-4 pb-3 text-center text-sm font-normal text-slate-500">
      {NAV_ITEMS.map(({ href, labelKey }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-2 py-2 leading-snug transition-colors active:scale-95 ${
              active
                ? 'bg-accent font-medium text-white'
                : 'hover:bg-white hover:text-ink'
            }`}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
