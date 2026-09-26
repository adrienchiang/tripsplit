'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, Info } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { CurrencyCode, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import { getExchangeRate, cn } from '@/lib/utils';

export default function CurrencyPage() {
  const params = useParams();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));
  const updateExchangeRate = useTripStore((s) => s.updateExchangeRate);
  const applyLiveRates = useTripStore((s) => s.applyLiveRates);
  const setAutoRates = useTripStore((s) => s.setAutoRates);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  if (!trip) return null;

  const settle = trip.settlementCurrency;
  const otherCurrencies = trip.commonCurrencies.filter((c) => c !== settle);
  const autoOn = trip.exchangeRates._auto !== 0;
  const updatedAt = trip.exchangeRates._updatedAt;
  const isFinished = trip.endDate < new Date().toLocaleDateString('en-CA');

  const handleRateChange = (from: CurrencyCode, value: string) => {
    const rate = parseFloat(value);
    const current = getExchangeRate(trip.exchangeRates, from, settle);
    if (!isNaN(rate) && rate > 0 && Math.abs(rate - current) > 1e-9) {
      updateExchangeRate(tripId, from, settle, rate);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const refreshNow = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyLiveRates(tripId, data.rates, data.asOf);
      setRefreshMsg('已更新至最新匯率');
    } catch {
      setRefreshMsg('暫時無法取得最新匯率，請稍後再試');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAuto = () => {
    if (autoOn) {
      setAutoRates(tripId, false);
    } else {
      setAutoRates(tripId, true);
      refreshNow();
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="匯率設定" subtitle={`結算貨幣：${settle}`} back backHref={`/trip/${tripId}`} />

      <div className="space-y-4">
        {/* Info card */}
        <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 flex gap-3">
          <Info className="w-4 h-4 text-navy-400 shrink-0 mt-0.5" />
          <p className="text-xs text-navy-300">
            新增支出時，系統會按以下匯率自動換算為 {settle}。你可以手動調整匯率，以符合實際兌換率。
          </p>
        </div>

        {/* Settlement currency */}
        <div className="card p-4">
          <p className="section-title mb-3">結算貨幣</p>
          <div className="flex items-center gap-3 bg-charcoal-800 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-white">{CURRENCY_SYMBOLS[settle]}</span>
            </div>
            <div>
              <p className="font-bold text-white">{settle}</p>
              <p className="text-xs text-charcoal-400">{CURRENCY_LABELS[settle]}</p>
            </div>
            <div className="ml-auto">
              <span className="text-xs bg-military-800 text-military-300 px-2 py-0.5 rounded">結算</span>
            </div>
          </div>
        </div>

        {/* Exchange rates */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">匯率</p>
            {saved && <span className="text-xs text-military-400">已儲存 ✓</span>}
          </div>
          <div className="space-y-3">
            {otherCurrencies.map((from) => {
              const rate = getExchangeRate(trip.exchangeRates, from, settle);
              return (
                <div key={from} className="bg-charcoal-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-white">{from}</p>
                      <p className="text-xs text-charcoal-400">{CURRENCY_LABELS[from]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-charcoal-500 mb-1">1 {from} =</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      key={`${from}-${rate}`}
                      type="number"
                      step="0.001"
                      defaultValue={rate}
                      onBlur={(e) => handleRateChange(from, e.target.value)}
                      className="flex-1 bg-charcoal-700 border border-charcoal-600 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-navy-400"
                    />
                    <span className="text-sm font-medium text-charcoal-300">{settle}</span>
                  </div>
                  <p className="text-xs text-charcoal-500 mt-2">
                    即 1 {settle} ≈ {(1 / rate).toFixed(4)} {from}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto update */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">每日自動更新匯率</p>
              <p className="text-xs text-charcoal-500 mt-0.5">
                每日更新未結束旅行嘅匯率。手動修改匯率會暫停自動更新。
              </p>
            </div>
            <button
              onClick={toggleAuto}
              aria-pressed={autoOn}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', autoOn ? 'bg-military-600' : 'bg-charcoal-700')}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all',
                  autoOn ? 'left-[1.375rem]' : 'left-0.5'
                )}
              />
            </button>
          </div>
          {isFinished && (
            <p className="text-xs text-charcoal-500">此旅行已結束，每日自動更新唔會再套用。</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-charcoal-500">
              {typeof updatedAt === 'number'
                ? `匯率日期：${new Date(updatedAt).toLocaleDateString('zh-HK')}`
                : '尚未自動更新'}
            </p>
            <button
              onClick={refreshNow}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-navy-300 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              立即更新
            </button>
          </div>
          {refreshMsg && <p className="text-xs text-charcoal-400">{refreshMsg}</p>}
          <p className="text-[10px] text-charcoal-600">
            匯率資料來源：
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">
              ExchangeRate-API
            </a>
            （備用：歐洲央行）。為市場參考匯率，實際兌換率可能不同。
          </p>
        </div>

        {/* Rate table */}
        <div className="card p-4">
          <p className="section-title mb-3">換算參考表</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-charcoal-500">
                  <th className="text-left py-1.5 pr-4">金額</th>
                  {otherCurrencies.map((c) => (
                    <th key={c} className="text-right py-1.5 px-2">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-charcoal-300">
                {[100, 500, 1000, 5000].map((amt) => (
                  <tr key={amt} className="border-t border-charcoal-800">
                    <td className="py-1.5 pr-4 font-medium text-white">{settle} {amt}</td>
                    {otherCurrencies.map((c) => {
                      const rate = getExchangeRate(trip.exchangeRates, c, settle);
                      return (
                        <td key={c} className="py-1.5 px-2 text-right">
                          {(amt / rate).toFixed(0)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
