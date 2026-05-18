'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Trip, Expense, Member, SettlementTransaction, CurrencyCode } from './types';
import { mockTrip } from './mockData';
import { generateSettlements, buildSplits } from './calculations';
import { getInitials } from './utils';
import { MEMBER_COLORS } from './types';

interface TripStore {
  trips: Trip[];
  currentTripId: string | null;

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

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: [mockTrip],
      currentTripId: mockTrip.id,

      setCurrentTrip: (id) => set({ currentTripId: id }),

      createTrip: (data) => {
        const id = uuidv4();
        const trip: Trip = {
          ...data,
          id,
          expenses: [],
          settlements: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ trips: [...s.trips, trip], currentTripId: id }));
        return id;
      },

      updateTrip: (id, data) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      deleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          currentTripId: s.currentTripId === id ? null : s.currentTripId,
        })),

      addExpense: (tripId, expenseData) => {
        const expense: Expense = {
          ...expenseData,
          id: uuidv4(),
          tripId,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, expenses: [...t.expenses, expense] } : t
          ),
        }));
        get().refreshSettlements(tripId);
      },

      updateExpense: (tripId, expenseId, data) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  expenses: t.expenses.map((e) =>
                    e.id === expenseId ? { ...e, ...data } : e
                  ),
                }
              : t
          ),
        }));
        get().refreshSettlements(tripId);
      },

      deleteExpense: (tripId, expenseId) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) }
              : t
          ),
        }));
        get().refreshSettlements(tripId);
      },

      addMember: (tripId, name) => {
        const trip = get().getTripById(tripId);
        if (!trip) return;
        const newMember: Member = {
          id: uuidv4(),
          name,
          initials: getInitials(name),
          color: MEMBER_COLORS[trip.members.length % MEMBER_COLORS.length],
        };
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, members: [...t.members, newMember] } : t
          ),
        }));
      },

      removeMember: (tripId, memberId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
              : t
          ),
        })),

      updateExchangeRate: (tripId, from, to, rate) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  exchangeRates: {
                    ...t.exchangeRates,
                    [`${from}_${to}`]: rate,
                    [`${to}_${from}`]: Math.round((1 / rate) * 10000) / 10000,
                  },
                }
              : t
          ),
        })),

      refreshSettlements: (tripId) => {
        const trip = get().getTripById(tripId);
        if (!trip) return;
        const settlements = generateSettlements(
          trip.members,
          trip.expenses,
          trip.settlementCurrency
        );
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, settlements } : t
          ),
        }));
      },

      markSettlementComplete: (tripId, settlementId) =>
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
        })),

      unmarkSettlementComplete: (tripId, settlementId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  settlements: t.settlements.map((st) =>
                    st.id === settlementId
                      ? { ...st, completed: false, completedAt: undefined }
                      : st
                  ),
                }
              : t
          ),
        })),

      getCurrentTrip: () => {
        const { trips, currentTripId } = get();
        return trips.find((t) => t.id === currentTripId) ?? null;
      },

      getTripById: (id) => get().trips.find((t) => t.id === id) ?? null,
    }),
    {
      name: 'tripsplit-storage',
    }
  )
);
