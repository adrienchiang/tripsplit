'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, Check, Info } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { CurrencyCode, ExpenseCategory, SplitMode, CATEGORY_LABELS, CATEGORY_ICONS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import { buildSplits, round2 } from '@/lib/calculations';
import { getExchangeRate, getTodayISO, formatAmount, cn } from '@/lib/utils';

const CATEGORIES: ExpenseCategory[] = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'others'];

export default function NewExpensePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));
  const addExpense = useTripStore((s) => s.addExpense);

  const [name, setName] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('THB');
  const [exchangeRate, setExchangeRate] = useState(0.236);
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (trip) {
      setParticipants(trip.members.map((m) => m.id));
      setPaidBy(trip.members[0]?.id ?? '');
      setCurrency(trip.commonCurrencies[1] ?? 'THB');
    }
  }, [trip]);

  useEffect(() => {
    if (trip && currency !== trip.settlementCurrency) {
      const rate = getExchangeRate(trip.exchangeRates, currency, trip.settlementCurrency);
      setExchangeRate(rate);
    } else {
      setExchangeRate(1);
    }
  }, [currency, trip]);

  if (!trip) return null;

  const amount = parseFloat(originalAmount) || 0;
  const settlementAmount = round2(amount * exchangeRate);

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || amount <= 0 || !paidBy || participants.length === 0) return;

    const customAmountsNum = Object.fromEntries(
      Object.entries(customAmounts).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const customPctNum = Object.fromEntries(
      Object.entries(customPercentages).map(([k, v]) => [k, parseFloat(v) || 0])
    );

    const splits = buildSplits(splitMode, settlementAmount, participants, customAmountsNum, customPctNum);

    addExpense(tripId, {
      name: name.trim(),
      originalAmount: amount,
      originalCurrency: currency,
      exchangeRate,
      settlementAmount,
      paidBy,
      date,
      category,
      participants,
      splitMode,
      splits,
      notes: notes.trim(),
    });
    router.push(`/trip/${tripId}`);
  };

  const isValid = name.trim() && amount > 0 && paidBy && participants.length > 0;
  const settleCurrency = trip.settlementCurrency;

  return (
    <div className="page-container">
      <PageHeader title="新增支出" back backHref={`/trip/${tripId}`} />

      <div className="space-y-4">
        {/* Name & Amount */}
        <div className="card p-4 space-y-4">
          <p className="section-title">支出詳情</p>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">支出名稱 *</label>
            <input
              className="input-field"
              placeholder="例：晚餐、Grab 車費、酒店"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">金額 *</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCurrencyPicker(true)}
                className="bg-charcoal-800 border border-charcoal-600 rounded-xl px-3 py-3 flex items-center gap-1.5 shrink-0"
              >
                <span className="text-white font-medium">{currency}</span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-500" />
              </button>
              <input
                type="number"
                className="input-field flex-1"
                placeholder="0.00"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
              />
            </div>
            {currency !== settleCurrency && amount > 0 && (
              <div className="mt-2 bg-navy-950 border border-navy-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-navy-400" />
                  <span className="text-xs text-navy-400">匯率換算</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-charcoal-400">原始金額</span>
                    <span className="text-white">{CURRENCY_SYMBOLS[currency]}{amount.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-400">匯率</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="bg-transparent text-right text-navy-300 w-20 focus:outline-none"
                        value={exchangeRate}
                        step="0.001"
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-charcoal-400">換算金額</span>
                    <span className="text-white">{formatAmount(settlementAmount, settleCurrency)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 block">日期</label>
              <input
                type="date"
                className="input-field text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 block">分類</label>
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="input-field flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-1.5">
                  <span>{CATEGORY_ICONS[category]}</span>
                  <span className="text-sm">{CATEGORY_LABELS[category]}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-charcoal-500" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">備註</label>
            <input
              className="input-field"
              placeholder="選填"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Paid by */}
        <div className="card p-4">
          <p className="section-title mb-3">付款人</p>
          <div className="grid grid-cols-4 gap-2">
            {trip.members.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaidBy(m.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors',
                  paidBy === m.id ? 'bg-navy-800 ring-1 ring-navy-500' : 'bg-charcoal-800 hover:bg-charcoal-700'
                )}
              >
                <Avatar initials={m.initials} color={m.color} size="sm" />
                <span className="text-xs text-charcoal-300 truncate w-full text-center">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">分賬成員</p>
            <div className="flex gap-2">
              <button
                onClick={() => setParticipants(trip.members.map((m) => m.id))}
                className="text-xs text-navy-400"
              >
                全選
              </button>
              <span className="text-charcoal-700">·</span>
              <button
                onClick={() => setParticipants([])}
                className="text-xs text-charcoal-500"
              >
                清除
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {trip.members.map((m) => {
              const selected = participants.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleParticipant(m.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors relative',
                    selected ? 'bg-military-900 ring-1 ring-military-600' : 'bg-charcoal-800 opacity-50'
                  )}
                >
                  <Avatar initials={m.initials} color={m.color} size="sm" />
                  <span className="text-xs text-charcoal-300 truncate w-full text-center">{m.name}</span>
                  {selected && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-military-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split mode */}
        {participants.length > 0 && (
          <div className="card p-4 space-y-3">
            <p className="section-title">分賬方式</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'equal', label: '平均分' },
                  { value: 'custom_amount', label: '自訂金額' },
                  { value: 'custom_percentage', label: '自訂比例' },
                ] as { value: SplitMode; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSplitMode(value)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-medium transition-colors',
                    splitMode === value
                      ? 'bg-navy-600 text-white'
                      : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Equal split preview */}
            {splitMode === 'equal' && settlementAmount > 0 && (
              <div className="bg-charcoal-800 rounded-xl p-3">
                <p className="text-xs text-charcoal-400 mb-2">每人負擔</p>
                <div className="space-y-1.5">
                  {participants.map((id) => {
                    const m = trip.members.find((x) => x.id === id);
                    if (!m) return null;
                    const share = round2(settlementAmount / participants.length);
                    return (
                      <div key={id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar initials={m.initials} color={m.color} size="sm" />
                          <span className="text-sm text-white">{m.name}</span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {formatAmount(share, settleCurrency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom amount inputs */}
            {splitMode === 'custom_amount' && (
              <div className="space-y-2">
                {participants.map((id) => {
                  const m = trip.members.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <Avatar initials={m.initials} color={m.color} size="sm" />
                      <span className="text-sm text-white flex-1">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-charcoal-500">{CURRENCY_SYMBOLS[settleCurrency]}</span>
                        <input
                          type="number"
                          className="bg-charcoal-800 border border-charcoal-600 rounded-lg px-2 py-1.5 text-sm text-white w-24 text-right focus:outline-none focus:border-navy-400"
                          placeholder="0.00"
                          value={customAmounts[id] ?? ''}
                          onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom percentage inputs */}
            {splitMode === 'custom_percentage' && (
              <div className="space-y-2">
                {participants.map((id) => {
                  const m = trip.members.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <Avatar initials={m.initials} color={m.color} size="sm" />
                      <span className="text-sm text-white flex-1">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="bg-charcoal-800 border border-charcoal-600 rounded-lg px-2 py-1.5 text-sm text-white w-20 text-right focus:outline-none focus:border-navy-400"
                          placeholder="0"
                          value={customPercentages[id] ?? ''}
                          onChange={(e) =>
                            setCustomPercentages((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                        />
                        <span className="text-xs text-charcoal-500">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="btn-primary w-full py-4 text-base font-bold disabled:opacity-40"
        >
          新增支出
        </button>
      </div>

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowCurrencyPicker(false)}>
          <div
            className="bg-charcoal-900 rounded-t-2xl w-full p-5 pb-10 max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-4">選擇貨幣</h3>
            <div className="space-y-2">
              {trip.commonCurrencies.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors',
                    currency === c ? 'bg-navy-700 text-white' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  )}
                >
                  <span className="font-medium">{c}</span>
                  <span className="text-sm text-charcoal-400">{CURRENCY_LABELS[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowCategoryPicker(false)}>
          <div
            className="bg-charcoal-900 rounded-t-2xl w-full p-5 pb-10 max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-4">選擇分類</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setShowCategoryPicker(false); }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl transition-colors',
                    category === c ? 'bg-navy-700 text-white' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  )}
                >
                  <span className="text-xl">{CATEGORY_ICONS[c]}</span>
                  <span className="text-sm font-medium">{CATEGORY_LABELS[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
