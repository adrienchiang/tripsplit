'use client';

import { useParams } from 'next/navigation';
import { useTripStore } from '@/lib/store';
import { calculateMemberBalances, getTotalExpense, getExpensesByCategory, getExpensesByDate } from '@/lib/calculations';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { formatAmount, formatDate } from '@/lib/utils';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, ExpenseCategory } from '@/lib/types';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

export default function AnalyticsPage() {
  const params = useParams();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));

  if (!trip) return null;

  const total = getTotalExpense(trip.expenses);
  const byCategory = getExpensesByCategory(trip.expenses);
  const byDate = getExpensesByDate(trip.expenses);
  const balances = calculateMemberBalances(trip.members, trip.expenses);
  const settleCurrency = trip.settlementCurrency;

  const pieData = Object.entries(byCategory).map(([cat, amount]) => ({
    name: CATEGORY_LABELS[cat as ExpenseCategory],
    value: amount,
    color: CATEGORY_COLORS[cat as ExpenseCategory],
    icon: CATEGORY_ICONS[cat as ExpenseCategory],
  }));

  const barData = balances.map((b) => ({
    name: b.name.slice(0, 6),
    paid: b.totalPaid,
    owed: b.totalOwed,
    color: b.color,
  }));

  const lineData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date: formatDate(date),
      amount,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl px-3 py-2 text-xs">
          <p className="text-white font-medium">{formatAmount(payload[0].value, settleCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <PageHeader title="支出分析" />

      {/* Donut Chart */}
      <div className="card p-4 mb-4">
        <p className="section-title mb-4">支出分類</p>
        {pieData.length > 0 ? (
          <>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#22242e"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-charcoal-400">總計</span>
                <span className="text-base font-bold text-white">{formatAmount(total, settleCurrency)}</span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs text-charcoal-300">{item.name}</span>
                        <span className="text-xs font-medium text-white">
                          {formatAmount(item.value, settleCurrency)}
                        </span>
                      </div>
                      <div className="h-1 bg-charcoal-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-charcoal-500 w-8 text-right">
                      {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <p className="text-charcoal-500 text-center py-8">未有支出記錄</p>
        )}
      </div>

      {/* Daily Trend */}
      {lineData.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="section-title mb-4">每日支出趨勢</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#363843" />
                <XAxis dataKey="date" tick={{ fill: '#7a7c86', fontSize: 10 }} />
                <YAxis tick={{ fill: '#7a7c86', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3f60ab"
                  strokeWidth={2}
                  dot={{ fill: '#3f60ab', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Member Bar Chart */}
      <div className="card p-4 mb-4">
        <p className="section-title mb-4">成員支出對比</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#363843" />
              <XAxis dataKey="name" tick={{ fill: '#7a7c86', fontSize: 10 }} />
              <YAxis tick={{ fill: '#7a7c86', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="paid" name="已墊付" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="owed" name="應負擔" fill="#363843" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-navy-500" />
            <span className="text-xs text-charcoal-400">已墊付</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-charcoal-700" />
            <span className="text-xs text-charcoal-400">應負擔</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card p-4">
        <p className="section-title mb-3">統計數據</p>
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-charcoal-800">
            <span className="text-sm text-charcoal-400">總支出筆數</span>
            <span className="text-sm font-medium text-white">{trip.expenses.length} 筆</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-charcoal-800">
            <span className="text-sm text-charcoal-400">平均每筆支出</span>
            <span className="text-sm font-medium text-white">
              {formatAmount(trip.expenses.length > 0 ? total / trip.expenses.length : 0, settleCurrency)}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-charcoal-800">
            <span className="text-sm text-charcoal-400">最高單筆支出</span>
            <span className="text-sm font-medium text-white">
              {trip.expenses.length > 0
                ? formatAmount(Math.max(...trip.expenses.map((e) => e.settlementAmount)), settleCurrency)
                : '–'}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-charcoal-400">最多消費分類</span>
            <span className="text-sm font-medium text-white">
              {pieData.length > 0
                ? `${pieData.sort((a, b) => b.value - a.value)[0].icon} ${pieData.sort((a, b) => b.value - a.value)[0].name}`
                : '–'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
