-- ================================================================
-- TripSplit 旅費分賬 - Supabase Database Schema
-- ================================================================
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TRIPS
-- ================================================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  settlement_currency TEXT NOT NULL DEFAULT 'HKD',
  common_currencies TEXT[] NOT NULL DEFAULT ARRAY['HKD', 'THB'],
  exchange_rates JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: link to auth user (enable when you add auth)
  -- owner_id UUID REFERENCES auth.users(id),
  created_by TEXT  -- name of trip creator for now
);

-- ================================================================
-- MEMBERS
-- ================================================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3f60ab',
  -- Optional future: link to auth user
  -- user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_trip_id ON members(trip_id);

-- ================================================================
-- EXPENSES
-- ================================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_amount NUMERIC(12, 2) NOT NULL,
  original_currency TEXT NOT NULL,
  exchange_rate NUMERIC(10, 6) NOT NULL DEFAULT 1,
  settlement_amount NUMERIC(12, 2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES members(id),
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'others',
  -- category: accommodation | transport | food | activities | shopping | others
  participants UUID[] NOT NULL DEFAULT '{}',
  split_mode TEXT NOT NULL DEFAULT 'equal',
  -- split_mode: equal | custom_amount | custom_percentage
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_date ON expenses(trip_id, date);
CREATE INDEX idx_expenses_category ON expenses(trip_id, category);

-- ================================================================
-- EXPENSE SPLITS
-- ================================================================
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  percentage NUMERIC(6, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_splits_member_id ON expense_splits(member_id);

-- ================================================================
-- SETTLEMENTS
-- ================================================================
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_member UUID NOT NULL REFERENCES members(id),
  to_member UUID NOT NULL REFERENCES members(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HKD',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_trip_id ON settlements(trip_id);

-- ================================================================
-- TRIGGER: auto-update updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY (optional, enable when auth is added)
-- ================================================================
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- EXAMPLE: Simple public access policy (no auth)
-- Use this if you want all users to read/write without login
-- ================================================================
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public access" ON trips FOR ALL USING (true) WITH CHECK (true);
-- (repeat for other tables)

-- ================================================================
-- USEFUL VIEWS
-- ================================================================

-- Member balance view
CREATE OR REPLACE VIEW member_balances AS
SELECT
  m.id AS member_id,
  m.trip_id,
  m.name,
  m.initials,
  m.color,
  COALESCE(SUM(CASE WHEN e.paid_by = m.id THEN e.settlement_amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(es.amount), 0) AS total_owed,
  COALESCE(SUM(CASE WHEN e.paid_by = m.id THEN e.settlement_amount ELSE 0 END), 0)
  - COALESCE(SUM(es.amount), 0) AS net_balance
FROM members m
LEFT JOIN expenses e ON e.trip_id = m.trip_id
LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.member_id = m.id
GROUP BY m.id, m.trip_id, m.name, m.initials, m.color;

-- Trip summary view
CREATE OR REPLACE VIEW trip_summaries AS
SELECT
  t.id,
  t.name,
  t.destination,
  t.start_date,
  t.end_date,
  t.settlement_currency,
  COUNT(DISTINCT m.id) AS member_count,
  COUNT(DISTINCT e.id) AS expense_count,
  COALESCE(SUM(e.settlement_amount), 0) AS total_amount
FROM trips t
LEFT JOIN members m ON m.trip_id = t.id
LEFT JOIN expenses e ON e.trip_id = t.id
GROUP BY t.id;
