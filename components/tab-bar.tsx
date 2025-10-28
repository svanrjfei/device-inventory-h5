"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Search, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/scan', label: '扫码', icon: QrCode },
  { href: '/search', label: '查询', icon: Search },
  { href: '/ledger', label: '设备台账', icon: ClipboardList },
];

export function TabBar() {
  const pathname = usePathname() || '';
  return (
    <nav className="mx-auto max-w-xl grid grid-cols-3 text-xs">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/');
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center justify-center gap-1.5 p-3 transition-colors',
              active ? 'text-black' : 'text-neutral-500 hover:text-black'
            )}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{t.label}</span>
            <span
              className={cn(
                'pointer-events-none absolute inset-x-6 -bottom-px h-0.5 rounded-full transition-opacity',
                active ? 'bg-black opacity-100' : 'opacity-0'
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

