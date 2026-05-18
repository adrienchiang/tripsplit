'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Users, PieChart, HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface BottomNavProps {
  tripId: string;
}

export function BottomNav({ tripId }: BottomNavProps) {
  const pathname = usePathname();
  const base = `/trip/${tripId}`;

  const navItems: NavItem[] = [
    { href: base, icon: LayoutDashboard, label: '總覽' },
    { href: `${base}/expense/new`, icon: ListTodo, label: '新增' },
    { href: `${base}/members`, icon: Users, label: '成員' },
    { href: `${base}/analytics`, icon: PieChart, label: '分析' },
    { href: `${base}/settle`, icon: HandCoins, label: '埋數' },
  ];

  return (
    <nav className="bottom-nav safe-bottom">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = href === base ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors',
              isActive ? 'text-navy-400' : 'text-charcoal-500 hover:text-charcoal-300'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-navy-400')} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
