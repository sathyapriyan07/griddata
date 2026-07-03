import { supabase } from "@/lib/supabase"
import type {
  Season,
  Circuit,
  Constructor,
  Driver,
  Race,
  QualifyingResult,
  RaceResult,
  SprintResult,
  PitStop,
  DriverStanding,
  ConstructorStanding,
} from "@/types/database"

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"

interface JolpicaResponse<T> {
  MRData: {
    xmlns: string
    series: string
    url: string
    limit: string
    offset: string
    total: string
    RaceTable?: {
      season: string
      round?: string
      Races: T[]
    }
    StandingsTable?: {
      season: string
      StandingsLists: T[]
    }
    DriverTable?: {
      Drivers: T[]
    }
    ConstructorTable?: {
      Constructors: T[]
    }
    CircuitTable?: {
      Circuits: T[]
    }
    SeasonTable?: {
      Seasons: T[]
    }
  }
}

interface JolpicaSeason {
  season: string
  url: string
}

interface JolpicaCircuit {
  circuitId: string
  url: string
  circuitName: string
  Location: {
    lat: string
    long: string
    locality: string
    country: string
  }
}

interface JolpicaConstructor {
  constructorId: string
  url: string
  name: string
  nationality: string
}

interface JolpicaDriver {
  driverId: string
  permanentNumber?: string
  code: string
  url: string
  givenName: string
  familyName: string
  dateOfBirth: string
  nationality: string
}

interface JolpicaRace {
  season: string
  round: string
  url: string
  raceName: string
  Circuit: JolpicaCircuit
  date: string
  time: string
  Results?: JolpicaRaceResult[]
  QualifyingResults?: JolpicaQualifyingResult[]
  SprintResults?: JolpicaSprintResult[]
  PitStops?: JolpicaPitStop[]
}

interface JolpicaSprintResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  grid: string
  laps: string
  status: string
  Time?: {
    millis: string
    time: string
  }
}

interface JolpicaPitStop {
  driverId: string
  lap: string
  stop: string
  time: string
  duration: string
}

interface JolpicaQualifyingResult {
  number: string
  position: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  Q1: string
  Q2: string
  Q3: string
}

interface JolpicaRaceResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  grid: string
  laps: string
  status: string
  Time?: {
    millis: string
    time: string
  }
  FastestLap?: {
    rank: string
    lap: string
    Time: {
      time: string
    }
  }
}

interface JolpicaDriverStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Driver: JolpicaDriver
  Constructors: JolpicaConstructor[]
}

interface JolpicaConstructorStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Constructor: JolpicaConstructor
}

async function fetchAllPaginated<T>(
  endpoint: string,
  limit = 1000
): Promise<T[]> {
  let offset = 0
  let allItems: T[] = []
  let total = 0

  do {
    const sep = endpoint.includes("?") ? "&" : "?"
    const url = `${JOLPICA_BASE}${endpoint}${sep}limit=${limit}&offset=${offset}`
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`Jolpica API error (${response.status}) for ${endpoint}`)
    }
    const data: JolpicaResponse<T> = await response.json()
    const mrdata = data.MRData

    total = parseInt(mrdata.total, 10)

    if (mrdata.RaceTable?.Races) {
      allItems = allItems.concat(mrdata.RaceTable.Races as unknown as T[])
    } else if (mrdata.StandingsTable?.StandingsLists) {
      allItems = allItems.concat(mrdata.StandingsTable.StandingsLists as unknown as T[])
    } else if (mrdata.DriverTable?.Drivers) {
      allItems = allItems.concat(mrdata.DriverTable.Drivers as unknown as T[])
    } else if (mrdata.ConstructorTable?.Constructors) {
      allItems = allItems.concat(mrdata.ConstructorTable.Constructors as unknown as T[])
    } else if (mrdata.CircuitTable?.Circuits) {
      allItems = allItems.concat(mrdata.CircuitTable.Circuits as unknown as T[])
    } else if (mrdata.SeasonTable?.Seasons) {
      allItems = allItems.concat(mrdata.SeasonTable.Seasons as unknown as T[])
    }

    offset += limit
  } while (offset < total)

  return allItems
}

export async function importSeasons(): Promise<Season[]> {
  const seasons = await fetchAllPaginated<JolpicaSeason>("/seasons.json?")
  const records: Season[] = seasons.map((s) => ({
    id: "",
    year: parseInt(s.season, 10),
    url: s.url,
  }))

  const { data, error } = await supabase
    .from("seasons")
    .upsert(records.map(({ id: _id, ...rest }) => rest), {
      onConflict: "year",
      ignoreDuplicates: false,
    })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importCircuits(): Promise<Circuit[]> {
  const circuits = await fetchAllPaginated<JolpicaCircuit>("/circuits.json?")
  const records: Omit<Circuit, "id" | "created_at" | "updated_at">[] = circuits.map((c) => ({
    circuit_id: c.circuitId,
    name: c.circuitName,
    location: c.Location.locality,
    country: c.Location.country,
    lat: parseFloat(c.Location.lat) || null,
    lng: parseFloat(c.Location.long) || null,
    length_km: null,
    first_gp_year: null,
    turns: null,
    direction: null,
    image_url: null,
    source: "jolpica",
    is_manually_edited: false,
  }))

  const { data, error } = await supabase
    .from("circuits")
    .upsert(records, { onConflict: "circuit_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importConstructors(): Promise<Constructor[]> {
  const constructors = await fetchAllPaginated<JolpicaConstructor>("/constructors.json?")
  const records: Omit<Constructor, "id" | "created_at" | "updated_at">[] = constructors.map((c) => ({
    constructor_id: c.constructorId,
    name: c.name,
    nationality: c.nationality || null,
    founded_year: null,
    principal: null,
    base: null,
    engine_supplier: null,
    logo_url: null,
    source: "jolpica",
    is_manually_edited: false,
  }))

  const { data, error } = await supabase
    .from("constructors")
    .upsert(records, { onConflict: "constructor_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importDrivers(): Promise<Driver[]> {
  const drivers = await fetchAllPaginated<JolpicaDriver>("/drivers.json?")
  const records: Omit<Driver, "id" | "created_at" | "updated_at">[] = drivers.map((d) => ({
    driver_id: d.driverId,
    given_name: d.givenName,
    family_name: d.familyName,
    dob: d.dateOfBirth || null,
    nationality: d.nationality || null,
    photo_url: null,
    bio: null,
    source: "jolpica",
    is_manually_edited: false,
  }))

  const { data, error } = await supabase
    .from("drivers")
    .upsert(records, { onConflict: "driver_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importRaces(season: number): Promise<Race[]> {
  const races = await fetchAllPaginated<JolpicaRace>(`/${season}.json?`)

  const { data: circuits } = await supabase
    .from("circuits")
    .select("id, circuit_id")

  const circuitMap = new Map(circuits?.map((c) => [c.circuit_id, c.id]) ?? [])

  const records: Omit<Race, "id" | "created_at" | "updated_at">[] = races.map((r) => ({
    season_year: parseInt(r.season, 10),
    round: parseInt(r.round, 10),
    circuit_id: circuitMap.get(r.Circuit.circuitId) ?? "",
    name: r.raceName,
    date: r.date,
    time: r.time || null,
    url: r.url || null,
    laps: null,
    distance_km: null,
    source: "jolpica",
    is_manually_edited: false,
  }))

  const { data, error } = await supabase
    .from("races")
    .upsert(records, { onConflict: "season_year,round", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importRaceResults(
  season: number,
  round: number
): Promise<RaceResult[]> {
  const url = `/${season}/${round}/results.json?`
  let raceResult: JolpicaRace | undefined
  try {
    const results = await fetchAllPaginated<JolpicaRace>(url)
    raceResult = results[0]
  } catch (err) {
    throw new Error(`Jolpica API error for ${season}/${round}: ${err instanceof Error ? err.message : "API unavailable"}`)
  }

  if (!raceResult?.Results) {
    throw new Error(`No results found for ${season} round ${round} from Jolpica API. The race may not have occurred yet.`)
  }

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")
  const { data: constructors } = await supabase.from("constructors").select("id, constructor_id")
  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("season_year", season)
    .eq("round", round)
    .single()

  if (!races) throw new Error(`Race not found for season ${season}, round ${round}`)

  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])
  const constructorMap = new Map(constructors?.map((c) => [c.constructor_id, c.id]) ?? [])

  const records = raceResult.Results.map((r: JolpicaRaceResult) => ({
    race_id: races.id,
    driver_id: driverMap.get(r.Driver.driverId) ?? "",
    constructor_id: constructorMap.get(r.Constructor.constructorId) ?? "",
    grid: parseInt(r.grid, 10) || null,
    position: parseInt(r.position, 10) || null,
    position_text: r.positionText || null,
    points: parseFloat(r.points) || 0,
    laps: parseInt(r.laps, 10) || null,
    status: r.status || null,
    fastest_lap_time: r.FastestLap?.Time?.time || null,
    fastest_lap_rank: r.FastestLap ? parseInt(r.FastestLap.rank, 10) : null,
    time: r.Time?.time || null,
  }))

  const { data, error } = await supabase
    .from("race_results")
    .upsert(records, { onConflict: "race_id,driver_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importQualifyingResults(
  season: number,
  round: number
): Promise<QualifyingResult[]> {
  const url = `/${season}/${round}/qualifying.json?`
  let raceData: JolpicaRace | undefined
  try {
    const results = await fetchAllPaginated<JolpicaRace>(url)
    raceData = results[0]
  } catch (err) {
    throw new Error(`Jolpica API error for ${season}/${round} qualifying: ${err instanceof Error ? err.message : "API unavailable"}`)
  }

  if (!raceData?.QualifyingResults?.length) {
    throw new Error(`No qualifying results found for ${season} round ${round}.`)
  }

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")
  const { data: constructors } = await supabase.from("constructors").select("id, constructor_id")
  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("season_year", season)
    .eq("round", round)
    .single()

  if (!races) throw new Error(`Race not found for season ${season}, round ${round}`)

  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])
  const constructorMap = new Map(constructors?.map((c) => [c.constructor_id, c.id]) ?? [])

  const records = raceData.QualifyingResults.map(
    (r: JolpicaQualifyingResult) => ({
      race_id: races.id,
      driver_id: driverMap.get(r.Driver.driverId) ?? "",
      constructor_id: constructorMap.get(r.Constructor.constructorId) ?? "",
      position: parseInt(r.position, 10) || null,
      q1: r.Q1 || null,
      q2: r.Q2 || null,
      q3: r.Q3 || null,
    })
  )

  const { data, error } = await supabase
    .from("qualifying_results")
    .upsert(records, { onConflict: "race_id,driver_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importSprintResults(
  season: number,
  round: number
): Promise<SprintResult[]> {
  const url = `/${season}/${round}/sprint.json?`
  let raceData: JolpicaRace | undefined
  try {
    const results = await fetchAllPaginated<JolpicaRace>(url)
    raceData = results[0]
  } catch (err) {
    throw new Error(`Jolpica API error for ${season}/${round} sprint: ${err instanceof Error ? err.message : "API unavailable"}`)
  }

  if (!raceData?.SprintResults?.length) {
    throw new Error(`No sprint results found for ${season} round ${round}. This race may not have had a sprint.`)
  }

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")
  const { data: constructors } = await supabase.from("constructors").select("id, constructor_id")
  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("season_year", season)
    .eq("round", round)
    .single()

  if (!races) throw new Error(`Race not found for season ${season}, round ${round}`)

  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])
  const constructorMap = new Map(constructors?.map((c) => [c.constructor_id, c.id]) ?? [])

  const records = raceData.SprintResults.map((r: JolpicaSprintResult) => ({
    race_id: races.id,
    driver_id: driverMap.get(r.Driver.driverId) ?? "",
    constructor_id: constructorMap.get(r.Constructor.constructorId) ?? "",
    grid: parseInt(r.grid, 10) || null,
    position: parseInt(r.position, 10) || null,
    points: parseFloat(r.points) || 0,
    laps: parseInt(r.laps, 10) || null,
    status: r.status || null,
  }))

  const { data, error } = await supabase
    .from("sprint_results")
    .upsert(records, { onConflict: "race_id,driver_id", ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function importPitStops(
  season: number,
  round: number
): Promise<PitStop[]> {
  const url = `/${season}/${round}/pitstops.json?`
  let raceData: JolpicaRace | undefined
  try {
    const results = await fetchAllPaginated<JolpicaRace>(url)
    raceData = results[0]
  } catch (err) {
    throw new Error(`Jolpica API error for ${season}/${round} pitstops: ${err instanceof Error ? err.message : "API unavailable"}`)
  }

  if (!raceData?.PitStops?.length) {
    throw new Error(`No pit stop data found for ${season} round ${round}.`)
  }

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")
  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("season_year", season)
    .eq("round", round)
    .single()

  if (!races) throw new Error(`Race not found for season ${season}, round ${round}`)

  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])

  const records = raceData.PitStops.map((p: JolpicaPitStop) => ({
    race_id: races.id,
    driver_id: driverMap.get(p.driverId) ?? "",
    lap: parseInt(p.lap, 10) || 0,
    duration_ms: Math.round(parseFloat(p.duration) * 1000) || null,
    stop_number: parseInt(p.stop, 10) || 0,
  }))

  // Delete existing pit stops for this race before inserting fresh data
  await supabase.from("pit_stops").delete().eq("race_id", races.id)

  const { data, error } = await supabase
    .from("pit_stops")
    .insert(records)
    .select()

  if (error) throw error
  return data ?? []
}

export async function importDriverStandings(
  season: number
): Promise<DriverStanding[]> {
  const url = `/${season}/driverStandings.json?`
  const [standingsList] = await fetchAllPaginated<{
    season: string
    round: string
    DriverStandings: JolpicaDriverStanding[]
  }>(url)

  if (!standingsList?.DriverStandings) return []

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")

  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])

  // Delete existing season standings to avoid duplicate issues with null race_id
  await supabase.from("driver_standings").delete().eq("season_year", season).is("race_id", null)

  const records = standingsList.DriverStandings.map((s) => ({
    season_year: season,
    driver_id: driverMap.get(s.Driver.driverId) ?? "",
    race_id: null,
    points: parseFloat(s.points) || 0,
    position: parseInt(s.position, 10) || null,
    wins: parseInt(s.wins, 10) || 0,
  }))

  const { data, error } = await supabase
    .from("driver_standings")
    .insert(records)
    .select()

  if (error) throw error
  return data ?? []
}

export async function importConstructorStandings(
  season: number
): Promise<ConstructorStanding[]> {
  const url = `/${season}/constructorStandings.json?`
  const [standingsList] = await fetchAllPaginated<{
    season: string
    round: string
    ConstructorStandings: JolpicaConstructorStanding[]
  }>(url)

  if (!standingsList?.ConstructorStandings) return []

  const { data: constructors } = await supabase
    .from("constructors")
    .select("id, constructor_id")

  const constructorMap = new Map(
    constructors?.map((c) => [c.constructor_id, c.id]) ?? []
  )

  // Delete existing season standings to avoid duplicate issues with null race_id
  await supabase.from("constructor_standings").delete().eq("season_year", season).is("race_id", null)

  const records =
    standingsList.ConstructorStandings.map((s) => ({
      season_year: season,
      constructor_id: constructorMap.get(s.Constructor.constructorId) ?? "",
      race_id: null,
      points: parseFloat(s.points) || 0,
      position: parseInt(s.position, 10) || null,
      wins: parseInt(s.wins, 10) || 0,
    }))

  const { data, error } = await supabase
    .from("constructor_standings")
    .insert(records)
    .select()

  if (error) throw error
  return data ?? []
}

export async function importSeasonResults(season: number): Promise<{ round: number; count: number }[]> {
  const races = await fetchAllPaginated<JolpicaRace>(`/${season}.json?`)
  const imported: { round: number; count: number }[] = []

  for (const race of races) {
    const round = parseInt(race.round, 10)
    try {
      const results = await importRaceResults(season, round)
      imported.push({ round, count: results.length })
    } catch (err) {
      console.warn(`Failed to import results for ${season} round ${round}:`, err)
    }
  }

  return imported
}

export async function importAllQualifying(season: number): Promise<number> {
  const raceRecords = await fetchAllPaginated<JolpicaRace>(`/${season}.json?`)
  let total = 0
  for (const race of raceRecords) {
    const round = parseInt(race.round, 10)
    try {
      const q = await importQualifyingResults(season, round)
      total += q.length
    } catch {
      // some races may not have qualifying data
    }
  }
  return total
}

export async function importAllSprintResults(season: number): Promise<number> {
  const raceRecords = await fetchAllPaginated<JolpicaRace>(`/${season}.json?`)
  let total = 0
  for (const race of raceRecords) {
    const round = parseInt(race.round, 10)
    try {
      const s = await importSprintResults(season, round)
      total += s.length
    } catch {
      // sprint weekends only
    }
  }
  return total
}

export async function importAllPitStops(season: number): Promise<number> {
  const raceRecords = await fetchAllPaginated<JolpicaRace>(`/${season}.json?`)
  let total = 0
  for (const race of raceRecords) {
    const round = parseInt(race.round, 10)
    try {
      const p = await importPitStops(season, round)
      total += p.length
    } catch {
      // pit stops may not be available for all races
    }
  }
  return total
}

export async function importPerRoundStandings(season: number): Promise<{
  driverStandings: number
  constructorStandings: number
}> {
  const { data: races } = await supabase
    .from("races")
    .select("id, round")
    .eq("season_year", season)
    .order("round", { ascending: true })

  if (!races || races.length === 0) throw new Error(`No races found for season ${season}`)

  const { data: drivers } = await supabase.from("drivers").select("id, driver_id")
  const driverMap = new Map(drivers?.map((d) => [d.driver_id, d.id]) ?? [])
  const { data: constructors } = await supabase.from("constructors").select("id, constructor_id")
  const constructorMap = new Map(constructors?.map((c) => [c.constructor_id, c.id]) ?? [])

  let driverCount = 0
  let constructorCount = 0

  for (const race of races) {
    try {
      const dsUrl = `/${season}/${race.round}/driverStandings.json?`
      const [dsList] = await fetchAllPaginated<{
        season: string
        round: string
        DriverStandings: JolpicaDriverStanding[]
      }>(dsUrl)

      if (dsList?.DriverStandings?.length) {
        await supabase.from("driver_standings").delete().eq("season_year", season).eq("race_id", race.id)
        const dsRecords = dsList.DriverStandings.map((s) => ({
          season_year: season,
          driver_id: driverMap.get(s.Driver.driverId) ?? "",
          race_id: race.id,
          points: parseFloat(s.points) || 0,
          position: parseInt(s.position, 10) || null,
          wins: parseInt(s.wins, 10) || 0,
        }))
        const { error: dsErr } = await supabase.from("driver_standings").insert(dsRecords)
        if (!dsErr) driverCount += dsRecords.length
      }

      const csUrl = `/${season}/${race.round}/constructorStandings.json?`
      const [csList] = await fetchAllPaginated<{
        season: string
        round: string
        ConstructorStandings: JolpicaConstructorStanding[]
      }>(csUrl)

      if (csList?.ConstructorStandings?.length) {
        await supabase.from("constructor_standings").delete().eq("season_year", season).eq("race_id", race.id)
        const csRecords = csList.ConstructorStandings.map((s) => ({
          season_year: season,
          constructor_id: constructorMap.get(s.Constructor.constructorId) ?? "",
          race_id: race.id,
          points: parseFloat(s.points) || 0,
          position: parseInt(s.position, 10) || null,
          wins: parseInt(s.wins, 10) || 0,
        }))
        const { error: csErr } = await supabase.from("constructor_standings").insert(csRecords)
        if (!csErr) constructorCount += csRecords.length
      }
    } catch {
      // standings may not be available for very early rounds
    }
  }

  return { driverStandings: driverCount, constructorStandings: constructorCount }
}

export async function importFullSeason(season: number): Promise<{
  races: number
  results: number
  qualifying: number
  sprint: number
  pitStops: number
}> {
  const raceRecords = await importRaces(season)
  const results = await importSeasonResults(season)
  const totalResults = results.reduce((sum, r) => sum + r.count, 0)
  const totalQualifying = await importAllQualifying(season)
  const totalSprint = await importAllSprintResults(season)
  const totalPitStops = await importAllPitStops(season)

  return {
    races: raceRecords.length,
    results: totalResults,
    qualifying: totalQualifying,
    sprint: totalSprint,
    pitStops: totalPitStops,
  }
}



export async function syncAllHistorical(): Promise<void> {
  console.log("Starting Jolpica historical data sync...")
  await importSeasons()
  await importCircuits()
  await importConstructors()
  await importDrivers()
  console.log("Jolpica historical sync complete.")
}
