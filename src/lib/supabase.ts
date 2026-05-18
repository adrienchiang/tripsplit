/**
 * Supabase client — future database integration.
 *
 * To activate:
 * 1. npm install @supabase/supabase-js
 * 2. Create .env.local with:
 *    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * 3. Uncomment the code below
 * 4. Replace localStorage calls in store.ts with Supabase queries
 */

// import { createClient } from '@supabase/supabase-js';
//
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ================================================================
// Example Supabase queries (replace store actions with these)
// ================================================================

// Fetch all trips
// const { data: trips, error } = await supabase
//   .from('trips')
//   .select(`
//     *,
//     members (*),
//     expenses (*, expense_splits (*))
//   `)
//   .order('created_at', { ascending: false });

// Create a trip
// const { data, error } = await supabase
//   .from('trips')
//   .insert({ name, destination, start_date, end_date, settlement_currency })
//   .select()
//   .single();

// Add an expense with splits (transaction)
// const { data: expense } = await supabase
//   .from('expenses')
//   .insert({ trip_id, name, original_amount, ... })
//   .select()
//   .single();
//
// await supabase.from('expense_splits').insert(
//   splits.map(s => ({ expense_id: expense.id, member_id: s.memberId, amount: s.amount }))
// );

// Real-time subscription (sync across devices)
// const channel = supabase
//   .channel('trip-changes')
//   .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
//     (payload) => { /* refresh store */ }
//   )
//   .subscribe();

export {};
