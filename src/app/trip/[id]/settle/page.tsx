'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Circle, ArrowRight, RefreshCw } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { calculateMemberBalances } from '@/lib/calculations';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { formatAmount, cn } from '@/lib/utils';

export default function SettlePage() {
  const params = useParams();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));
  const refreshSettlements = useTripStore((s) => s.refreshSettlements);
  const markComplete = useTripStore((s) => s.markSettlementComplete);
  const unmarkComplete = useTripStore((s) => s.unmarkSettlementComplete);

  useEffect(() => {
    refreshSettlements(tripId);
  }, [tripId]);

  if (!trip) return null;

  const balances = calculateMemberBalances(trip.members, trip.expenses);
  const settleCurrency = trip.settlementCurrency;
  const pending = trip.settlements.filter((s) => !s.completed);
  const completed = trip.settlements.filter((s) => s.completed);
  const allDone = trip.settlements.length > 0 && pending.length === 0;

  const getMember = (id: string) => trip.members.find((m) => m.id === id);

  return (
    <div className="page-container">
      <PageHeader
        title="埋數"
        subtitle="最簡找數方案"
        right={
          <button
            onClick={() => refreshSettlements(tripId)}
            className="p-2 rounded-xl hover:bg-charcoal-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-charcoal-400" />
          </button>
        }
      />

      {/* Summary balances */}
      <div className="card p-4 mb-5">
        <p className="section-title mb-3">每人結餘</p>
        <div className="space-y-2">
          {balances.map((b) => {
            const isPositive = b.netBalance >= 0;
            return (
              <div key={b.memberId} className="flex items-center gap-3">
                <Avatar initials={b.initials} color={b.color} size="sm" />
                <span className="text-sm text-white flex-1">{b.name}</span>
                <div className="text-right">
                  <span
                    className={cn(
                      'text-sm font-bold',
                      Math.abs(b.netBalance) < 0.01
                        ? 'text-charcoal-400'
                        : isPositive
                        ? 'text-military-400'
                        : 'text-red-400'
                    )}
                  >
                    {Math.abs(b.netBalance) < 0.01
                      ? '已結清'
                      : `${isPositive ? '+' : ''}${formatAmount(b.netBalance, settleCurrency)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="bg-military-900 border border-military-700 rounded-2xl p-5 mb-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-military-400 mx-auto mb-2" />
          <p className="text-military-300 font-bold text-lg">全部找數完成！</p>
          <p className="text-military-500 text-sm mt-1">旅行支出已全數結清</p>
        </div>
      )}

      {/* Pending transactions */}
      {pending.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">待找數</p>
            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-lg">{pending.length} 筆</span>
          </div>
          <div className="space-y-3">
            {pending.map((s) => {
              const from = getMember(s.from);
              const to = getMember(s.to);
              if (!from || !to) return null;
              return (
                <div
                  key={s.id}
                  className="bg-charcoal-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar initials={from.initials} color={from.color} size="md" />
                    <div className="flex flex-col items-center flex-1">
                      <div className="flex items-center gap-1 text-charcoal-500">
                        <div className="h-px bg-charcoal-600 flex-1 w-8" />
                        <ArrowRight className="w-4 h-4" />
                        <div className="h-px bg-charcoal-600 flex-1 w-8" />
                      </div>
                      <span className="text-lg font-black text-white mt-1">
                        {formatAmount(s.amount, settleCurrency)}
                      </span>
                    </div>
                    <Avatar initials={to.initials} color={to.color} size="md" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-charcoal-400 mb-3">
                    <span className="font-medium text-charcoal-200">{from.name}</span>
                    <span>支付給</span>
                    <span className="font-medium text-charcoal-200">{to.name}</span>
                  </div>

                  <button
                    onClick={() => markComplete(tripId, s.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-military-700 hover:bg-military-600 rounded-xl text-sm font-medium text-white transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    標記為已找數
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No transactions needed */}
      {trip.settlements.length === 0 && trip.expenses.length > 0 && (
        <div className="card p-6 text-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-military-400 mx-auto mb-2" />
          <p className="text-white font-bold">無需找數</p>
          <p className="text-charcoal-500 text-sm mt-1">每人支出已平衡，不需要轉賬</p>
        </div>
      )}

      {trip.expenses.length === 0 && (
        <div className="card p-6 text-center mb-4">
          <p className="text-charcoal-500">未有支出記錄，無法計算埋數</p>
        </div>
      )}

      {/* Completed transactions */}
      {completed.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">已完成</p>
            <span className="text-xs bg-military-900/50 text-military-400 px-2 py-0.5 rounded-lg">
              {completed.length} 筆
            </span>
          </div>
          <div className="space-y-3">
            {completed.map((s) => {
              const from = getMember(s.from);
              const to = getMember(s.to);
              if (!from || !to) return null;
              return (
                <div key={s.id} className="flex items-center gap-3 opacity-60">
                  <Avatar initials={from.initials} color={from.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal-300 line-through">
                      {from.name} → {to.name}
                    </p>
                    <p className="text-xs text-charcoal-500">
                      {formatAmount(s.amount, settleCurrency)}
                      {s.completedAt && ` · ${new Date(s.completedAt).toLocaleDateString('zh-HK')}`}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-military-500 shrink-0" />
                  <button
                    onClick={() => unmarkComplete(tripId, s.id)}
                    className="text-xs text-charcoal-600 hover:text-charcoal-400"
                  >
                    撤回
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
