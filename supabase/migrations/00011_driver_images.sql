CREATE TABLE IF NOT EXISTS driver_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'event',
  year INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_images_driver ON driver_images(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_images_type ON driver_images(type);
