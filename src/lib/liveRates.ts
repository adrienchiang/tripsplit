import { CurrencyCode } from './types';

export const RATE_CURRENCIES: CurrencyCode[] = ['HKD', 'THB', 'USD', 'JPY', 'EUR', 'CNY'];

export interface LiveRates {
  rates: Record<string, number>;
  asOf: number;
  source: string;
}

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function fetchPerUsd(): Promise<{ perUsd: Record<string, number>; asOf: number; source: string }> {
  try {
    const d = await getJson('https://open.er-api.com/v6/latest/USD');
    if (d.result === 'success' && d.rates) {
      return { perUsd: d.rates, asOf: (d.time_last_update_unix ?? Date.now() / 1000) * 1000, source: 'ExchangeRate-API' };
    }
  } catch {
    // fall through to the backup provider
  }
  const d = await getJson('https://api.frankfurter.dev/v1/latest?base=USD&symbols=HKD,THB,JPY,EUR,CNY');
  return { perUsd: { USD: 1, ...d.rates }, asOf: new Date(d.date).getTime(), source: 'Frankfurter (ECB)' };
}

export async function fetchLiveRates(): Promise<LiveRates> {
  const { perUsd, asOf, source } = await fetchPerUsd();
  const rates: Record<string, number> = {};
  for (const from of RATE_CURRENCIES) {
    for (const to of RATE_CURRENCIES) {
      if (from === to) continue;
      const a = perUsd[from];
      const b = perUsd[to];
      if (!(a > 0) || !(b > 0)) throw new Error(`missing rate for ${from}/${to}`);
      rates[`${from}_${to}`] = Number((b / a).toFixed(6));
    }
  }
  return { rates, asOf, source };
}
