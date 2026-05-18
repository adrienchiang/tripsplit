'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/store';
import { calculateMemberBalances, getTotalExpense } from '@/lib/calculations';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { formatAmount, cn } from '@/lib/utils';

export default function MembersPage() {
  const params = useParams();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));

  if (!trip) return null;

  const balances = calculateMemberBalances(trip.members, trip.expenses);
  const total = getTotalExpense(trip.expenses);
  const settleCurrency = trip.settlementCurrency;

  return (
    <div className="page-container">
      <PageHeader title="成員分賬" subtitle={`${trip.members.length} 位成員`} />

      <div className="space-y-3">
        {balances.map((b) => {
          const isPositive = b.netBalance >= 0;
          const memberExpenses = trip.expenses.filter(
            (e) => e.participants.includes(b.memberId)
          );

          return (
            <div key={b.memberId} className="card p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar initials={b.initials} color={b.color} size="lg" />
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base">{b.name}</h3>
                  <p className="text-xs text-charcoal-400">
                    參與 {memberExpenses.length} 筆支出
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn('text-lg font-black', isPositive ? 'text-military-400' : 'text-red-400')}
                  >
                    {isPositive ? '+' : ''}
                    {formatAmount(b.netBalance, settleCurrency)}
                  </p>
                  <p className="text-xs text-charcoal-500">
                    {isPositive ? '應收' : '應付'}
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-charcoal-800 rounded-xl p-3">
                  <p className="text-xs text-charcoal-400 mb-1">已墊付</p>
                  <p className="text-base font-bold text-military-400">
                    {formatAmount(b.totalPaid, settleCurrency)}
                  </p>
                </div>
                <div className="bg-charcoal-800 rounded-xl p-3">
                  <p className="text-xs text-charcoal-400 mb-1">應負擔</p>
                  <p className="text-base font-bold text-white">
                    {formatAmount(b.totalOwed, settleCurrency)}
                  </p>
                </div>
              </div>

              {/* Share of total */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-charcoal-500 mb-1">
                  <span>佔總支出</span>
                  <span>{total > 0 ? ((b.totalOwed / total) * 100).toFixed(1) : '0.0'}%</span>
                </div>
                <div className="h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${total > 0 ? (b.totalOwed / total) * 100 : 0}%`,
                      backgroundColor: b.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card p-4">
        <div className="flex justify-between items-center">
          <span className="text-charcoal-400">旅行總支出</span>
          <span className="text-white font-bold text-lg">{formatAmount(total, settleCurrency)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-charcoal-400">每人平均</span>
          <span className="text-white font-bold">
            {formatAmount(trip.members.length > 0 ? total / trip.members.length : 0, settleCurrency)}
          </span>
        </div>
      </div>

      <Link
        href={`/trip/${tripId}/settle`}
        className="btn-primary w-full mt-4 py-4 text-center text-base font-bold flex items-center justify-center"
      >
        查看埋數方案
      </Link>
    </div>
  );
}
