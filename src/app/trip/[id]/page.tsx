'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Settings, MapPin, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { calculateMemberBalances, getTotalExpense, getExpensesByCategory } from '@/lib/calculations';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, ExpenseCategory } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { StatCard } from '@/components/ui/StatCard';

export default function TripDashboard() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-charcoal-400">找不到旅行資料</p>
      </div>
    );
  }

  const balances = calculateMemberBalances(trip.members, trip.expenses);
  const total = getTotalExpense(trip.expenses);
  const avgPerPerson = trip.members.length > 0 ? total / trip.members.length : 0;
  const byCategory = getExpensesByCategory(trip.expenses);

  const topPayer = balances.reduce((a, b) => (a.totalPaid > b.totalPaid ? a : b), balances[0]);
  const topOwed = balances.reduce((a, b) => (a.netBalance < b.netBalance ? a : b), balances[0]);
  const topCreditor = balances.reduce((a, b) => (a.netBalance > b.netBalance ? a : b), balances[0]);

  const recentExpenses = [...trip.expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const topCategory = Object.entries(byCategory).reduce(
    (a, b) => (a[1] > b[1] ? a : b),
    ['', 0] as [string, number]
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between py-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-sand-400" />
            <span className="text-sand-400 text-xs font-medium">{trip.destination}</span>
          </div>
          <h1 className="text-xl font-black text-white leading-tight line-clamp-2">{trip.name}</h1>
          <p className="text-xs text-charcoal-500 mt-1">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.members.length} 人
          </p>
        </div>
        <Link href={`/trip/${tripId}/settings`} className="p-2 rounded-xl hover:bg-charcoal-800">
          <Settings className="w-5 h-5 text-charcoal-400" />
        </Link>
      </div>

      {/* Total spend hero */}
      <div className="relative bg-navy-900 rounded-2xl p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="relative">
          <p className="text-xs text-navy-300 font-medium mb-1">總支出</p>
          <p className="text-4xl font-black text-white">
            {formatAmount(total, trip.settlementCurrency)}
          </p>
          <p className="text-xs text-navy-400 mt-1">
            每人平均 {formatAmount(Math.round(avgPerPerson * 100) / 100, trip.settlementCurrency)}
          </p>
          <div className="absolute top-0 right-0 opacity-10">
            <Award className="w-24 h-24 text-white" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="最多墊支"
          value={topCreditor?.netBalance > 0 ? topCreditor.name : '–'}
          sub={topCreditor?.netBalance > 0 ? `+${formatAmount(topCreditor.netBalance, trip.settlementCurrency)}` : ''}
          accent="#3f60ab"
        />
        <StatCard
          label="欠款最多"
          value={topOwed?.netBalance < 0 ? topOwed.name : '–'}
          sub={topOwed?.netBalance < 0 ? `${formatAmount(topOwed.netBalance, trip.settlementCurrency)}` : ''}
          accent="#ab3f3f"
        />
      </div>

      {/* Member balances */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">成員結餘</p>
          <Link href={`/trip/${tripId}/members`} className="text-xs text-navy-400">查看詳情</Link>
        </div>
        <div className="space-y-2.5">
          {balances.map((b) => {
            const isPositive = b.netBalance >= 0;
            return (
              <div key={b.memberId} className="flex items-center gap-3">
                <Avatar initials={b.initials} color={b.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{b.name}</span>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isPositive ? 'text-military-400' : 'text-red-400'
                      )}
                    >
                      {isPositive ? '+' : ''}
                      {formatAmount(b.netBalance, trip.settlementCurrency)}
                    </span>
                  </div>
                  {/* Balance bar */}
                  <div className="mt-1 h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', isPositive ? 'bg-military-500' : 'bg-red-500')}
                      style={{
                        width: `${Math.min(Math.abs(b.netBalance) / (total / trip.members.length) * 50 + 50, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">支出分類</p>
            <Link href={`/trip/${tripId}/analytics`} className="text-xs text-navy-400">詳細分析</Link>
          </div>
          <div className="space-y-2">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => {
                const pct = total > 0 ? (amount / total) * 100 : 0;
                const color = CATEGORY_COLORS[cat as ExpenseCategory];
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{CATEGORY_ICONS[cat as ExpenseCategory]}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-charcoal-300">{CATEGORY_LABELS[cat as ExpenseCategory]}</span>
                        <span className="text-xs font-medium text-white">
                          {formatAmount(amount, trip.settlementCurrency)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-charcoal-500 w-9 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">所有支出</p>
          <span className="text-xs text-charcoal-500">{trip.expenses.length} 筆</span>
        </div>
        {recentExpenses.length === 0 ? (
          <p className="text-sm text-charcoal-500 text-center py-4">未有支出記錄</p>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense) => {
              const payer = trip.members.find((m) => m.id === expense.paidBy);
              return (
                <Link
                  key={expense.id}
                  href={`/trip/${tripId}/expense/${expense.id}`}
                  className="flex items-center gap-3 hover:bg-charcoal-800 rounded-xl -mx-2 px-2 py-1.5 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}22` }}
                  >
                    {CATEGORY_ICONS[expense.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{expense.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-charcoal-500">{formatDate(expense.date)}</span>
                      {payer && (
                        <>
                          <span className="text-charcoal-700">·</span>
                          <span className="text-xs text-charcoal-500">{payer.name} 付款</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">
                      {formatAmount(expense.settlementAmount, trip.settlementCurrency)}
                    </p>
                    {expense.originalCurrency !== trip.settlementCurrency && (
                      <p className="text-xs text-charcoal-500">
                        {expense.originalCurrency} {expense.originalAmount.toFixed(0)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB - Add expense */}
      <Link
        href={`/trip/${tripId}/expense/new`}
        className="fixed bottom-20 right-4 w-14 h-14 bg-navy-600 hover:bg-navy-500 rounded-full flex items-center justify-center shadow-lg shadow-navy-900/50 transition-colors active:scale-95 z-40"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>
    </div>
  );
}
