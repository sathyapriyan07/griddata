-- Wikipedia Enrichment Tables
-- Stores editorial content from Wikipedia for drivers, constructors, circuits, races, and seasons

CREATE TABLE IF NOT EXISTS driver_wikipedia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB,
  sections JSONB,
  infobox JSONB,
  images JSONB,
  "references" TEXT[],
  categories JSONB,
  coordinates JSONB,
  revision_id INTEGER,
  last_updated TIMESTAMPTZ,
  page_url TEXT,
  short_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_wikipedia_entity ON driver_wikipedia(entity_id);
CREATE INDEX IF NOT EXISTS idx_driver_wikipedia_title ON driver_wikipedia(title);

CREATE TABLE IF NOT EXISTS constructor_wikipedia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL UNIQUE REFERENCES constructors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB,
  sections JSONB,
  infobox JSONB,
  images JSONB,
  "references" TEXT[],
  categories JSONB,
  coordinates JSONB,
  revision_id INTEGER,
  last_updated TIMESTAMPTZ,
  page_url TEXT,
  short_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constructor_wikipedia_entity ON constructor_wikipedia(entity_id);
CREATE INDEX IF NOT EXISTS idx_constructor_wikipedia_title ON constructor_wikipedia(title);

CREATE TABLE IF NOT EXISTS circuit_wikipedia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL UNIQUE REFERENCES circuits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB,
  sections JSONB,
  infobox JSONB,
  images JSONB,
  "references" TEXT[],
  categories JSONB,
  coordinates JSONB,
  revision_id INTEGER,
  last_updated TIMESTAMPTZ,
  page_url TEXT,
  short_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circuit_wikipedia_entity ON circuit_wikipedia(entity_id);
CREATE INDEX IF NOT EXISTS idx_circuit_wikipedia_title ON circuit_wikipedia(title);

CREATE TABLE IF NOT EXISTS race_wikipedia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL UNIQUE REFERENCES races(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB,
  sections JSONB,
  infobox JSONB,
  images JSONB,
  "references" TEXT[],
  categories JSONB,
  coordinates JSONB,
  revision_id INTEGER,
  last_updated TIMESTAMPTZ,
  page_url TEXT,
  short_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_race_wikipedia_entity ON race_wikipedia(entity_id);
CREATE INDEX IF NOT EXISTS idx_race_wikipedia_title ON race_wikipedia(title);

CREATE TABLE IF NOT EXISTS season_wikipedia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id INTEGER NOT NULL UNIQUE REFERENCES seasons(year) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB,
  sections JSONB,
  infobox JSONB,
  images JSONB,
  "references" TEXT[],
  categories JSONB,
  coordinates JSONB,
  revision_id INTEGER,
  last_updated TIMESTAMPTZ,
  page_url TEXT,
  short_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_wikipedia_entity ON season_wikipedia(entity_id);
CREATE INDEX IF NOT EXISTS idx_season_wikipedia_title ON season_wikipedia(title);

-- Full-text search vectors for Wikipedia content
ALTER TABLE driver_wikipedia ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(title, ''))
  ) STORED;

ALTER TABLE constructor_wikipedia ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(title, ''))
  ) STORED;

ALTER TABLE circuit_wikipedia ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(title, ''))
  ) STORED;

ALTER TABLE race_wikipedia ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(title, ''))
  ) STORED;

ALTER TABLE season_wikipedia ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(title, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_driver_wikipedia_search ON driver_wikipedia USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_constructor_wikipedia_search ON constructor_wikipedia USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_circuit_wikipedia_search ON circuit_wikipedia USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_race_wikipedia_search ON race_wikipedia USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_season_wikipedia_search ON season_wikipedia USING GIN(search_vector);

-- Updated_at triggers
CREATE TRIGGER update_driver_wikipedia_updated_at
  BEFORE UPDATE ON driver_wikipedia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constructor_wikipedia_updated_at
  BEFORE UPDATE ON constructor_wikipedia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_circuit_wikipedia_updated_at
  BEFORE UPDATE ON circuit_wikipedia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_race_wikipedia_updated_at
  BEFORE UPDATE ON race_wikipedia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_season_wikipedia_updated_at
  BEFORE UPDATE ON season_wikipedia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
