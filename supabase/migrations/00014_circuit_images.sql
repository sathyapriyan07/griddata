CREATE TABLE IF NOT EXISTS circuit_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circuit_id UUID NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hero',
  year INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circuit_images_circuit ON circuit_images(circuit_id);
CREATE INDEX IF NOT EXISTS idx_circuit_images_type ON circuit_images(type);
