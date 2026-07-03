-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifying_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE pit_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructor_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_constructor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_stints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for all sport-data tables
CREATE POLICY "Public read access" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read access" ON circuits FOR SELECT USING (true);
CREATE POLICY "Public read access" ON constructors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON drivers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON races FOR SELECT USING (true);
CREATE POLICY "Public read access" ON race_sessions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON qualifying_results FOR SELECT USING (true);
CREATE POLICY "Public read access" ON race_results FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sprint_results FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pit_stops FOR SELECT USING (true);
CREATE POLICY "Public read access" ON driver_standings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON constructor_standings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON driver_constructor_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON weather FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tire_stints FOR SELECT USING (true);

-- Admin write access (checked via profiles table)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin insert/update/delete policies for sport-data tables
CREATE POLICY "Admin insert" ON seasons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON seasons FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON seasons FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON circuits FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON circuits FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON circuits FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON constructors FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON constructors FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON constructors FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON drivers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON drivers FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON drivers FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON races FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON races FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON races FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON race_sessions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON race_sessions FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON race_sessions FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON qualifying_results FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON qualifying_results FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON qualifying_results FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON race_results FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON race_results FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON race_results FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON sprint_results FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON sprint_results FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON sprint_results FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON pit_stops FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON pit_stops FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON pit_stops FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON driver_standings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON driver_standings FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON driver_standings FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON constructor_standings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON constructor_standings FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON constructor_standings FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON driver_constructor_history FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON driver_constructor_history FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON driver_constructor_history FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON weather FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON weather FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON weather FOR DELETE USING (is_admin());

CREATE POLICY "Admin insert" ON tire_stints FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON tire_stints FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete" ON tire_stints FOR DELETE USING (is_admin());

-- Sync jobs: admin-only access
CREATE POLICY "Admin read" ON sync_jobs FOR SELECT USING (is_admin());
CREATE POLICY "Admin insert" ON sync_jobs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update" ON sync_jobs FOR UPDATE USING (is_admin());

-- Profiles: users can read/update their own profile, admin can read/update all
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (NEW.id, 'public', NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
