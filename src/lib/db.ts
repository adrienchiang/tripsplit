import { supabase } from './supabase';
import { Trip, Member, Expense, SettlementTransaction, SplitDetail, ExpenseCategory, SplitMode, CurrencyCode } from './types';

// ── Transform: Supabase rows → App types ────────────────────────

function toMember(row: any): Member {
  return { id: row.id, name: row.name, initials: row.initials, color: row.color };
}

function toSplit(row: any): SplitDetail {
  return {
    memberId: row.member_id,
    amount: parseFloat(row.amount),
    percentage: row.percentage != null ? parseFloat(row.percentage) : undefined,
  };
}

function toExpense(row: any): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    originalAmount: parseFloat(row.original_amount),
    originalCurrency: row.original_currency as CurrencyCode,
    exchangeRate: parseFloat(row.exchange_rate),
    settlementAmount: parseFloat(row.settlement_amount),
    paidBy: row.paid_by,
    date: row.date,
    category: row.category as ExpenseCategory,
    participants: row.participants ?? [],
    splitMode: row.split_mode as SplitMode,
    splits: (row.expense_splits ?? []).map(toSplit),
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}

function toSettlement(row: any): SettlementTransaction {
  return {
    id: row.id,
    from: row.from_member,
    to: row.to_member,
    amount: parseFloat(row.amount),
    currency: row.currency as CurrencyCode,
    completed: row.completed,
    completedAt: row.completed_at ?? undefined,
  };
}

function toTrip(row: any): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    description: row.description ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    members: (row.members ?? []).map(toMember),
    settlementCurrency: row.settlement_currency as CurrencyCode,
    commonCurrencies: row.common_currencies ?? [],
    exchangeRates: row.exchange_rates ?? {},
    expenses: (row.expenses ?? [])
      .map(toExpense)
      .sort((a: Expense, b: Expense) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    settlements: (row.settlements ?? []).map(toSettlement),
    createdAt: row.created_at,
  };
}

// ── Fetch ────────────────────────────────────────────────────────

export async function fetchAllTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      members (*),
      expenses ( *, expense_splits (*) ),
      settlements (*)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTrip);
}

export async function fetchTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      members (*),
      expenses ( *, expense_splits (*) ),
      settlements (*)
    `)
    .eq('id', tripId)
    .single();
  if (error) return null;
  return toTrip(data);
}

// ── Trip CRUD ────────────────────────────────────────────────────

export async function createTripInDB(trip: Trip): Promise<void> {
  const { error } = await supabase.from('trips').insert({
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    description: trip.description,
    start_date: trip.startDate,
    end_date: trip.endDate,
    settlement_currency: trip.settlementCurrency,
    common_currencies: trip.commonCurrencies,
    exchange_rates: trip.exchangeRates,
  });
  if (error) throw error;

  if (trip.members.length > 0) {
    const { error: mErr } = await supabase.from('members').insert(
      trip.members.map((m) => ({
        id: m.id, trip_id: trip.id, name: m.name, initials: m.initials, color: m.color,
      }))
    );
    if (mErr) throw mErr;
  }
}

export async function updateTripInDB(id: string, data: Partial<Trip>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.destination !== undefined) updates.destination = data.destination;
  if (data.description !== undefined) updates.description = data.description;
  if (data.startDate !== undefined) updates.start_date = data.startDate;
  if (data.endDate !== undefined) updates.end_date = data.endDate;
  if (data.settlementCurrency !== undefined) updates.settlement_currency = data.settlementCurrency;
  if (data.commonCurrencies !== undefined) updates.common_currencies = data.commonCurrencies;
  if (data.exchangeRates !== undefined) updates.exchange_rates = data.exchangeRates;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('trips').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTripInDB(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

// ── Member CRUD ──────────────────────────────────────────────────

export async function addMemberInDB(tripId: string, member: Member): Promise<void> {
  const { error } = await supabase.from('members').insert({
    id: member.id,
    trip_id: tripId,
    name: member.name,
    initials: member.initials,
    color: member.color,
  });
  if (error) throw error;
}

export async function removeMemberInDB(memberId: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', memberId);
  if (error) throw error;
}

// ── Expense CRUD ─────────────────────────────────────────────────

export async function addExpenseInDB(expense: Expense): Promise<void> {
  const { error } = await supabase.from('expenses').insert({
    id: expense.id,
    trip_id: expense.tripId,
    name: expense.name,
    original_amount: expense.originalAmount,
    original_currency: expense.originalCurrency,
    exchange_rate: expense.exchangeRate,
    settlement_amount: expense.settlementAmount,
    paid_by: expense.paidBy,
    date: expense.date,
    category: expense.category,
    participants: expense.participants,
    split_mode: expense.splitMode,
    notes: expense.notes,
  });
  if (error) throw error;

  if (expense.splits.length > 0) {
    const { error: sErr } = await supabase.from('expense_splits').insert(
      expense.splits.map((s) => ({
        expense_id: expense.id,
        member_id: s.memberId,
        amount: s.amount,
        percentage: s.percentage ?? null,
      }))
    );
    if (sErr) throw sErr;
  }
}

export async function updateExpenseInDB(expenseId: string, data: Partial<Expense>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.originalAmount !== undefined) updates.original_amount = data.originalAmount;
  if (data.originalCurrency !== undefined) updates.original_currency = data.originalCurrency;
  if (data.exchangeRate !== undefined) updates.exchange_rate = data.exchangeRate;
  if (data.settlementAmount !== undefined) updates.settlement_amount = data.settlementAmount;
  if (data.paidBy !== undefined) updates.paid_by = data.paidBy;
  if (data.date !== undefined) updates.date = data.date;
  if (data.category !== undefined) updates.category = data.category;
  if (data.participants !== undefined) updates.participants = data.participants;
  if (data.splitMode !== undefined) updates.split_mode = data.splitMode;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('expenses').update(updates).eq('id', expenseId);
    if (error) throw error;
  }

  if (data.splits !== undefined) {
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
    if (data.splits.length > 0) {
      const { error: sErr } = await supabase.from('expense_splits').insert(
        data.splits.map((s) => ({
          expense_id: expenseId,
          member_id: s.memberId,
          amount: s.amount,
          percentage: s.percentage ?? null,
        }))
      );
      if (sErr) throw sErr;
    }
  }
}

export async function deleteExpenseInDB(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

// ── Settlements ──────────────────────────────────────────────────

export async function upsertSettlementsInDB(tripId: string, settlements: SettlementTransaction[]): Promise<void> {
  await supabase.from('settlements').delete().eq('trip_id', tripId).eq('completed', false);
  if (settlements.length === 0) return;
  const { error } = await supabase.from('settlements').insert(
    settlements.map((s) => ({
      id: s.id,
      trip_id: tripId,
      from_member: s.from,
      to_member: s.to,
      amount: s.amount,
      currency: s.currency,
      completed: s.completed,
      completed_at: s.completedAt ?? null,
    }))
  );
  if (error) throw error;
}

export async function markSettlementInDB(settlementId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('settlements')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', settlementId);
  if (error) throw error;
}
