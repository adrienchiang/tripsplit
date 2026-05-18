'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Trip, Expense, Member, SettlementTransaction, CurrencyCode, MEMBER_COLORS } from './types';
import { generateSettlements, buildSplits } from './calculations';
import { getInitials } from './utils';
import * as db from './db';
import { supabase } from './supabase';

interface TripStore {
  trips: Trip[];
  currentTripId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Init & sync
  initialize: () => Promise<void>;
  reloadTrip: (tripId: string) => Promise<void>;

  // Trip actions
  setCurrentTrip: (id: string) => void;
  createTrip: (data: Omit<Trip, 'id' | 'expenses' | 'settlements' | 'createdAt'>) => string;
  updateTrip: (id: string, data: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  // Expense actions
  addExpense: (tripId: string, expense: Omit<Expense, 'id' | 'tripId' | 'createdAt'>) => void;
  updateExpense: (tripId: string, expenseId: string, data: Partial<Expense>) => void;
  deleteExpense: (tripId: string, expenseId: string) => void;

  // Member actions
  addMember: (tripId: string, name: string) => void;
  removeMember: (tripId: string, memberId: string) => void;

  // Currency actions
  updateExchangeRate: (tripId: string, from: CurrencyCode, to: CurrencyCode, rate: number) => void;

  // Settlement actions
  refreshSettlements: (tripId: string) => void;
  markSettlementComplete: (tripId: string, settlementId: string) => void;
  unmarkSettlementComplete: (tripId: string, settlementId: string) => void;

  // Getters
  getCurrentTrip: () => Trip | null;
  getTripById: (id: string) => Trip | null;
}

export const useTripStore = create<TripStore>()((set, get) => ({
  trips: [],
  currentTripId: null,
  isLoading: false,
  isInitialized: false,

  // ── Init ────────────────────────────────────────────────────────

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const trips = await db.fetchAllTrips();
      set({ trips, isLoading: false, isInitialized: true });

      // Real-time: reload the affected trip on any DB change
      supabase
        .channel('tripsplit-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' },
          (payload: any) => {
            const tripId = payload.new?.trip_id ?? payload.old?.trip_id;
            if (tripId) get().reloadTrip(tripId);
          })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' },
          () => {
            const id = get().currentTripId;
            if (id) get().reloadTrip(id);
          })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' },
          (payload: any) => {
            const tripId = payload.new?.trip_id ?? payload.old?.trip_id;
            if (tripId) get().reloadTrip(tripId);
          })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' },
          (payload: any) => {
            const tripId = payload.new?.trip_id ?? payload.old?.trip_id;
            if (tripId) get().reloadTrip(tripId);
          })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' },
          async () => {
            const trips = await db.fetchAllTrips();
            set({ trips });
          })
        .subscribe();
    } catch (err) {
      console.error('Supabase init error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  reloadTrip: async (tripId: string) => {
    const updated = await db.fetchTrip(tripId);
    if (!updated) return;
    set((s) => ({
      trips: s.trips.map((t) => (t.id === tripId ? updated : t)),
    }));
  },

  // ── Trip actions ─────────────────────────────────────────────────

  setCurrentTrip: (id) => set({ currentTripId: id }),

  createTrip: (data) => {
    const id = uuidv4();
    const trip: Trip = { ...data, id, expenses: [], settlements: [], createdAt: new Date().toISOString() };
    set((s) => ({ trips: [...s.trips, trip], currentTripId: id }));
    db.createTripInDB(trip).catch(console.error);
    return id;
  },

  updateTrip: (id, data) => {
    set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
    db.updateTripInDB(id, data).catch(console.error);
  },

  deleteTrip: (id) => {
    set((s) => ({
      trips: s.trips.filter((t) => t.id !== id),
      currentTripId: s.currentTripId === id ? null : s.currentTripId,
    }));
    db.deleteTripInDB(id).catch(console.error);
  },

  // ── Expense actions ──────────────────────────────────────────────

  addExpense: (tripId, expenseData) => {
    const expense: Expense = {
      ...expenseData, id: uuidv4(), tripId, createdAt: new Date().toISOString(),
    };
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, expenses: [...t.expenses, expense] } : t
      ),
    }));
    db.addExpenseInDB(expense).catch(console.error);
    get().refreshSettlements(tripId);
  },

  updateExpense: (tripId, expenseId, data) => {
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId
          ? { ...t, expenses: t.expenses.map((e) => (e.id === expenseId ? { ...e, ...data } : e)) }
          : t
      ),
    }));
    db.updateExpenseInDB(expenseId, data).catch(console.error);
    get().refreshSettlements(tripId);
  },

  deleteExpense: (tripId, expenseId) => {
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) } : t
      ),
    }));
    db.deleteExpenseInDB(expenseId).catch(console.error);
    get().refreshSettlements(tripId);
  },

  // ── Member actions ───────────────────────────────────────────────

  addMember: (tripId, name) => {
    const trip = get().getTripById(tripId);
    if (!trip) return;
    const newMember: Member = {
      id: uuidv4(), name, initials: getInitials(name),
      color: MEMBER_COLORS[trip.members.length % MEMBER_COLORS.length],
    };
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, members: [...t.members, newMember] } : t
      ),
    }));
    db.addMemberInDB(tripId, newMember)
      .then(async () => {
        const trip = await db.fetchTrip(tripId);
        alert(`DB已儲存！資料庫現有成員數: ${trip?.members.length ?? 0} 人`);
      })
      .catch((err) => {
        console.error('addMember DB error:', err);
        alert('儲存成員失敗: ' + (err?.message ?? err));
      });
  },

  removeMember: (tripId, memberId) => {
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t
      ),
    }));
    db.removeMemberInDB(memberId).catch((err) => {
      console.error('removeMember DB error:', err);
      alert('刪除成員失敗: ' + (err?.message ?? err));
    });
  },

  // ── Currency actions ─────────────────────────────────────────────

  updateExchangeRate: (tripId, from, to, rate) => {
    const newRates = {
      ...get().getTripById(tripId)?.exchangeRates,
      [`${from}_${to}`]: rate,
      [`${to}_${from}`]: Math.round((1 / rate) * 10000) / 10000,
    };
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, exchangeRates: newRates } : t
      ),
    }));
    db.updateTripInDB(tripId, { exchangeRates: newRates }).catch(console.error);
  },

  // ── Settlement actions ───────────────────────────────────────────

  refreshSettlements: (tripId) => {
    const trip = get().getTripById(tripId);
    if (!trip) return;
    const settlements = generateSettlements(trip.members, trip.expenses, trip.settlementCurrency);
    set((s) => ({
      trips: s.trips.map((t) => (t.id === tripId ? { ...t, settlements } : t)),
    }));
    db.upsertSettlementsInDB(tripId, settlements).catch(console.error);
  },

  markSettlementComplete: (tripId, settlementId) => {
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              settlements: t.settlements.map((st) =>
                st.id === settlementId
                  ? { ...st, completed: true, completedAt: new Date().toISOString() }
                  : st
              ),
            }
          : t
      ),
    }));
    db.markSettlementInDB(settlementId, true).catch(console.error);
  },

  unmarkSettlementComplete: (tripId, settlementId) => {
    set((s) => ({
      trips: s.trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              settlements: t.settlements.map((st) =>
                st.id === settlementId ? { ...st, completed: false, completedAt: undefined } : st
              ),
            }
          : t
      ),
    }));
    db.markSettlementInDB(settlementId, false).catch(console.error);
  },

  // ── Getters ──────────────────────────────────────────────────────

  getCurrentTrip: () => {
    const { trips, currentTripId } = get();
    return trips.find((t) => t.id === currentTripId) ?? null;
  },
  getTripById: (id) => get().trips.find((t) => t.id === id) ?? null,
}));
