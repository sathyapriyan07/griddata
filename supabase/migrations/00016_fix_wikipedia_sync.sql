-- Fix sync_jobs CHECK constraint to allow 'wikipedia' source
ALTER TABLE sync_jobs DROP CONSTRAINT IF EXISTS sync_jobs_source_check;
ALTER TABLE sync_jobs ADD CONSTRAINT sync_jobs_source_check CHECK (source IN ('jolpica', 'openf1', 'wikipedia'));

-- Enable RLS on wikipedia tables
ALTER TABLE driver_wikipedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructor_wikipedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_wikipedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_wikipedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_wikipedia ENABLE ROW LEVEL SECURITY;

-- Public read access for wikipedia tables
CREATE POLICY "Public read access" ON driver_wikipedia FOR SELECT USING (true);
CREATE POLICY "Public read access" ON constructor_wikipedia FOR SELECT USING (true);
CREATE POLICY "Public read access" ON circuit_wikipedia FOR SELECT USING (true);
CREATE POLICY "Public read access" ON race_wikipedia FOR SELECT USING (true);
CREATE POLICY "Public read access" ON season_wikipedia FOR SELECT USING (true);

-- Admin write access for wikipedia tables
CREATE POLICY "Admin insert" ON driver_wikipedia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON driver_wikipedia FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON driver_wikipedia FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON constructor_wikipedia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON constructor_wikipedia FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON constructor_wikipedia FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON circuit_wikipedia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON circuit_wikipedia FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON circuit_wikipedia FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON race_wikipedia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON race_wikipedia FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON race_wikipedia FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON season_wikipedia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON season_wikipedia FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON season_wikipedia FOR DELETE USING (is_admin());
