CREATE TABLE IF NOT EXISTS team_car_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(constructor_id, year)
);

CREATE INDEX IF NOT EXISTS idx_team_car_images_constructor ON team_car_images(constructor_id);
