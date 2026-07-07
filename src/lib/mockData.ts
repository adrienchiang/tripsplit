import { Trip, MEMBER_COLORS, ExpenseCategory } from './types';
import { getInitials } from './utils';
import { buildSplits } from './calculations';

const names = ['Chiang', 'Kwan', 'Pan', 'Bon', 'Henry', 'Hin', 'ChiMan', 'Geoff'];

const members = names.map((name, i) => ({
  id: `member_${i + 1}`,
  name,
  initials: getInitials(name),
  color: MEMBER_COLORS[i],
}));

const [chiang, kwan, pan, bon, henry, hin, chiMan, geoff] = members;

const exchangeRates: Record<string, number> = {
  THB_HKD: 0.228,
  HKD_THB: 4.38,
  USD_HKD: 7.82,
  HKD_USD: 0.128,
  JPY_HKD: 0.051,
  HKD_JPY: 19.6,
  EUR_HKD: 8.45,
  HKD_EUR: 0.118,
  CNY_HKD: 1.07,
  HKD_CNY: 0.935,
};

function makeExpense(
  id: string,
  name: string,
  originalAmount: number,
  currency: 'THB' | 'HKD',
  paidById: string,
  date: string,
  category: ExpenseCategory,
  participantIds: string[],
  notes = ''
) {
  const rate = currency === 'HKD' ? 1 : exchangeRates[`${currency}_HKD`] ?? 1;
  const settlementAmount = Math.round(originalAmount * rate * 100) / 100;
  const splits = buildSplits('equal', settlementAmount, participantIds);
  return {
    id,
    tripId: 'trip_001',
    name,
    originalAmount,
    originalCurrency: currency as 'THB' | 'HKD',
    exchangeRate: rate,
    settlementAmount,
    paidBy: paidById,
    date,
    category,
    participants: participantIds,
    splitMode: 'equal' as const,
    splits,
    notes,
    createdAt: `${date}T10:00:00Z`,
  };
}

const allIds = members.map((m) => m.id);

export const mockTrip: Trip = {
  id: 'trip_001',
  name: '有氣有力泰國 5日4夜團',
  destination: '泰國曼谷',
  description: '一齊去泰國食喝玩樂！',
  startDate: '2025-08-08',
  endDate: '2025-08-12',
  members,
  settlementCurrency: 'HKD',
  commonCurrencies: ['HKD', 'THB', 'USD'],
  exchangeRates,
  expenses: [
    makeExpense('exp_001', '來回機票', 2800, 'HKD', chiang.id, '2025-08-08', 'transport', allIds, '香港快運'),
    makeExpense('exp_002', '曼谷酒店 3晚', 14500, 'THB', kwan.id, '2025-08-08', 'accommodation', allIds, 'Novotel Bangkok'),
    makeExpense('exp_003', '機場 Grab', 420, 'THB', pan.id, '2025-08-08', 'transport', allIds),
    makeExpense('exp_004', '第一晚晚餐', 1800, 'THB', bon.id, '2025-08-08', 'food', allIds, '芒果樹餐廳'),
    makeExpense('exp_005', '大皇宮門票', 1200, 'THB', henry.id, '2025-08-09', 'activities', allIds),
    makeExpense('exp_006', '午餐 Pad Thai', 680, 'THB', hin.id, '2025-08-09', 'food', allIds),
    makeExpense('exp_007', 'Tuk Tuk 遊覽', 480, 'THB', chiMan.id, '2025-08-09', 'transport', allIds),
    makeExpense('exp_008', '夜市購物', 3200, 'THB', geoff.id, '2025-08-09', 'shopping',
      [chiang.id, kwan.id, pan.id, bon.id], '帕蓬夜市'),
    makeExpense('exp_009', 'Muay Thai 表演', 2400, 'THB', chiang.id, '2025-08-09', 'activities',
      [chiang.id, kwan.id, pan.id, bon.id, henry.id]),
    makeExpense('exp_010', '按摩 2小時', 1600, 'THB', kwan.id, '2025-08-10', 'activities',
      [kwan.id, pan.id, hin.id, chiMan.id, geoff.id]),
    makeExpense('exp_011', '水上市場早餐', 560, 'THB', pan.id, '2025-08-10', 'food', allIds),
    makeExpense('exp_012', '船河觀光', 800, 'THB', bon.id, '2025-08-10', 'activities', allIds),
    makeExpense('exp_013', '下午茶 Afternoontea', 1200, 'THB', henry.id, '2025-08-10', 'food',
      [henry.id, hin.id, chiMan.id, geoff.id]),
    makeExpense('exp_014', '最後晚餐 Seafood', 4800, 'THB', hin.id, '2025-08-10', 'food', allIds, '河邊海鮮餐廳'),
    makeExpense('exp_015', '機場送機 Grab', 520, 'THB', chiMan.id, '2025-08-12', 'transport', allIds),
    makeExpense('exp_016', '伴手禮購物', 2800, 'THB', geoff.id, '2025-08-12', 'shopping',
      [chiang.id, kwan.id, henry.id, hin.id], 'King Power 免稅店'),
    makeExpense('exp_017', '早餐', 480, 'THB', chiang.id, '2025-08-12', 'food', allIds),
    makeExpense('exp_018', '便利店零食', 320, 'THB', kwan.id, '2025-08-12', 'food', allIds),
  ],
  settlements: [],
  createdAt: '2025-07-01T00:00:00Z',
};

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = exchangeRates;
