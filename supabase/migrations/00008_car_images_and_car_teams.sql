-- Create car_images table: images per car per year
CREATE TABLE IF NOT EXISTS car_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(car_id, year)
);

CREATE INDEX IF NOT EXISTS idx_car_images_car ON car_images(car_id);

-- Many-to-many relationship between cars and constructors (teams)
CREATE TABLE IF NOT EXISTS car_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  constructor_id UUID NOT NULL REFERENCES constructors(id) ON DELETE CASCADE,
  assigned_from_year INTEGER,
  assigned_to_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(car_id, constructor_id, assigned_from_year)
);

CREATE INDEX IF NOT EXISTS idx_car_teams_car ON car_teams(car_id);
CREATE INDEX IF NOT EXISTS idx_car_teams_constructor ON car_teams(constructor_id);
