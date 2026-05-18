'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, MapPin, Calendar, Globe, Users } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { CurrencyCode, CURRENCY_LABELS, MEMBER_COLORS } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/mockData';
import { Avatar } from '@/components/ui/Avatar';

const ALL_CURRENCIES: CurrencyCode[] = ['HKD', 'THB', 'USD', 'JPY', 'EUR', 'CNY'];

export default function CreateTripPage() {
  const router = useRouter();
  const createTrip = useTripStore((s) => s.createTrip);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [settlementCurrency, setSettlementCurrency] = useState<CurrencyCode>('HKD');
  const [commonCurrencies, setCommonCurrencies] = useState<CurrencyCode[]>(['HKD', 'THB']);
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string; initials: string; color: string }[]>([]);

  const addMember = () => {
    const trimmed = memberName.trim();
    if (!trimmed || members.length >= 8) return;
    setMembers((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}`,
        name: trimmed,
        initials: getInitials(trimmed),
        color: MEMBER_COLORS[prev.length % MEMBER_COLORS.length],
      },
    ]);
    setMemberName('');
  };

  const toggleCurrency = (c: CurrencyCode) => {
    setCommonCurrencies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !destination.trim() || !startDate || !endDate || members.length === 0) return;
    const id = createTrip({
      name: name.trim(),
      destination: destination.trim(),
      description: description.trim(),
      startDate,
      endDate,
      members,
      settlementCurrency,
      commonCurrencies,
      exchangeRates: DEFAULT_EXCHANGE_RATES,
    });
    router.push(`/trip/${id}`);
  };

  const isValid = name.trim() && destination.trim() && startDate && endDate && members.length > 0;

  return (
    <div className="min-h-screen bg-charcoal-950 px-4 pt-4 pb-24 max-w-md mx-auto">
      <PageHeader title="建立新旅行" back backHref="/" />

      <div className="space-y-5">
        {/* Basic Info */}
        <div className="card p-4 space-y-4">
          <p className="section-title">旅行資料</p>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">旅行名稱 *</label>
            <input
              className="input-field"
              placeholder="例：泰國曼谷 4日3夜"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">目的地 *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-500" />
              <input
                className="input-field pl-9"
                placeholder="例：泰國曼谷"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 block">出發日期 *</label>
              <input
                type="date"
                className="input-field text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 block">回程日期 *</label>
              <input
                type="date"
                className="input-field text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">備註</label>
            <input
              className="input-field"
              placeholder="旅行備註"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Currency */}
        <div className="card p-4 space-y-4">
          <p className="section-title">貨幣設定</p>
          <div>
            <label className="text-xs text-charcoal-400 mb-2 block">結算貨幣</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setSettlementCurrency(c)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    settlementCurrency === c
                      ? 'bg-navy-600 text-white'
                      : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-charcoal-400 mb-2 block">常用付款貨幣</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCurrency(c)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    commonCurrencies.includes(c)
                      ? 'bg-military-600 text-white'
                      : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="section-title">成員</p>
            <span className="text-xs text-charcoal-500">{members.length}/8</span>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 bg-charcoal-800 rounded-xl px-2.5 py-1.5"
                >
                  <Avatar initials={m.initials} color={m.color} size="sm" />
                  <span className="text-sm text-white">{m.name}</span>
                  <button
                    onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                    className="text-charcoal-500 hover:text-charcoal-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.length < 8 && (
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="輸入成員名稱"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMember()}
              />
              <button
                onClick={addMember}
                disabled={!memberName.trim()}
                className="btn-primary px-4 py-3 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="btn-primary w-full py-4 text-base font-bold disabled:opacity-40"
        >
          建立旅行
        </button>
      </div>
    </div>
  );
}
