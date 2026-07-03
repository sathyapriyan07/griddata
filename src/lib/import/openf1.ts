import { supabase } from "@/lib/supabase"
import type { Weather, TireStint, RaceSession } from "@/types/database"

const OPENF1_BASE = "https://api.openf1.org/v1"

interface OpenF1Meeting {
  meeting_key: number
  meeting_name: string
  circuit_key: number
  circuit_short_name: string
  country_key: number
  country_name: string
  date_start: string
  gmt_offset: string
  location: string
  year: number
}

interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  meeting_key: number
  date_start: string
  date_end: string
  gmt_offset: string
}

interface OpenF1Weather {
  session_key: number
  meeting_key: number
  air_temperature: number
  track_temperature: number
  rainfall: boolean
  wind_speed: number
  humidity: number
  date: string
}

interface OpenF1PitStop {
  session_key: number
  driver_number: number
  lap_number: number
  pit_duration: number
  driver_key?: number
}

interface OpenF1Stint {
  session_key: number
  driver_number: number
  compound: string
  lap_start: number
  lap_end: number
  tyre_age_at_start: number
}

async function fetchOpenF1<T>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${OPENF1_BASE}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return fetchOpenF1<OpenF1Meeting>("/meetings", { year: year.toString() })
}

export async function getSessions(meetingKey: number): Promise<OpenF1Session[]> {
  return fetchOpenF1<OpenF1Session>("/sessions", { meeting_key: meetingKey.toString() })
}

export async function getWeather(sessionKey: number): Promise<OpenF1Weather[]> {
  return fetchOpenF1<OpenF1Weather>("/weather", { session_key: sessionKey.toString() })
}

export async function getPitStops(sessionKey: number): Promise<OpenF1PitStop[]> {
  return fetchOpenF1<OpenF1PitStop>("/pit", { session_key: sessionKey.toString() })
}

export async function getStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return fetchOpenF1<OpenF1Stint>("/stints", { session_key: sessionKey.toString() })
}

const SESSION_TYPE_MAP: Record<string, string> = {
  "Practice 1": "FP1",
  "Practice 2": "FP2",
  "Practice 3": "FP3",
  "Qualifying": "Q",
  "Sprint Qualifying": "Sprint",
  "Sprint": "Sprint",
  "Race": "Race",
}

function mapSessionType(openf1Type: string): string | null {
  const lower = openf1Type.toLowerCase()
  if (lower.includes("practice 1") || lower.includes("fp1")) return "FP1"
  if (lower.includes("practice 2") || lower.includes("fp2")) return "FP2"
  if (lower.includes("practice 3") || lower.includes("fp3")) return "FP3"
  if (lower.includes("qualifying") && !lower.includes("sprint")) return "Q"
  if (lower.includes("sprint")) return "Sprint"
  if (lower.includes("race")) return "Race"
  return SESSION_TYPE_MAP[openf1Type] || null
}

async function findRaceForSession(
  sessionDate: string,
  circuitName: string,
  season: number
): Promise<string | null> {
  const sessionDay = sessionDate.substring(0, 10)

  const { data: races } = await supabase
    .from("races")
    .select("*, circuits!inner(name)")
    .eq("season_year", season)
    .gte("date", sessionDay)
    .lte("date", sessionDay)
    .limit(1)

  if (races && races.length > 0) {
    return (races[0] as unknown as { id: string }).id
  }

  const { data: weekRaces } = await supabase
    .from("races")
    .select("*, circuits!inner(name)")
    .eq("season_year", season)
    .gte("date", sessionDay)
    .lte("date", sessionDay + "T23:59:59Z")

  if (weekRaces && weekRaces.length > 0) {
    return (weekRaces[0] as unknown as { id: string }).id
  }

  const { data: nearby } = await supabase
    .from("races")
    .select("*, circuits!inner(name)")
    .eq("season_year", season)
    .gte("date", sessionDay)

  if (nearby && nearby.length > 0) {
    const circuitLower = circuitName.toLowerCase()
    const match = (nearby as unknown as { id: string; circuits: { name: string } }[]).find(
      (r) => r.circuits.name.toLowerCase().includes(circuitLower) ||
             circuitLower.includes(r.circuits.name.toLowerCase())
    )
    if (match) return match.id
  }

  return null
}

async function buildDriverNumberMap(meetingKey: number): Promise<Map<number, string>> {
  try {
    const response = await fetch(`${OPENF1_BASE}/drivers?meeting_key=${meetingKey}`)
    if (!response.ok) return new Map()

    const drivers: { driver_number: number; full_name: string }[] = await response.json()

    const { data: dbDrivers } = await supabase
      .from("drivers")
      .select("id, given_name, family_name")

    if (!dbDrivers) return new Map()

    const map = new Map<number, string>()
    for (const d of drivers) {
      const parts = d.full_name.toLowerCase().split(" ")
      const match = dbDrivers.find(
        (db) =>
          parts.includes(db.given_name.toLowerCase()) &&
          parts.includes(db.family_name.toLowerCase())
      )
      if (match) {
        map.set(d.driver_number, match.id)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

export async function syncOpenF1Season(
  year: number,
  onProgress?: (message: string) => void
): Promise<{ meetings: number; sessions: number; weather: number; stints: number }> {
  const log = onProgress || ((msg: string) => console.log(msg))
  log(`Fetching OpenF1 meetings for ${year}...`)
  const meetings = await getMeetings(year)
  log(`Found ${meetings.length} meetings`)

  const { data: circuits } = await supabase.from("circuits").select("id, name, circuit_id")
  const circuitMap = new Map<string, string>()
  circuits?.forEach((c) => {
    circuitMap.set(c.name.toLowerCase(), c.id)
    circuitMap.set(c.circuit_id.toLowerCase(), c.id)
  })

  let totalSessions = 0
  let totalWeather = 0
  let totalStints = 0

  for (const meeting of meetings) {
    log(`Processing meeting: ${meeting.meeting_name} (${meeting.circuit_short_name})`)

    const sessions = await getSessions(meeting.meeting_key)
    log(`  ${sessions.length} sessions found`)

    for (const session of sessions) {
      const sessionType = mapSessionType(session.session_type || session.session_name)
      if (!sessionType) {
        log(`  Skipping unknown session type: ${session.session_type}`)
        continue
      }

      const raceId = await findRaceForSession(
        session.date_start,
        meeting.circuit_short_name,
        year
      )

      if (!raceId) {
        log(`  Could not map session ${session.session_name} to a race`)
        continue
      }

      const sessionRecord: Omit<RaceSession, "id"> = {
        race_id: raceId,
        type: sessionType as RaceSession["type"],
        start_time: session.date_start,
        end_time: session.date_end || null,
      }

      const { error: sessionError } = await supabase
        .from("race_sessions")
        .upsert(sessionRecord, { onConflict: "race_id,type" })

      if (!sessionError) totalSessions++
      else log(`  Session upsert error: ${sessionError.message}`)

      const weatherData = await getWeather(session.session_key)
      if (weatherData.length > 0) {
        const latest = weatherData[weatherData.length - 1]
        const weatherRecord: Omit<Weather, "id"> = {
          race_id: raceId,
          session_id: null,
          air_temp: latest.air_temperature ?? null,
          track_temp: latest.track_temperature ?? null,
          rainfall: latest.rainfall ?? null,
          wind_speed: latest.wind_speed ?? null,
          humidity: latest.humidity ?? null,
        }

        const { error: weatherError } = await supabase
          .from("weather")
          .insert(weatherRecord)

        if (!weatherError) totalWeather++
        else log(`  Weather insert error: ${weatherError.message}`)
      }

      if (sessionType === "Race") {
        const stints = await getStints(session.session_key)
        if (stints.length > 0) {
          const driverNumberMap = await buildDriverNumberMap(meeting.meeting_key)
          for (const stint of stints) {
            const driverId = driverNumberMap.get(stint.driver_number)
            if (!driverId) continue

            const stintRecord: Omit<TireStint, "id"> = {
              race_id: raceId,
              driver_id: driverId,
              compound: stint.compound || null,
              stint_start_lap: stint.lap_start ?? null,
              stint_end_lap: stint.lap_end ?? null,
            }

            const { error: stintError } = await supabase
              .from("tire_stints")
              .insert(stintRecord)

            if (!stintError) totalStints++
            else log(`  Stint insert error: ${stintError.message}`)
          }
        }
      }
    }
  }

  log(`Sync complete: ${totalSessions} sessions, ${totalWeather} weather records, ${totalStints} stints`)
  return { meetings: meetings.length, sessions: totalSessions, weather: totalWeather, stints: totalStints }
}
