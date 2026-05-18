'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, backHref, right, className }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <div className={cn('flex items-center justify-between py-4 mb-2', className)}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-charcoal-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-charcoal-300" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-charcoal-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
