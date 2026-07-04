CREATE TABLE nationality_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nationality TEXT NOT NULL UNIQUE,
  flag_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_nationality_flags_updated_at
  BEFORE UPDATE ON nationality_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
