import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CurrencyCode, CURRENCY_SYMBOLS } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function getInitials(name: string): string {
  if (!name) return '?';
  // For English names, take first 2 letters uppercase
  if (/^[A-Za-z]/.test(name)) {
    return name.slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2);
}

export function getRateKey(from: CurrencyCode, to: CurrencyCode): string {
  return `${from}_${to}`;
}

export function getExchangeRate(
  rates: Record<string, number>,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return 1;
  const key = getRateKey(from, to);
  return rates[key] ?? 1;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>
): number {
  const rate = getExchangeRate(rates, from, to);
  return Math.round((amount * rate + Number.EPSILON) * 100) / 100;
}

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
