-- FOneGrid Database Schema
-- Core tables mirroring Ergast/Jolpica schema with extensions for OpenF1 data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circuits
CREATE TABLE circuits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circuit_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  length_km DOUBLE PRECISION,
  first_gp_year INTEGER,
  turns INTEGER,
  direction TEXT,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'jolpica',
  is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constructors
CREATE TABLE constructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constructor_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  nationality TEXT,
  founded_year INTEGER,
  principal TEXT,
  base TEXT,
  engine_supplier TEXT,
  logo_url TEXT,
  source TEXT NOT NULL DEFAULT 'jolpica',
  is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id TEXT NOT NULL UNIQUE,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  dob DATE,
  nationality TEXT,
  photo_url TEXT,
  bio TEXT,
  source TEXT NOT NULL DEFAULT 'jolpica',
  is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Races
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_year INTEGER NOT NULL REFERENCES seasons(year) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  url TEXT,
  laps INTEGER,
  distance_km DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'jolpica',
  is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_year, round)
);

CREATE INDEX idx_races_season ON races(season_year);
CREATE INDEX idx_races_circuit ON races(circuit_id);

-- Race Sessions (FP1/FP2/FP3/Q/Sprint/Race)
CREATE TABLE race_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('FP1', 'FP2', 'FP3', 'Q', 'Sprint', 'Race')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  UNIQUE(race_id, type)
);

-- Qualifying Results
CREATE TABLE qualifying_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  position INTEGER,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT
);

CREATE INDEX idx_qualifying_race ON qualifying_results(race_id);
CREATE INDEX idx_qualifying_driver ON qualifying_results(driver_id);

-- Race Results
CREATE TABLE race_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  grid INTEGER,
  position INTEGER,
  position_text TEXT,
  points DOUBLE PRECISION NOT NULL DEFAULT 0,
  laps INTEGER,
  status TEXT,
  fastest_lap_time TEXT,
  fastest_lap_rank INTEGER,
  time TEXT,
  UNIQUE(race_id, driver_id)
);

CREATE INDEX idx_race_results_race ON race_results(race_id);
CREATE INDEX idx_race_results_driver ON race_results(driver_id);
CREATE INDEX idx_race_results_constructor ON race_results(constructor_id);

-- Sprint Results
CREATE TABLE sprint_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  grid INTEGER,
  position INTEGER,
  points DOUBLE PRECISION NOT NULL DEFAULT 0,
  laps INTEGER,
  status TEXT,
  UNIQUE(race_id, driver_id)
);

-- Pit Stops
CREATE TABLE pit_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lap INTEGER NOT NULL,
  duration_ms INTEGER,
  stop_number INTEGER NOT NULL
);

CREATE INDEX idx_pit_stops_race ON pit_stops(race_id);

-- Driver Standings
CREATE TABLE driver_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_year INTEGER NOT NULL REFERENCES seasons(year) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  points DOUBLE PRECISION NOT NULL DEFAULT 0,
  position INTEGER,
  wins INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_year, driver_id, race_id)
);

CREATE INDEX idx_driver_standings_season ON driver_standings(season_year);
CREATE INDEX idx_driver_standings_driver ON driver_standings(driver_id);

-- Constructor Standings
CREATE TABLE constructor_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_year INTEGER NOT NULL REFERENCES seasons(year) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  points DOUBLE PRECISION NOT NULL DEFAULT 0,
  position INTEGER,
  wins INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_year, constructor_id, race_id)
);

CREATE INDEX idx_constructor_standings_season ON constructor_standings(season_year);
CREATE INDEX idx_constructor_standings_constructor ON constructor_standings(constructor_id);

-- Driver-Constructor History (which drivers drove for which constructors in which seasons)
CREATE TABLE driver_constructor_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL REFERENCES seasons(year) ON DELETE CASCADE,
  UNIQUE(driver_id, constructor_id, season_year)
);

-- Weather
CREATE TABLE weather (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  session_id UUID REFERENCES race_sessions(id) ON DELETE CASCADE,
  air_temp DOUBLE PRECISION,
  track_temp DOUBLE PRECISION,
  rainfall BOOLEAN,
  wind_speed DOUBLE PRECISION,
  humidity DOUBLE PRECISION
);

-- Tire Stints
CREATE TABLE tire_stints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  compound TEXT,
  stint_start_lap INTEGER,
  stint_end_lap INTEGER
);

-- Sync Jobs (audit log for external API imports)
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('jolpica', 'openf1')),
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  log TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Profiles (user roles for admin)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('public', 'admin')),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search support
ALTER TABLE drivers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(given_name, '') || ' ' || coalesce(family_name, '') || ' ' || coalesce(nationality, ''))
  ) STORED;

ALTER TABLE constructors ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(nationality, ''))
  ) STORED;

ALTER TABLE circuits ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(location, '') || ' ' || coalesce(country, ''))
  ) STORED;

ALTER TABLE races ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, ''))
  ) STORED;

CREATE INDEX idx_drivers_search ON drivers USING GIN(search_vector);
CREATE INDEX idx_constructors_search ON constructors USING GIN(search_vector);
CREATE INDEX idx_circuits_search ON circuits USING GIN(search_vector);
CREATE INDEX idx_races_search ON races USING GIN(search_vector);

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_drivers_name_trgm ON drivers USING GIN (lower(given_name || ' ' || family_name) gin_trgm_ops);
CREATE INDEX idx_constructors_name_trgm ON constructors USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX idx_circuits_name_trgm ON circuits USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX idx_races_name_trgm ON races USING GIN (lower(name) gin_trgm_ops);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_circuits_updated_at
  BEFORE UPDATE ON circuits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constructors_updated_at
  BEFORE UPDATE ON constructors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_races_updated_at
  BEFORE UPDATE ON races FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
