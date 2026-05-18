export type CurrencyCode = 'HKD' | 'THB' | 'USD' | 'JPY' | 'EUR' | 'CNY';

export type ExpenseCategory =
  | 'accommodation'
  | 'transport'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'others';

export type SplitMode = 'equal' | 'custom_amount' | 'custom_percentage';

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface ExchangeRateMap {
  [key: string]: number; // e.g. "THB_HKD": 0.215
}

export interface SplitDetail {
  memberId: string;
  amount: number;       // in settlement currency
  percentage?: number;
}

export interface Expense {
  id: string;
  tripId: string;
  name: string;
  originalAmount: number;
  originalCurrency: CurrencyCode;
  exchangeRate: number;
  settlementAmount: number; // originalAmount * exchangeRate
  paidBy: string;           // memberId
  date: string;             // ISO date string
  category: ExpenseCategory;
  participants: string[];   // memberIds
  splitMode: SplitMode;
  splits: SplitDetail[];
  notes: string;
  createdAt: string;
}

export interface SettlementTransaction {
  id: string;
  from: string;   // memberId
  to: string;     // memberId
  amount: number; // in settlement currency
  currency: CurrencyCode;
  completed: boolean;
  completedAt?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  members: Member[];
  settlementCurrency: CurrencyCode;
  commonCurrencies: CurrencyCode[];
  exchangeRates: ExchangeRateMap;
  expenses: Expense[];
  settlements: SettlementTransaction[];
  createdAt: string;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  initials: string;
  color: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = others owe you, negative = you owe others
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: '住宿',
  transport: '交通',
  food: '飲食',
  activities: '景點／活動',
  shopping: '購物',
  others: '其他',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  accommodation: '🏨',
  transport: '🚌',
  food: '🍜',
  activities: '🎡',
  shopping: '🛍️',
  others: '📦',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  accommodation: '#3f60ab',
  transport: '#557d42',
  food: '#d9a32a',
  activities: '#7a7c86',
  shopping: '#b8631e',
  others: '#636570',
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  HKD: '港幣 HKD',
  THB: '泰銖 THB',
  USD: '美元 USD',
  JPY: '日圓 JPY',
  EUR: '歐元 EUR',
  CNY: '人民幣 CNY',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  HKD: 'HK$',
  THB: '฿',
  USD: '$',
  JPY: '¥',
  EUR: '€',
  CNY: '¥',
};

export const MEMBER_COLORS = [
  '#3f60ab', '#557d42', '#d9a32a', '#7a3fab',
  '#ab3f3f', '#3f9aab', '#ab783f', '#636570',
];
