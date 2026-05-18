'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTripStore } from '@/lib/store';
import { BottomNav } from '@/components/ui/BottomNav';

export default function TripLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string;
  const setCurrentTrip = useTripStore((s) => s.setCurrentTrip);

  useEffect(() => {
    setCurrentTrip(id);
  }, [id, setCurrentTrip]);

  return (
    <div className="min-h-screen bg-charcoal-950">
      {children}
      <BottomNav tripId={id} />
    </div>
  );
}
