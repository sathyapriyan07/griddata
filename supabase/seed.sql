-- FOneGrid Seed Data
-- Seeds a minimal dataset for development/testing

-- Insert a few seasons
INSERT INTO seasons (year) VALUES
  (2023),
  (2024),
  (2025)
ON CONFLICT (year) DO NOTHING;

-- Insert a few circuits (key current circuits)
INSERT INTO circuits (circuit_id, name, location, country, lat, lng, length_km, first_gp_year, turns) VALUES
  ('bahrain', 'Bahrain International Circuit', 'Sakhir', 'Bahrain', 26.0325, 50.5106, 5.412, 2004, 15),
  ('jeddah', 'Jeddah Corniche Circuit', 'Jeddah', 'Saudi Arabia', 21.6319, 39.1044, 6.175, 2021, 27),
  ('albert_park', 'Albert Park Circuit', 'Melbourne', 'Australia', -37.8497, 144.968, 5.278, 1996, 14),
  ('baku', 'Baku City Circuit', 'Baku', 'Azerbaijan', 40.3725, 49.8533, 6.003, 2016, 20),
  ('catalunya', 'Circuit de Barcelona-Catalunya', 'Barcelona', 'Spain', 41.57, 2.2611, 4.675, 1991, 16),
  ('monaco', 'Circuit de Monaco', 'Monte Carlo', 'Monaco', 43.7347, 7.4206, 3.337, 1950, 19),
  ('silverstone', 'Silverstone Circuit', 'Silverstone', 'United Kingdom', 52.0786, -1.0169, 5.891, 1950, 18),
  ('spa', 'Circuit de Spa-Francorchamps', 'Spa', 'Belgium', 50.4372, 5.9714, 7.004, 1950, 19),
  ('monza', 'Autodromo Nazionale di Monza', 'Monza', 'Italy', 45.6156, 9.2811, 5.793, 1950, 11),
  ('marina_bay', 'Marina Bay Street Circuit', 'Singapore', 'Singapore', 1.2914, 103.864, 5.063, 2008, 23),
  ('suzuka', 'Suzuka International Racing Course', 'Suzuka', 'Japan', 34.8431, 136.541, 5.807, 1987, 18),
  ('yas_marina', 'Yas Marina Circuit', 'Abu Dhabi', 'United Arab Emirates', 24.4672, 54.6031, 5.281, 2009, 16),
  ('interlagos', 'Autódromo José Carlos Pace', 'São Paulo', 'Brazil', -23.7036, -46.6997, 4.309, 1973, 15),
  ('red_bull_ring', 'Red Bull Ring', 'Spielberg', 'Austria', 47.2197, 14.7647, 4.318, 1970, 10),
  ('miami', 'Miami International Autodrome', 'Miami', 'United States', 25.9581, -80.2389, 5.412, 2022, 19),
  ('losail', 'Losail International Circuit', 'Lusail', 'Qatar', 25.49, 51.4542, 5.38, 2021, 16),
  ('cota', 'Circuit of the Americas', 'Austin', 'United States', 30.1328, -97.6411, 5.513, 2012, 20),
  ('hungaroring', 'Hungaroring', 'Budapest', 'Hungary', 47.5789, 19.2486, 4.381, 1986, 14),
  ('zandvoort', 'Circuit Zandvoort', 'Zandvoort', 'Netherlands', 52.3888, 4.5409, 4.259, 1952, 14),
  ('imola', 'Autodromo Internazionale Enzo e Dino Ferrari', 'Imola', 'Italy', 44.3439, 11.7167, 4.909, 1980, 19),
  ('shanghai', 'Shanghai International Circuit', 'Shanghai', 'China', 31.3389, 121.22, 5.451, 2004, 16),
  ('vegas', 'Las Vegas Strip Circuit', 'Las Vegas', 'United States', 36.1147, -115.173, 6.201, 2023, 17)
ON CONFLICT (circuit_id) DO NOTHING;

-- Insert current constructors
INSERT INTO constructors (constructor_id, name, nationality, founded_year, principal, base, engine_supplier) VALUES
  ('red_bull', 'Red Bull Racing', 'Austrian', 2005, 'Christian Horner', 'Milton Keynes, United Kingdom', 'Honda RBPT'),
  ('mercedes', 'Mercedes', 'German', 1970, 'Toto Wolff', 'Brackley, United Kingdom', 'Mercedes'),
  ('ferrari', 'Ferrari', 'Italian', 1950, 'Frédéric Vasseur', 'Maranello, Italy', 'Ferrari'),
  ('mclaren', 'McLaren', 'British', 1966, 'Andrea Stella', 'Woking, United Kingdom', 'Mercedes'),
  ('aston_martin', 'Aston Martin', 'British', 2018, 'Mike Krack', 'Silverstone, United Kingdom', 'Mercedes'),
  ('alpine', 'Alpine F1 Team', 'French', 1986, 'Oliver Oakes', 'Enstone, United Kingdom', 'Renault'),
  ('williams', 'Williams', 'British', 1978, 'James Vowles', 'Grove, United Kingdom', 'Mercedes'),
  ('rb', 'Visa Cash App RB', 'Italian', 2006, 'Laurent Mekies', 'Faenza, Italy', 'Honda RBPT'),
  ('haas', 'Haas F1 Team', 'American', 2016, 'Ayao Komatsu', 'Kannapolis, United States', 'Ferrari'),
  ('sauber', 'Stake F1 Team Kick Sauber', 'Swiss', 1993, 'Mattia Binotto', 'Hinwil, Switzerland', 'Ferrari')
ON CONFLICT (constructor_id) DO NOTHING;

-- Insert current drivers
INSERT INTO drivers (driver_id, given_name, family_name, dob, nationality) VALUES
  ('max_verstappen', 'Max', 'Verstappen', '1997-09-30', 'Dutch'),
  ('sergio_perez', 'Sergio', 'Pérez', '1990-01-26', 'Mexican'),
  ('lewis_hamilton', 'Lewis', 'Hamilton', '1985-01-07', 'British'),
  ('george_russell', 'George', 'Russell', '1998-02-15', 'British'),
  ('charles_leclerc', 'Charles', 'Leclerc', '1997-10-16', 'Monegasque'),
  ('carlos_sainz', 'Carlos', 'Sainz', '1994-09-01', 'Spanish'),
  ('lando_norris', 'Lando', 'Norris', '1999-11-13', 'British'),
  ('oscar_piastri', 'Oscar', 'Piastri', '2001-04-06', 'Australian'),
  ('fernando_alonso', 'Fernando', 'Alonso', '1981-07-29', 'Spanish'),
  ('lance_stroll', 'Lance', 'Stroll', '1998-10-29', 'Canadian'),
  ('pierre_gasly', 'Pierre', 'Gasly', '1996-02-07', 'French'),
  ('esteban_ocon', 'Esteban', 'Ocon', '1996-09-17', 'French'),
  ('alexander_albon', 'Alexander', 'Albon', '1996-03-23', 'Thai'),
  ('franco_colapinto', 'Franco', 'Colapinto', '2003-05-27', 'Argentine'),
  ('yuki_tsunoda', 'Yuki', 'Tsunoda', '2000-05-11', 'Japanese'),
  ('daniel_ricciardo', 'Daniel', 'Ricciardo', '1989-07-01', 'Australian'),
  ('kevin_magnussen', 'Kevin', 'Magnussen', '1992-10-05', 'Danish'),
  ('nico_hulkenberg', 'Nico', 'Hülkenberg', '1987-08-19', 'German'),
  ('valtteri_bottas', 'Valtteri', 'Bottas', '1989-08-28', 'Finnish'),
  ('zhou_guanyu', 'Zhou', 'Guanyu', '1999-05-30', 'Chinese')
ON CONFLICT (driver_id) DO NOTHING;

-- Driver-Constructor assignments for 2024
INSERT INTO driver_constructor_history (driver_id, constructor_id, season_year)
SELECT d.id, c.id, 2024
FROM drivers d, constructors c
WHERE (d.driver_id, c.constructor_id) IN (
  ('max_verstappen', 'red_bull'),
  ('sergio_perez', 'red_bull'),
  ('lewis_hamilton', 'mercedes'),
  ('george_russell', 'mercedes'),
  ('charles_leclerc', 'ferrari'),
  ('carlos_sainz', 'ferrari'),
  ('lando_norris', 'mclaren'),
  ('oscar_piastri', 'mclaren'),
  ('fernando_alonso', 'aston_martin'),
  ('lance_stroll', 'aston_martin'),
  ('pierre_gasly', 'alpine'),
  ('esteban_ocon', 'alpine'),
  ('alexander_albon', 'williams'),
  ('franco_colapinto', 'williams'),
  ('yuki_tsunoda', 'rb'),
  ('daniel_ricciardo', 'rb'),
  ('kevin_magnussen', 'haas'),
  ('nico_hulkenberg', 'haas'),
  ('valtteri_bottas', 'sauber'),
  ('zhou_guanyu', 'sauber')
)
ON CONFLICT (driver_id, constructor_id, season_year) DO NOTHING;

-- Create initial admin profile (assumes user exists in auth.users)
-- INSERT INTO profiles (id, role, display_name)
-- VALUES ('REPLACE_WITH_USER_ID', 'admin', 'Admin')
-- ON CONFLICT (id) DO NOTHING;
