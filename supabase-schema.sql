-- ================================================================
-- TripSplit 旅費分賬 - Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ───────────────────────────────────────────────────────

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3f60ab',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  participants UUID[] NOT NULL DEFAULT '{}',
  split_mode TEXT NOT NULL DEFAULT 'equal',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  percentage NUMERIC(6, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_members_trip ON members(trip_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expenses_date ON expenses(trip_id, date);
CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_settlements_trip ON settlements(trip_id);

-- ── Auto-update updated_at ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security: allow public access (no login required) ───

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON expense_splits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON settlements FOR ALL USING (true) WITH CHECK (true);

-- ── Enable Realtime ───────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
