import { Expense, Member, MemberBalance, SettlementTransaction, SplitDetail, SplitMode } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Round to 2 decimal places to avoid floating point errors
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate equal splits for an expense
 */
export function calculateEqualSplits(
  settlementAmount: number,
  participantIds: string[]
): SplitDetail[] {
  if (participantIds.length === 0) return [];
  const perPerson = round2(settlementAmount / participantIds.length);
  const splits: SplitDetail[] = participantIds.map((id) => ({
    memberId: id,
    amount: perPerson,
    percentage: round2(100 / participantIds.length),
  }));
  // Adjust last person for rounding difference
  const total = splits.reduce((s, x) => s + x.amount, 0);
  const diff = round2(settlementAmount - total);
  if (diff !== 0 && splits.length > 0) {
    splits[splits.length - 1].amount = round2(splits[splits.length - 1].amount + diff);
  }
  return splits;
}

/**
 * Calculate splits from custom percentages
 */
export function calculatePercentageSplits(
  settlementAmount: number,
  participantIds: string[],
  percentages: Record<string, number>
): SplitDetail[] {
  const splits: SplitDetail[] = participantIds.map((id) => {
    const pct = percentages[id] ?? 0;
    return {
      memberId: id,
      amount: round2((settlementAmount * pct) / 100),
      percentage: pct,
    };
  });
  const total = splits.reduce((s, x) => s + x.amount, 0);
  const diff = round2(settlementAmount - total);
  if (diff !== 0 && splits.length > 0) {
    splits[splits.length - 1].amount = round2(splits[splits.length - 1].amount + diff);
  }
  return splits;
}

/**
 * Calculate each member's net balance across all expenses
 */
export function calculateMemberBalances(
  members: Member[],
  expenses: Expense[]
): MemberBalance[] {
  const balanceMap: Record<string, { paid: number; owed: number }> = {};
  members.forEach((m) => {
    balanceMap[m.id] = { paid: 0, owed: 0 };
  });

  expenses.forEach((expense) => {
    if (balanceMap[expense.paidBy] !== undefined) {
      balanceMap[expense.paidBy].paid = round2(
        balanceMap[expense.paidBy].paid + expense.settlementAmount
      );
    }
    expense.splits.forEach((split) => {
      if (balanceMap[split.memberId] !== undefined) {
        balanceMap[split.memberId].owed = round2(
          balanceMap[split.memberId].owed + split.amount
        );
      }
    });
  });

  return members.map((m) => {
    const { paid, owed } = balanceMap[m.id];
    return {
      memberId: m.id,
      name: m.name,
      initials: m.initials,
      color: m.color,
      totalPaid: paid,
      totalOwed: owed,
      netBalance: round2(paid - owed),
    };
  });
}

/**
 * Minimize settlements using greedy algorithm.
 * Positive balance = others owe you (creditor)
 * Negative balance = you owe others (debtor)
 */
export function calculateSettlements(
  balances: MemberBalance[],
  currency: string
): Omit<SettlementTransaction, 'id' | 'completed' | 'completedAt'>[] {
  const creditors = balances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({ ...b, remaining: b.netBalance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({ ...b, remaining: Math.abs(b.netBalance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const transactions: Omit<SettlementTransaction, 'id' | 'completed' | 'completedAt'>[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = round2(Math.min(creditors[ci].remaining, debtors[di].remaining));
    if (amount > 0.01) {
      transactions.push({
        from: debtors[di].memberId,
        to: creditors[ci].memberId,
        amount,
        currency: currency as import('./types').CurrencyCode,
      });
    }
    creditors[ci].remaining = round2(creditors[ci].remaining - amount);
    debtors[di].remaining = round2(debtors[di].remaining - amount);
    if (creditors[ci].remaining <= 0.01) ci++;
    if (debtors[di].remaining <= 0.01) di++;
  }

  return transactions;
}

/**
 * Generate full settlement transactions with IDs
 */
export function generateSettlements(
  members: Member[],
  expenses: Expense[],
  currency: string
): SettlementTransaction[] {
  const balances = calculateMemberBalances(members, expenses);
  const raw = calculateSettlements(balances, currency);
  return raw.map((t) => ({
    ...t,
    id: uuidv4(),
    completed: false,
  }));
}

/**
 * Get total expense in settlement currency
 */
export function getTotalExpense(expenses: Expense[]): number {
  return round2(expenses.reduce((sum, e) => sum + e.settlementAmount, 0));
}

/**
 * Get expenses grouped by category
 */
export function getExpensesByCategory(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  expenses.forEach((e) => {
    result[e.category] = round2((result[e.category] ?? 0) + e.settlementAmount);
  });
  return result;
}

/**
 * Get expenses grouped by date
 */
export function getExpensesByDate(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  expenses.forEach((e) => {
    const day = e.date.slice(0, 10);
    result[day] = round2((result[day] ?? 0) + e.settlementAmount);
  });
  return result;
}

/**
 * Build splits for a new expense
 */
export function buildSplits(
  mode: SplitMode,
  settlementAmount: number,
  participants: string[],
  customAmounts?: Record<string, number>,
  customPercentages?: Record<string, number>
): SplitDetail[] {
  switch (mode) {
    case 'equal':
      return calculateEqualSplits(settlementAmount, participants);
    case 'custom_amount':
      return participants.map((id) => ({
        memberId: id,
        amount: round2(customAmounts?.[id] ?? 0),
      }));
    case 'custom_percentage':
      return calculatePercentageSplits(
        settlementAmount,
        participants,
        customPercentages ?? {}
      );
    default:
      return calculateEqualSplits(settlementAmount, participants);
  }
}
