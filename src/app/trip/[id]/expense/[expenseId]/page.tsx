'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Edit3 } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { formatAmount, formatFullDate, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/types';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const expenseId = params.expenseId as string;
  const trip = useTripStore((s) => s.getTripById(tripId));
  const deleteExpense = useTripStore((s) => s.deleteExpense);

  if (!trip) return null;

  const expense = trip.expenses.find((e) => e.id === expenseId);
  if (!expense) {
    return (
      <div className="page-container">
        <PageHeader title="支出詳情" back backHref={`/trip/${tripId}`} />
        <p className="text-charcoal-400 text-center mt-8">找不到支出記錄</p>
      </div>
    );
  }

  const payer = trip.members.find((m) => m.id === expense.paidBy);
  const settleCurrency = trip.settlementCurrency;

  const handleDelete = () => {
    if (confirm('確定刪除此支出記錄？')) {
      deleteExpense(tripId, expenseId);
      router.push(`/trip/${tripId}`);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="支出詳情"
        back
        backHref={`/trip/${tripId}`}
        right={
          <div className="flex items-center gap-1">
            <Link href={`/trip/${tripId}/expense/${expenseId}/edit`} className="p-2 rounded-xl hover:bg-charcoal-800 text-charcoal-300 transition-colors">
              <Edit3 className="w-5 h-5" />
            </Link>
            <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-900/30 text-red-400 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Hero */}
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">{expense.name}</h2>
            <p className="text-xs text-charcoal-400 mt-1">{formatFullDate(expense.date)}</p>
          </div>
          <CategoryBadge category={expense.category} />
        </div>

        {/* Amount display */}
        <div className="bg-charcoal-800 rounded-xl p-4 space-y-2">
          {expense.originalCurrency !== settleCurrency ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">原始金額</span>
                <span className="text-white font-medium">
                  {CURRENCY_SYMBOLS[expense.originalCurrency]}{expense.originalAmount.toFixed(2)} {expense.originalCurrency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">匯率</span>
                <span className="text-charcoal-300">1 {expense.originalCurrency} = {expense.exchangeRate} {settleCurrency}</span>
              </div>
              <div className="border-t border-charcoal-700 pt-2 flex justify-between">
                <span className="text-charcoal-300 font-medium">換算金額</span>
                <span className="text-white font-bold text-lg">
                  {formatAmount(expense.settlementAmount, settleCurrency)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-charcoal-300">金額</span>
              <span className="text-white font-bold text-2xl">
                {formatAmount(expense.settlementAmount, settleCurrency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Paid by */}
      <div className="card p-4 mb-4">
        <p className="section-title mb-3">付款人</p>
        {payer && (
          <div className="flex items-center gap-3">
            <Avatar initials={payer.initials} color={payer.color} size="lg" />
            <div>
              <p className="font-bold text-white">{payer.name}</p>
              <p className="text-xs text-charcoal-400">
                墊付 {formatAmount(expense.settlementAmount, settleCurrency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Splits */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">分賬明細</p>
          <span className="text-xs text-charcoal-500">
            {expense.participants.length} 人分擔
          </span>
        </div>
        <div className="space-y-3">
          {expense.splits.map((split) => {
            const member = trip.members.find((m) => m.id === split.memberId);
            if (!member) return null;
            const isPayer = member.id === expense.paidBy;
            return (
              <div key={split.memberId} className="flex items-center gap-3">
                <Avatar initials={member.initials} color={member.color} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{member.name}</span>
                    {isPayer && (
                      <span className="text-[10px] bg-navy-800 text-navy-300 px-1.5 py-0.5 rounded">付款</span>
                    )}
                  </div>
                  {split.percentage !== undefined && (
                    <p className="text-xs text-charcoal-500">{split.percentage.toFixed(1)}%</p>
                  )}
                </div>
                <span className={cn(
                  'text-sm font-bold',
                  isPayer ? 'text-military-400' : 'text-charcoal-200'
                )}>
                  {formatAmount(split.amount, settleCurrency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {expense.notes && (
        <div className="card p-4 mb-4">
          <p className="section-title mb-2">備註</p>
          <p className="text-sm text-charcoal-300">{expense.notes}</p>
        </div>
      )}
    </div>
  );
}
