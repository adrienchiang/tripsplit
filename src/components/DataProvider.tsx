'use client';

import { useEffect } from 'react';
import { useTripStore } from '@/lib/store';
import { Compass } from 'lucide-react';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const initialize = useTripStore((s) => s.initialize);
  const isLoading = useTripStore((s) => s.isLoading);
  const isInitialized = useTripStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin">
          <Compass className="w-10 h-10 text-navy-500" />
        </div>
        <p className="text-charcoal-400 text-sm">正在連接資料庫…</p>
      </div>
    );
  }

  return <>{children}</>;
}
