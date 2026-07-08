import { useParams, Link } from "react-router-dom"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { getConstructorColors, getConstructorColorsFromRecord } from "@/lib/constructorColors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Race, RaceResult, QualifyingResult, SprintResult, Circuit, PitStop, Weather, RaceSession, NationalityFlag, TireStint } from "@/types/database"

export default function RaceDetailPage() {
  const { raceId } = useParams()

  const { data: race } = useQuery({
    queryKey: ["race", raceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*")
        .eq("id", raceId)
        .single()
      return data as Race | null
    },
  })

  const { data: circuit } = useQuery({
    queryKey: ["race-circuit", race?.circuit_id],
    queryFn: async () => {
      if (!race?.circuit_id) return null
      const { data } = await supabase
        .from("circuits")
        .select("*")
        .eq("id", race.circuit_id)
        .single()
      return data as Circuit | null
    },
    enabled: !!race?.circuit_id,
  })

  const { data: results } = useQuery({
    queryKey: ["race-results", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, driver:drivers(*), constructor:constructors(*)")
        .eq("race_id", raceId)
        .order("position", { ascending: true, nullsFirst: false })
      return (data ?? []) as (RaceResult & { driver: { id: string; code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null }; constructor: { id: string; name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
    },
    enabled: !!raceId,
  })

  const constructorIds = [...new Set((results ?? []).map((r) => r.constructor_id).filter(Boolean))]
  const raceYear = race?.season_year

  const { data: teamCarImages } = useQuery({
    queryKey: ["race-team-car-images", raceId, raceYear],
    queryFn: async () => {
      if (constructorIds.length === 0 || !raceYear) return []
      const { data } = await supabase
        .from("team_car_images")
        .select("constructor_id, image_url")
        .in("constructor_id", constructorIds)
        .eq("year", raceYear)
      return (data ?? []) as { constructor_id: string; image_url: string }[]
    },
    enabled: constructorIds.length > 0 && !!raceYear,
  })

  const carImageMap = new Map((teamCarImages ?? []).map((img) => [img.constructor_id, img.image_url]))

  const { data: qualifying } = useQuery({
    queryKey: ["race-qualifying", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("*, driver:drivers(*), constructor:constructors(*)")
        .eq("race_id", raceId)
        .order("position", { ascending: true, nullsFirst: false })
      return (data ?? []) as (QualifyingResult & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null }; constructor: { name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
    },
    enabled: !!raceId,
  })

  const { data: sprints } = useQuery({
    queryKey: ["race-sprints", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("*, driver:drivers(*), constructor:constructors(*)")
        .eq("race_id", raceId)
        .order("position", { ascending: true, nullsFirst: false })
      return (data ?? []) as (SprintResult & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null }; constructor: { name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
    },
    enabled: !!raceId,
  })

  const { data: pitStops } = useQuery({
    queryKey: ["race-pitstops", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("pit_stops")
        .select("*, driver:drivers(code, given_name, family_name, driver_id, nationality)")
        .eq("race_id", raceId)
        .order("lap", { ascending: true })
      return (data ?? []) as (PitStop & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
    },
    enabled: !!raceId,
  })

  const { data: tireStints } = useQuery({
    queryKey: ["race-tire-stints", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("tire_stints")
        .select("*, driver:drivers(code, given_name, family_name, driver_id, nationality)")
        .eq("race_id", raceId)
        .order("stint_start_lap", { ascending: true })
      return (data ?? []) as (TireStint & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
    },
    enabled: !!raceId,
  })

  const { data: weatherData } = useQuery({
    queryKey: ["race-weather", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("weather")
        .select("*")
        .eq("race_id", raceId)
      return (data ?? []) as Weather[]
    },
    enabled: !!raceId,
  })

  const { data: sessions } = useQuery({
    queryKey: ["race-sessions", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("race_sessions")
        .select("*")
        .eq("race_id", raceId)
        .order("start_time", { ascending: true })
      return (data ?? []) as RaceSession[]
    },
    enabled: !!raceId,
  })

  const { data: nationalityFlagsArray } = useQuery({
    queryKey: ["nationality-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("nationality_flags").select("*").order("nationality")
      return (data ?? []) as NationalityFlag[]
    },
  })

  const nationalityFlags = useMemo(() => {
    const map = new Map<string, string>()
    nationalityFlagsArray?.forEach((f) => map.set(f.nationality, f.flag_url))
    return map
  }, [nationalityFlagsArray])

  const [showAllStats, setShowAllStats] = useState(false)
  const [showQ1Q2, setShowQ1Q2] = useState(false)
  const [cardView, setCardView] = useState(false)
  const [gridCardView, setGridCardView] = useState(false)
  const [sprintGridCardView, setSprintGridCardView] = useState(false)
  const [sprintRaceCardView, setSprintRaceCardView] = useState(false)

  const winner = useMemo(() => {
    if (!results) return null
    return results.find((r) => r.position === 1) ?? null
  }, [results])

  const podium = useMemo(() => {
    return (results ?? []).filter((r) => r.position != null && r.position >= 1 && r.position <= 3).sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
  }, [results])

  const fastestLap = useMemo(() => {
    return (results ?? []).find((r) => r.fastest_lap_rank === 1) ?? null
  }, [results])

  const firstWeather = weatherData?.[0] ?? null

  if (!race) {
    return <PageSkeleton />
  }

  const raceDate = new Date(race.date)

  const formatTime = (t: string | null) => {
    if (!t) return "—"
    return new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (t: string | null) => {
    if (!t) return "—"
    return new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  }

  const sessionLabels: Record<string, string> = {
    FP1: "Free Practice 1",
    FP2: "Free Practice 2",
    FP3: "Free Practice 3",
    Q: "Qualifying",
    Sprint: "Sprint",
    Race: "Race",
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        {circuit?.image_url && (
          <>
            <div className="absolute inset-0">
              <img src={circuit.image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />
          </>
        )}
        <div className="relative flex flex-col lg:flex-row gap-6 p-6 lg:p-8">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge className="bg-white/10 text-white hover:bg-white/20">Round {race.round}</Badge>
              <span className="text-sm text-white/70">{race.season_year} Season</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              {race.name}
            </h1>
            <div className="text-white/80">
              {raceDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            {circuit && (
              <div className="space-y-1">
                <Link
                  to={`/circuits/${circuit.circuit_id}`}
                  className="font-medium text-white/90 hover:text-white hover:underline inline-flex items-center gap-2"
                >
                  {circuit.name}
                </Link>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{circuit.location}, {circuit.country}</span>
                  {circuit.country && nationalityFlags?.get(circuit.country) && (
                    <img
                      src={nationalityFlags.get(circuit.country)!}
                      alt={circuit.country}
                      className="w-4 h-3 object-cover rounded-none"
                    />
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {firstWeather?.air_temp != null && (
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-white">
                  <span>☀</span>
                  <span>{firstWeather.air_temp}°C</span>
                </div>
              )}
              {race.laps != null && (
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-white">
                  <span>🏁</span>
                  <span>{race.laps} Laps</span>
                </div>
              )}
              {circuit?.length_km != null && (
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-white">
                  <span>📏</span>
                  <span>{circuit.length_km.toFixed(3)} km</span>
                </div>
              )}
            </div>
          </div>

        </div>
        {winner && (
          <div className="relative border-t border-white/10 px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/70">Winner</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/drivers/${winner.driver.driver_id}`}
                  className="font-semibold text-white hover:underline inline-flex items-center gap-2"
                >
                  {winner.driver.photo_url && (
                    <img src={winner.driver.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  )}
                  {`${winner.driver.given_name} ${winner.driver.family_name}`}
                </Link>
                <Link
                  to={`/constructors/${winner.constructor.constructor_id}`}
                  className="text-sm text-white/60 hover:text-white/80 hover:underline inline-flex items-center gap-1.5"
                >
                  {winner.constructor.logo_url && (
                    <img src={winner.constructor.logo_url} alt="" className="w-3 h-3 object-contain" />
                  )}
                  {winner.constructor.name}
                </Link>
              </div>
              {winner.time && (
                <span className="text-sm font-mono text-white/50 ml-auto">{winner.time}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="podium">Podium</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
            <TabsTrigger value="sprint">Sprint</TabsTrigger>
            <TabsTrigger value="grid">Starting Grid</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="circuit">Circuit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {winner && (
              <Card>
                <CardHeader>
                  <CardTitle>Winner</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {winner.driver.photo_url && (
                      <img src={winner.driver.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    )}
                    <div>
                      <Link to={`/drivers/${winner.driver.driver_id}`} className="font-semibold hover:underline">
                        {`${winner.driver.given_name} ${winner.driver.family_name}`}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        <Link to={`/constructors/${winner.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                          {winner.constructor.logo_url && (
                            <img src={winner.constructor.logo_url} alt="" className="w-3 h-3 object-contain" />
                          )}
                          {winner.constructor.name}
                        </Link>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold">{winner.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                  {winner.time && (
                    <div className="mt-2 pt-2 border-t text-sm font-mono text-muted-foreground">
                      Time: {winner.time}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Race Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circuit</span>
                    <span className="font-medium text-right">{circuit?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-right">{circuit ? `${circuit.location}, ${circuit.country}` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Laps</span>
                    <span className="font-medium">{race.laps ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="font-medium">{race.distance_km ? `${race.distance_km} km` : circuit?.length_km ? `${circuit.length_km.toFixed(3)} km` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{raceDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>



            {fastestLap && (
              <Card>
                <CardHeader>
                  <CardTitle>Fastest Lap</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                    {fastestLap.driver.photo_url && (
                      <img src={fastestLap.driver.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div>
                      <Link to={`/drivers/${fastestLap.driver.driver_id}`} className="font-medium hover:underline">
                        {`${fastestLap.driver.given_name} ${fastestLap.driver.family_name}`}
                      </Link>
                      <div className="text-xs text-muted-foreground">{fastestLap.constructor.name}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-mono text-sm">{fastestLap.fastest_lap_time ?? "—"}</div>
                      {fastestLap.fastest_lap_rank != null && (
                        <div className="text-xs text-muted-foreground">Rank #{fastestLap.fastest_lap_rank}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {firstWeather && (
              <Card>
                <CardHeader>
                  <CardTitle>Weather</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {firstWeather.air_temp != null && (
                      <div>
                        <span className="text-muted-foreground">Air Temp</span>
                        <p className="font-medium">{firstWeather.air_temp}°C</p>
                      </div>
                    )}
                    {firstWeather.track_temp != null && (
                      <div>
                        <span className="text-muted-foreground">Track Temp</span>
                        <p className="font-medium">{firstWeather.track_temp}°C</p>
                      </div>
                    )}
                    {firstWeather.rainfall != null && (
                      <div>
                        <span className="text-muted-foreground">Rainfall</span>
                        <p className="font-medium">{firstWeather.rainfall ? "Yes" : "No"}</p>
                      </div>
                    )}
                    {firstWeather.wind_speed != null && (
                      <div>
                        <span className="text-muted-foreground">Wind</span>
                        <p className="font-medium">{firstWeather.wind_speed} m/s</p>
                      </div>
                    )}
                    {firstWeather.humidity != null && (
                      <div>
                        <span className="text-muted-foreground">Humidity</span>
                        <p className="font-medium">{firstWeather.humidity}%</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {sessions && sessions.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Session Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {sessions.map((s, i) => (
                      <div key={s.id} className="flex items-start gap-3 pb-3 relative">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${i === sessions.length - 1 ? "border-primary bg-primary" : "border-muted-foreground/30"}`} />
                          {i < sessions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div>
                            <span className="font-medium text-sm">{sessionLabels[s.type] || s.type}</span>
                            <span className="text-xs text-muted-foreground ml-2">{formatDate(s.start_time)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono whitespace-nowrap ml-2">
                            {formatTime(s.start_time)}
                            {s.end_time && ` — ${formatTime(s.end_time)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="podium">
          {podium.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {podium.map((r, i) => {
                const medals = ["🥇", "🥈", "🥉"]
                return (
                  <Card key={r.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-xl">{medals[i]}</span>
                        P{r.position}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {r.driver.photo_url && (
                          <img src={r.driver.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div>
                          <Link to={`/drivers/${r.driver.driver_id}`} className="font-semibold hover:underline">
                            {`${r.driver.given_name} ${r.driver.family_name}`}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                              {r.constructor.logo_url && (
                                <img src={r.constructor.logo_url} alt="" className="w-3 h-3 object-contain" />
                              )}
                              {r.constructor.name}
                            </Link>
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-2xl font-bold">{r.points}</div>
                          <div className="text-xs text-muted-foreground">pts</div>
                        </div>
                      </div>
                      {(r.time || r.laps) && (
                        <div className="mt-2 pt-2 border-t text-sm font-mono text-muted-foreground">
                          {r.time ? `Time: ${r.time}` : `${r.laps} laps`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No podium data available.</p>
          )}
        </TabsContent>

        <TabsContent value="results">
          <div className="flex items-center justify-end mb-3 gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Cards</span>
              <button
                onClick={() => setCardView(!cardView)}
                aria-pressed={cardView}
                className={
                  `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                  (cardView ? "bg-primary" : "bg-muted")
                }
              >
                <span
                  className={
                    `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                    (cardView ? "translate-x-4.5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">All Stats</span>
              <button
                onClick={() => setShowAllStats(!showAllStats)}
                aria-pressed={showAllStats}
                className={
                  `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                  (showAllStats ? "bg-primary" : "bg-muted")
                }
              >
                <span
                  className={
                    `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                    (showAllStats ? "translate-x-4.5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
          </div>
          {cardView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results?.map((r) => {
                const colors = getConstructorColors(r.constructor.name || "")
                return (
                  <div key={r.id} className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors?.primary ?? "#6b7280"}, ${colors?.secondary ?? "#6b7280"})` }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {r.driver.photo_url ? (
                            <img src={r.driver.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
                              {r.position ?? r.position_text ?? "DNF"}
                            </div>
                          )}
                          <div>
                            <Link to={`/drivers/${r.driver.driver_id}`} className="font-medium hover:underline">
                              {`${r.driver.given_name} ${r.driver.family_name}`}
                            </Link>
                            <div className="text-sm text-muted-foreground">
                              <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                {r.constructor.logo_url && (
                                  <img src={r.constructor.logo_url} alt={`${r.constructor.name} logo`} className="w-3 h-3 object-contain" />
                                )}
                                {r.constructor.name}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{r.points}</div>
                          <div className="text-xs text-muted-foreground">pts</div>
                        </div>
                      </div>
                      {carImageMap.get(r.constructor_id) && (
                        <img
                          src={carImageMap.get(r.constructor_id)!}
                          alt={`${r.constructor.name} car`}
                          className="w-full h-16 object-contain mt-3"
                        />
                      )}
                      {showAllStats && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="block font-medium text-foreground">Grid</span>
                            {r.grid ?? "—"}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Status</span>
                            {r.status ?? "—"}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Fastest Lap</span>
                            <span className="font-mono">{r.fastest_lap_time ?? "—"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {(!results || results.length === 0) && (
                <p className="col-span-full text-center text-muted-foreground py-8">
                  No results available yet.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><div className="text-center">Pos</div></TableHead>
                  <TableHead><div>Driver</div></TableHead>
                  <TableHead><div>Team</div></TableHead>
                  {showAllStats && <TableHead><div className="text-center">Grid</div></TableHead>}
                  <TableHead><div className="text-end">Points</div></TableHead>
                  {showAllStats && <TableHead><div>Status</div></TableHead>}
                  {showAllStats && <TableHead><div className="text-end">Fastest Lap</div></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results?.map((r) => (
                  <TableRow key={r.id} style={{ boxShadow: `inset 3px 0 0 ${getConstructorColorsFromRecord(r.constructor).primary}` }}>
                    <TableCell><div className="text-center">{r.position ?? r.position_text ?? "DNF"}</div></TableCell>
                    <TableCell>
                      <Link to={`/drivers/${r.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                        {nationalityFlags?.get(r.driver.nationality ?? "") && (
                          <img src={nationalityFlags.get(r.driver.nationality ?? "")!} alt={r.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                        )}
                        {`${r.driver.given_name} ${r.driver.family_name}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                        <span>{r.constructor.name}</span>
                      </Link>
                    </TableCell>
                    {showAllStats && <TableCell><div className="text-center">{r.grid ?? "—"}</div></TableCell>}
                    <TableCell><div className="text-end">{r.points}</div></TableCell>
                    {showAllStats && <TableCell>{r.status ?? "—"}</TableCell>}
                    {showAllStats && <TableCell><div className="text-end font-mono">{r.fastest_lap_time ?? "—"}</div></TableCell>}
                  </TableRow>
                ))}
                {(!results || results.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={showAllStats ? 7 : 4} className="text-center text-muted-foreground">
                      No results available yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="qualifying">
          <div className="flex items-center justify-end mb-3 gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Show Q1/Q2</span>
              <button
                onClick={() => setShowQ1Q2(!showQ1Q2)}
                aria-pressed={showQ1Q2}
                className={
                  `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                  (showQ1Q2 ? "bg-primary" : "bg-muted")
                }
              >
                <span
                  className={
                    `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                    (showQ1Q2 ? "translate-x-4.5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
          </div>
          <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-10">Pos</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                      {showQ1Q2 && <TableHead className="text-right font-mono">Q1</TableHead>}
                      {showQ1Q2 && <TableHead className="text-right font-mono">Q2</TableHead>}
                      <TableHead className="text-right font-mono">Q3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qualifying?.map((q) => (
                      <TableRow key={q.id} style={{ boxShadow: `inset 3px 0 0 ${getConstructorColorsFromRecord(q.constructor).primary}` }}>
                          <TableCell className="text-center font-medium">{q.position}</TableCell>
                      <TableCell>
                        <Link to={`/drivers/${q.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                          {nationalityFlags?.get(q.driver.nationality ?? "") && (
                            <img src={nationalityFlags.get(q.driver.nationality ?? "")!} alt={q.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                          )}
                          {`${q.driver.given_name} ${q.driver.family_name}`}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/constructors/${q.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                          <span>{q.constructor.name}</span>
                        </Link>
                      </TableCell>
                      {showQ1Q2 && <TableCell className="text-right font-mono text-xs">{q.q1 ?? "—"}</TableCell>}
                      {showQ1Q2 && <TableCell className="text-right font-mono text-xs">{q.q2 ?? "—"}</TableCell>}
                      <TableCell className="text-right font-mono text-xs">{q.q3 ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!qualifying || qualifying.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={showQ1Q2 ? 6 : 4} className="text-center text-muted-foreground">
                        No qualifying data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
        </TabsContent>

        <TabsContent value="sprint">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-end mb-3 gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Cards</span>
                  <button
                    onClick={() => setSprintGridCardView(!sprintGridCardView)}
                    aria-pressed={sprintGridCardView}
                    className={
                      `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                      (sprintGridCardView ? "bg-primary" : "bg-muted")
                    }
                  >
                    <span
                      className={
                        `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                        (sprintGridCardView ? "translate-x-4.5" : "translate-x-0.5")
                      }
                    />
                  </button>
                </div>
              </div>
              {sprintGridCardView ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sprints?.length ? (
                    [...sprints]
                      .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                      .map((s) => {
                        const colors = getConstructorColors(s.constructor.name || "")
                        return (
                          <div key={s.id} className="rounded-lg border bg-card overflow-hidden">
                            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors?.primary ?? "#6b7280"}, ${colors?.secondary ?? "#6b7280"})` }} />
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
                                    {s.grid ?? "—"}
                                  </div>
                                  <div>
                                    <Link to={`/drivers/${s.driver.driver_id}`} className="font-medium hover:underline">
                                      {`${s.driver.given_name} ${s.driver.family_name}`}
                                    </Link>
                                    <div className="text-sm text-muted-foreground">
                                      <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                        {s.constructor.logo_url && (
                                          <img src={s.constructor.logo_url} alt={`${s.constructor.name} logo`} className="w-3 h-3 object-contain" />
                                        )}
                                        {s.constructor.name}
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <p className="col-span-full text-center text-muted-foreground py-8">No sprint qualifying data available.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-10">Grid</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprints?.length ? (
                      [...sprints]
                        .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                        .map((s) => (
                          <TableRow key={s.id} style={{ boxShadow: `inset 3px 0 0 ${getConstructorColorsFromRecord(s.constructor).primary}` }}>
                            <TableCell className="text-center font-medium">{s.grid ?? "—"}</TableCell>
                            <TableCell>
                              <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                {nationalityFlags?.get(s.driver.nationality ?? "") && (
                                  <img src={nationalityFlags.get(s.driver.nationality ?? "")!} alt={s.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                                )}
                                {`${s.driver.given_name} ${s.driver.family_name}`}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                {s.constructor.name}
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No sprint qualifying data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            <div>
              <div className="flex items-center justify-end mb-3 gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Cards</span>
                  <button
                    onClick={() => setSprintRaceCardView(!sprintRaceCardView)}
                    aria-pressed={sprintRaceCardView}
                    className={
                      `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                      (sprintRaceCardView ? "bg-primary" : "bg-muted")
                    }
                  >
                    <span
                      className={
                        `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                        (sprintRaceCardView ? "translate-x-4.5" : "translate-x-0.5")
                      }
                    />
                  </button>
                </div>
              </div>
              {sprintRaceCardView ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sprints?.map((s) => {
                    const colors = getConstructorColors(s.constructor.name || "")
                    return (
                      <div key={s.id} className="rounded-lg border bg-card overflow-hidden">
                        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors?.primary ?? "#6b7280"}, ${colors?.secondary ?? "#6b7280"})` }} />
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
                                {s.position ?? "DNF"}
                              </div>
                              <div>
                                <Link to={`/drivers/${s.driver.driver_id}`} className="font-medium hover:underline">
                                  {`${s.driver.given_name} ${s.driver.family_name}`}
                                </Link>
                                <div className="text-sm text-muted-foreground">
                                  <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                    {s.constructor.logo_url && (
                                      <img src={s.constructor.logo_url} alt={`${s.constructor.name} logo`} className="w-3 h-3 object-contain" />
                                    )}
                                    {s.constructor.name}
                                  </Link>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{s.points}</div>
                              <div className="text-xs text-muted-foreground">pts</div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="block font-medium text-foreground">Laps</span>
                              {s.laps ?? "—"}
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">Status</span>
                              {s.status ?? "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!sprints || sprints.length === 0) && (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                      No sprint race data available. This race may not have had a sprint.
                    </p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-10">Pos</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Laps</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprints?.map((s) => (
                      <TableRow key={s.id} style={{ boxShadow: `inset 3px 0 0 ${getConstructorColorsFromRecord(s.constructor).primary}` }}>
                          <TableCell className="text-center font-medium">{s.position ?? "DNF"}</TableCell>
                          <TableCell>
                            <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                              {nationalityFlags?.get(s.driver.nationality ?? "") && (
                                <img src={nationalityFlags.get(s.driver.nationality ?? "")!} alt={s.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                              )}
                              {`${s.driver.given_name} ${s.driver.family_name}`}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                              {s.constructor.name}
                            </Link>
                          </TableCell>
                        <TableCell className="text-right">{s.points}</TableCell>
                        <TableCell className="text-right">{s.laps ?? "—"}</TableCell>
                        <TableCell>{s.status ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(!sprints || sprints.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No sprint race data available. This race may not have had a sprint.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="grid">
          <div className="flex items-center justify-end mb-3 gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Cards</span>
              <button
                onClick={() => setGridCardView(!gridCardView)}
                aria-pressed={gridCardView}
                className={
                  `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                  (gridCardView ? "bg-primary" : "bg-muted")
                }
              >
                <span
                  className={
                    `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                    (gridCardView ? "translate-x-4.5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
          </div>
          {gridCardView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results?.length ? (
                [...results]
                  .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                  .map((r) => {
                    const colors = getConstructorColors(r.constructor.name || "")
                    return (
                      <div key={r.id} className="rounded-lg border bg-card overflow-hidden">
                        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors?.primary ?? "#6b7280"}, ${colors?.secondary ?? "#6b7280"})` }} />
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
                                {r.grid ?? "—"}
                              </div>
                              <div>
                                <Link to={`/drivers/${r.driver.driver_id}`} className="font-medium hover:underline">
                                  {`${r.driver.given_name} ${r.driver.family_name}`}
                                </Link>
                                <div className="text-sm text-muted-foreground">
                                  <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                                    {r.constructor.logo_url && (
                                      <img src={r.constructor.logo_url} alt={`${r.constructor.name} logo`} className="w-3 h-3 object-contain" />
                                    )}
                                    {r.constructor.name}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <p className="col-span-full text-center text-muted-foreground py-8">No grid data available.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-10">Grid</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results?.length ? (
                  [...results]
                    .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                    .map((r) => (
                      <TableRow key={r.id} style={{ boxShadow: `inset 3px 0 0 ${getConstructorColorsFromRecord(r.constructor).primary}` }}>
                        <TableCell className="text-center font-medium">{r.grid ?? "—"}</TableCell>
                        <TableCell>
                          <Link to={`/drivers/${r.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                            {nationalityFlags?.get(r.driver.nationality ?? "") && (
                              <img src={nationalityFlags.get(r.driver.nationality ?? "")!} alt={r.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                            )}
                            {`${r.driver.given_name} ${r.driver.family_name}`}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                            <span>{r.constructor.name}</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No grid data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="strategy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pit Stops</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-10">Stop</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Lap</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pitStops?.map((ps) => (
                      <TableRow key={ps.id}>
                        <TableCell className="text-center">{ps.stop_number}</TableCell>
                        <TableCell>
                          <Link to={`/drivers/${ps.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                            {nationalityFlags?.get(ps.driver.nationality ?? "") && (
                              <img src={nationalityFlags.get(ps.driver.nationality ?? "")!} alt={ps.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                            )}
                            {`${ps.driver.given_name} ${ps.driver.family_name}`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{ps.lap}</TableCell>
                        <TableCell className="text-right font-mono">
                          {ps.duration_ms != null ? `${(ps.duration_ms / 1000).toFixed(2)}s` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pitStops || pitStops.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No pit stop data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tyre Stints</CardTitle>
              </CardHeader>
              <CardContent>
                {tireStints && tireStints.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Compound</TableHead>
                        <TableHead className="text-right">Start Lap</TableHead>
                        <TableHead className="text-right">End Lap</TableHead>
                        <TableHead className="text-right">Laps</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tireStints.map((ts) => (
                        <TableRow key={ts.id}>
                          <TableCell>
                            <Link to={`/drivers/${ts.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5">
                              {nationalityFlags?.get(ts.driver.nationality ?? "") && (
                                <img src={nationalityFlags.get(ts.driver.nationality ?? "")!} alt={ts.driver.nationality ?? ""} className="w-3 h-3 object-cover rounded-none" />
                              )}
                              {`${ts.driver.given_name} ${ts.driver.family_name}`}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                              ts.compound?.toLowerCase() === "soft" ? "bg-red-100 text-red-700" :
                              ts.compound?.toLowerCase() === "medium" ? "bg-yellow-100 text-yellow-700" :
                              ts.compound?.toLowerCase() === "hard" ? "bg-white text-gray-700 border" :
                              ts.compound?.toLowerCase() === "intermediate" ? "bg-green-100 text-green-700" :
                              ts.compound?.toLowerCase() === "wet" ? "bg-blue-100 text-blue-700" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {ts.compound ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{ts.stint_start_lap ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{ts.stint_end_lap ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {ts.stint_start_lap != null && ts.stint_end_lap != null
                              ? ts.stint_end_lap - ts.stint_start_lap + 1
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No tyre stint data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="circuit">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{circuit?.name ?? "Circuit"} Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium">{circuit ? `${circuit.location}, ${circuit.country}` : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Length</span>
                    <p className="font-medium">{circuit?.length_km ? `${circuit.length_km.toFixed(3)} km` : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Turns</span>
                    <p className="font-medium">{circuit?.turns ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Direction</span>
                    <p className="font-medium capitalize">{circuit?.direction ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">First Grand Prix</span>
                    <p className="font-medium">{circuit?.first_gp_year ?? "—"}</p>
                  </div>
                </div>
                {circuit?.image_url && (
                  <img
                    src={circuit.image_url}
                    alt={circuit.name}
                    className="w-full h-48 object-cover rounded-lg mt-4"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weather Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {weatherData && weatherData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">Air Temp</TableHead>
                        <TableHead className="text-right">Track Temp</TableHead>
                        <TableHead className="text-center">Rainfall</TableHead>
                        <TableHead className="text-right">Wind Speed</TableHead>
                        <TableHead className="text-right">Humidity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weatherData.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="text-right">{w.air_temp != null ? `${w.air_temp}°C` : "—"}</TableCell>
                          <TableCell className="text-right">{w.track_temp != null ? `${w.track_temp}°C` : "—"}</TableCell>
                          <TableCell className="text-center">{w.rainfall ? "Yes" : w.rainfall === false ? "No" : "—"}</TableCell>
                          <TableCell className="text-right">{w.wind_speed != null ? `${w.wind_speed} m/s` : "—"}</TableCell>
                          <TableCell className="text-right">{w.humidity != null ? `${w.humidity}%` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No weather data available for this race.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Times</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions && sessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Start</TableHead>
                        <TableHead className="text-right">End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{sessionLabels[s.type] || s.type}</TableCell>
                          <TableCell>{formatDate(s.start_time)}</TableCell>
                          <TableCell className="text-right font-mono">{formatTime(s.start_time)}</TableCell>
                          <TableCell className="text-right font-mono">{formatTime(s.end_time)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No session time data available for this race.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
