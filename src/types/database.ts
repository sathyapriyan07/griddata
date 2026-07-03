export interface Database {
  public: {
    Tables: {
      seasons: {
        Row: Season
        Insert: Omit<Season, "id">
        Update: Partial<Omit<Season, "id">>
      }
      circuits: {
        Row: Circuit
        Insert: Omit<Circuit, "id">
        Update: Partial<Omit<Circuit, "id">>
      }
      constructors: {
        Row: Constructor
        Insert: Omit<Constructor, "id">
        Update: Partial<Omit<Constructor, "id">>
      }
      drivers: {
        Row: Driver
        Insert: Omit<Driver, "id">
        Update: Partial<Omit<Driver, "id">>
      }
      races: {
        Row: Race
        Insert: Omit<Race, "id">
        Update: Partial<Omit<Race, "id">>
      }
      race_sessions: {
        Row: RaceSession
        Insert: Omit<RaceSession, "id">
        Update: Partial<Omit<RaceSession, "id">>
      }
      qualifying_results: {
        Row: QualifyingResult
        Insert: Omit<QualifyingResult, "id">
        Update: Partial<Omit<QualifyingResult, "id">>
      }
      race_results: {
        Row: RaceResult
        Insert: Omit<RaceResult, "id">
        Update: Partial<Omit<RaceResult, "id">>
      }
      sprint_results: {
        Row: SprintResult
        Insert: Omit<SprintResult, "id">
        Update: Partial<Omit<SprintResult, "id">>
      }
      pit_stops: {
        Row: PitStop
        Insert: Omit<PitStop, "id">
        Update: Partial<Omit<PitStop, "id">>
      }
      driver_standings: {
        Row: DriverStanding
        Insert: Omit<DriverStanding, "id">
        Update: Partial<Omit<DriverStanding, "id">>
      }
      constructor_standings: {
        Row: ConstructorStanding
        Insert: Omit<ConstructorStanding, "id">
        Update: Partial<Omit<ConstructorStanding, "id">>
      }
      driver_constructor_history: {
        Row: DriverConstructorHistory
        Insert: Omit<DriverConstructorHistory, "id">
        Update: Partial<Omit<DriverConstructorHistory, "id">>
      }
      weather: {
        Row: Weather
        Insert: Omit<Weather, "id">
        Update: Partial<Omit<Weather, "id">>
      }
      tire_stints: {
        Row: TireStint
        Insert: Omit<TireStint, "id">
        Update: Partial<Omit<TireStint, "id">>
      }
      sync_jobs: {
        Row: SyncJob
        Insert: Omit<SyncJob, "id">
        Update: Partial<Omit<SyncJob, "id">>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "id">
        Update: Partial<Omit<Profile, "id">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface Season {
  id: string
  year: number
  url: string | null
}

export interface Circuit {
  id: string
  circuit_id: string
  name: string
  location: string
  country: string
  lat: number | null
  lng: number | null
  length_km: number | null
  first_gp_year: number | null
  turns: number | null
  direction: string | null
  image_url: string | null
  source: string
  is_manually_edited: boolean
  created_at: string
  updated_at: string
}

export interface Constructor {
  id: string
  constructor_id: string
  name: string
  nationality: string | null
  founded_year: number | null
  principal: string | null
  base: string | null
  engine_supplier: string | null
  logo_url: string | null
  car_image_url: string | null
  source: string
  is_manually_edited: boolean
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  driver_id: string
  given_name: string
  family_name: string
  dob: string | null
  nationality: string | null
  photo_url: string | null
  bio: string | null
  source: string
  is_manually_edited: boolean
  created_at: string
  updated_at: string
}

export interface Race {
  id: string
  season_year: number
  round: number
  circuit_id: string
  name: string
  date: string
  time: string | null
  url: string | null
  laps: number | null
  distance_km: number | null
  source: string
  is_manually_edited: boolean
  created_at: string
  updated_at: string
}

export type SessionType = "FP1" | "FP2" | "FP3" | "Q" | "Sprint" | "Race"

export interface RaceSession {
  id: string
  race_id: string
  type: SessionType
  start_time: string | null
  end_time: string | null
}

export interface QualifyingResult {
  id: string
  race_id: string
  driver_id: string
  constructor_id: string
  position: number | null
  q1: string | null
  q2: string | null
  q3: string | null
}

export interface RaceResult {
  id: string
  race_id: string
  driver_id: string
  constructor_id: string
  grid: number | null
  position: number | null
  position_text: string | null
  points: number
  laps: number | null
  status: string | null
  fastest_lap_time: string | null
  fastest_lap_rank: number | null
  time: string | null
}

export interface SprintResult {
  id: string
  race_id: string
  driver_id: string
  constructor_id: string
  grid: number | null
  position: number | null
  points: number
  laps: number | null
  status: string | null
}

export interface PitStop {
  id: string
  race_id: string
  driver_id: string
  lap: number
  duration_ms: number | null
  stop_number: number
}

export interface DriverStanding {
  id: string
  season_year: number
  driver_id: string
  race_id: string | null
  points: number
  position: number | null
  wins: number
}

export interface ConstructorStanding {
  id: string
  season_year: number
  constructor_id: string
  race_id: string | null
  points: number
  position: number | null
  wins: number
}

export interface DriverConstructorHistory {
  id: string
  driver_id: string
  constructor_id: string
  season_year: number
}

export interface Weather {
  id: string
  race_id: string
  session_id: string | null
  air_temp: number | null
  track_temp: number | null
  rainfall: boolean | null
  wind_speed: number | null
  humidity: number | null
}

export interface TireStint {
  id: string
  race_id: string
  driver_id: string
  compound: string | null
  stint_start_lap: number | null
  stint_end_lap: number | null
}

export interface SyncJob {
  id: string
  source: "jolpica" | "openf1"
  entity_type: string
  status: "pending" | "running" | "completed" | "failed"
  started_at: string | null
  finished_at: string | null
  log: string | null
  created_by: string | null
}

export interface Profile {
  id: string
  role: "public" | "admin"
  display_name: string | null
  avatar_url: string | null
}
