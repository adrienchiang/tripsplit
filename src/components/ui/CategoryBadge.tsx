'use client';

import { ExpenseCategory, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: ExpenseCategory;
  className?: string;
  showLabel?: boolean;
}

export function CategoryBadge({ category, className, showLabel = true }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];
  const icon = CATEGORY_ICONS[category];
  const label = CATEGORY_LABELS[category];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium', className)}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}
