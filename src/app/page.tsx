'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Calendar, Users, ChevronRight, Compass } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { formatAmount } from '@/lib/utils';
import { getTotalExpense } from '@/lib/calculations';

export default function HomePage() {
  const trips = useTripStore((s) => s.trips);
  const setCurrentTrip = useTripStore((s) => s.setCurrentTrip);
  const router = useRouter();

  const handleTripClick = (id: string) => {
    setCurrentTrip(id);
    router.push(`/trip/${id}`);
  };

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Hero Header */}
      <div className="relative bg-navy-950 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {/* Compass decoration */}
        <div className="absolute top-4 right-4 opacity-10">
          <Compass className="w-32 h-32 text-navy-300" />
        </div>
        <div className="relative px-6 pt-16 pb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-sand-400" />
            <span className="text-sand-400 text-xs font-semibold tracking-widest uppercase">旅行分賬</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">
            TripSplit
          </h1>
          <p className="text-charcoal-400 text-sm mt-2">
            朋友旅行 · 清晰分賬 · 輕鬆埋數
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Create new trip button */}
        <Link
          href="/trip/create"
          className="flex items-center justify-center gap-3 w-full btn-primary mb-8 py-4"
        >
          <Plus className="w-5 h-5" />
          <span>建立新旅行</span>
        </Link>

        {/* Trip list */}
        {trips.length > 0 ? (
          <div>
            <p className="section-title mb-4">我的旅行</p>
            <div className="space-y-3">
              {trips.map((trip) => {
                const total = getTotalExpense(trip.expenses);
                return (
                  <button
                    key={trip.id}
                    onClick={() => handleTripClick(trip.id)}
                    className="card w-full text-left p-4 hover:border-navy-600 transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white text-base truncate">{trip.name}</h2>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-charcoal-500" />
                          <span className="text-xs text-charcoal-400">{trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-charcoal-500" />
                            <span className="text-xs text-charcoal-400">
                              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-charcoal-500" />
                            <span className="text-xs text-charcoal-400">{trip.members.length} 人</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3">
                        <span className="text-navy-300 font-bold text-base">
                          {formatAmount(total, trip.settlementCurrency)}
                        </span>
                        <span className="text-xs text-charcoal-500">總支出</span>
                        <ChevronRight className="w-4 h-4 text-charcoal-600 mt-1" />
                      </div>
                    </div>

                    {/* Member avatars */}
                    <div className="flex items-center mt-3 -space-x-1.5">
                      {trip.members.slice(0, 6).map((m) => (
                        <div
                          key={m.id}
                          className="w-6 h-6 rounded-full border-2 border-charcoal-900 flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.initials.slice(0, 2)}
                        </div>
                      ))}
                      {trip.members.length > 6 && (
                        <div className="w-6 h-6 rounded-full border-2 border-charcoal-900 bg-charcoal-700 flex items-center justify-center text-[9px] text-charcoal-300">
                          +{trip.members.length - 6}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Compass className="w-16 h-16 text-charcoal-700 mx-auto mb-4" />
            <p className="text-charcoal-500">未有旅行紀錄</p>
            <p className="text-charcoal-600 text-sm mt-1">點擊上方按鈕建立你的第一個旅行</p>
          </div>
        )}
      </div>
    </div>
  );
}
