'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
  className?: string;
}

export function StatCard({ label, value, sub, icon, accent, className }: StatCardProps) {
  return (
    <div className={cn('card p-4 flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-charcoal-400">{label}</span>
        {icon && (
          <span className="text-charcoal-500">{icon}</span>
        )}
      </div>
      <span
        className="text-xl font-bold text-white"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-charcoal-400">{sub}</span>}
    </div>
  );
}
