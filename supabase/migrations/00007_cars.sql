-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  engine_name TEXT,
  power_unit_name TEXT,
  chassis_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_name ON cars(name);
