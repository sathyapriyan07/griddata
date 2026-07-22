import { useParams, Link } from "react-router-dom"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import { GridSkeleton } from "@/components/starting-grid"

import { getFlagUrl } from "@/lib/nationalityFlags"
import { motion } from "framer-motion"
import type { Race, RaceResult, QualifyingResult, SprintResult, Circuit, PitStop, Weather, RaceSession, TireStint } from "@/types/database"
import { CalendarDays, MapPin, Thermometer, Route, Flag, Clock, Trophy, Gauge } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

export default function RaceDetailPage() {
  const { raceId } = useParams()

  const { data: race } = useQuery({
    queryKey: ["race", raceId ?? "none"],
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
    queryKey: ["race-circuit", race?.circuit_id ?? ""],
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[320px] lg:min-h-[380px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default mb-6">
        {circuit?.image_url && (
          <div className="absolute inset-0">
            <img src={circuit.image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />
          </div>
        )}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(3,95%,46%) 0%, transparent 40%)`
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)`
        }} />
        <div className="relative z-10 w-full p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <Badge variant="brand" className="w-fit">
                <Flag className="w-3 h-3 mr-1" />
                Round {race.round}
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary">
                {race.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {raceDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {circuit && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                    <Link
                      to={`/circuits/${circuit.circuit_id}`}
                      className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      {circuit.name}
                    </Link>
                    <span className="text-text-tertiary">{circuit.location}, {circuit.country}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {firstWeather?.air_temp != null && (
                <div className="inline-flex items-center gap-1.5 bg-bg-secondary/80 backdrop-blur-xl rounded-full px-3.5 py-2 text-xs font-medium text-text-primary border border-default">
                  <Thermometer className="w-3.5 h-3.5 text-accent-red" />
                  {firstWeather.air_temp}°C
                </div>
              )}
              {race.laps != null && (
                <div className="inline-flex items-center gap-1.5 bg-bg-secondary/80 backdrop-blur-xl rounded-full px-3.5 py-2 text-xs font-medium text-text-primary border border-default">
                  <Route className="w-3.5 h-3.5 text-accent-red" />
                  {race.laps} Laps
                </div>
              )}
              {race.distance_km != null && (
                <div className="inline-flex items-center gap-1.5 bg-bg-secondary/80 backdrop-blur-xl rounded-full px-3.5 py-2 text-xs font-medium text-text-primary border border-default">
                  <Gauge className="w-3.5 h-3.5 text-accent-red" />
                  {race.distance_km} km
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="podium">Podium</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
            <TabsTrigger value="sprint">Sprint</TabsTrigger>
            <TabsTrigger value="grid">Starting Grid</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {winner && (
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-accent-red" />
                    Winner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div>
                      <Link to={`/drivers/${winner.driver.driver_id}`} className="font-heading font-bold text-base text-text-primary hover:text-accent-red transition-colors">
                        {`${winner.driver.given_name} ${winner.driver.family_name}`}
                      </Link>
                      <div className="text-xs text-text-secondary mt-0.5">
                        <Link to={`/constructors/${winner.constructor.constructor_id}`} className="hover:underline inline-flex items-center gap-1.5">
                          {winner.constructor.logo_url && (
                            <img src={winner.constructor.logo_url} alt="" className="w-3 h-3 object-contain" />
                          )}
                          {winner.constructor.name}
                        </Link>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-text-primary tabular-nums">{winner.points}</div>
                      <div className="text-[0.6rem] uppercase tracking-wide text-text-tertiary">pts</div>
                    </div>
                  </div>
                  {winner.time && (
                    <div className="mt-3 pt-3 border-t border-subtle text-sm font-mono text-text-secondary">
                      Time: {winner.time}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-yellow-500" />
                  Race Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Circuit</span>
                    <span className="font-medium text-text-primary text-right">{circuit?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Location</span>
                    <span className="font-medium text-text-primary text-right">{circuit ? `${circuit.location}, ${circuit.country}` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-medium text-text-primary">{raceDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Laps</span>
                    <span className="font-medium text-text-primary">{race.laps ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {fastestLap && (
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    Fastest Lap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div>
                      <Link to={`/drivers/${fastestLap.driver.driver_id}`} className="font-heading font-bold text-sm text-text-primary hover:text-accent-red transition-colors">
                        {`${fastestLap.driver.given_name} ${fastestLap.driver.family_name}`}
                      </Link>
                      <div className="text-xs text-text-secondary mt-0.5">{fastestLap.constructor.name}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-mono text-sm font-bold text-text-primary tabular-nums">{fastestLap.fastest_lap_time ?? "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {firstWeather && (
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-blue-400" />
                    Weather
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {firstWeather.air_temp != null && (
                      <div>
                        <span className="text-xs text-text-secondary">Air Temp</span>
                        <p className="font-medium text-text-primary">{firstWeather.air_temp}°C</p>
                      </div>
                    )}
                    {firstWeather.track_temp != null && (
                      <div>
                        <span className="text-xs text-text-secondary">Track Temp</span>
                        <p className="font-medium text-text-primary">{firstWeather.track_temp}°C</p>
                      </div>
                    )}
                    {firstWeather.rainfall != null && (
                      <div>
                        <span className="text-xs text-text-secondary">Rainfall</span>
                        <p className="font-medium text-text-primary">{firstWeather.rainfall ? "Yes" : "No"}</p>
                      </div>
                    )}
                    {firstWeather.wind_speed != null && (
                      <div>
                        <span className="text-xs text-text-secondary">Wind</span>
                        <p className="font-medium text-text-primary">{firstWeather.wind_speed} m/s</p>
                      </div>
                    )}
                    {firstWeather.humidity != null && (
                      <div>
                        <span className="text-xs text-text-secondary">Humidity</span>
                        <p className="font-medium text-text-primary">{firstWeather.humidity}%</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {sessions && sessions.length > 0 && (
              <Card className="relative overflow-hidden h-full lg:col-span-2">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Session Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-text-primary">{sessionLabels[s.type] || s.type}</TableCell>
                          <TableCell className="text-text-secondary">{formatDate(s.start_time)}</TableCell>
                          <TableCell className="text-right font-mono text-text-secondary text-xs">
                            {formatTime(s.start_time)}
                            {s.end_time && ` — ${formatTime(s.end_time)}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="podium">
          {podium.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Pos</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {podium.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-center font-heading font-bold text-text-primary">
                            <div className="flex items-center justify-center">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.position === 1 ? "bg-yellow-500/20 text-yellow-500" : r.position === 2 ? "bg-gray-300/20 text-gray-300" : "bg-amber-600/20 text-amber-600"}`}>
                                {r.position}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link to={`/drivers/${r.driver.driver_id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                              {r.driver.given_name.charAt(0)}. {r.driver.family_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/constructors/${r.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                              {r.constructor.logo_url && (
                                <img src={r.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                              )}
                              {r.constructor.name}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-text-secondary">{r.time ?? "—"}</TableCell>
                          <TableCell className="text-right font-heading font-bold text-text-primary">{r.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-text-secondary py-8">No podium data available.</p>
          )}
        </TabsContent>

        <TabsContent value="results">
          {results && results.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Pos</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-center">Laps</TableHead>
                        <TableHead className="text-center">Grid</TableHead>
                        <TableHead className="text-center">Pits</TableHead>
                        <TableHead>Best Lap</TableHead>
                        <TableHead>Time / Status</TableHead>
                        <TableHead className="text-right">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => {
                        const pitCount = pitStops?.filter((ps) => ps.driver.driver_id === r.driver.driver_id).length ?? 0
                        const posChange = r.position != null && r.grid != null ? r.grid - r.position : null
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-center font-heading font-bold text-text-primary">
                              <div className="flex items-center justify-center gap-1.5">
                                {r.position === 1 && <Trophy className="w-3 h-3 text-yellow-500" />}
                                {r.fastest_lap_rank === 1 && <span className="text-[10px] text-purple-400">FL</span>}
                                {r.position ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/drivers/${r.driver.driver_id}`} className="inline-flex items-center gap-2 hover:text-accent-red transition-colors">
                                <span className="font-medium text-text-primary">
                                  {r.driver.code ?? r.driver.family_name.substring(0, 3).toUpperCase()}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/constructors/${r.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                                {r.constructor.logo_url && (
                                  <img src={r.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                )}
                                {r.constructor.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center font-mono text-text-secondary">{r.laps ?? "—"}</TableCell>
                            <TableCell className="text-center font-mono text-text-secondary">
                              <span className="inline-flex items-center gap-1">
                                {r.grid ?? "—"}
                                {posChange != null && posChange !== 0 && (
                                  <span className={`text-[10px] ${posChange > 0 ? "text-emerald-500" : "text-red-500"}`}>
                                    {posChange > 0 ? `+${posChange}` : posChange}
                                  </span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-text-secondary">{pitCount}</TableCell>
                            <TableCell className="font-mono text-text-secondary text-xs">{r.fastest_lap_time ?? "—"}</TableCell>
                            <TableCell className="font-mono text-text-secondary text-xs">
                              {r.status && r.status !== "Finished" ? (
                                <Badge variant="destructive" className="text-[10px]">{r.status}</Badge>
                              ) : (
                                r.time ?? "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-heading font-bold text-text-primary">{r.points}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-text-secondary py-8">No race results available.</p>
          )}
        </TabsContent>

        <TabsContent value="qualifying">
          {qualifying && qualifying.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Pos</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-center">Q1</TableHead>
                        <TableHead className="text-center">Q2</TableHead>
                        <TableHead className="text-center">Q3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualifying.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="text-center font-heading font-bold text-text-primary">{q.position}</TableCell>
                          <TableCell>
                            <Link to={`/drivers/${q.driver.driver_id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                              {q.driver.code ?? q.driver.family_name.substring(0, 3).toUpperCase()}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/constructors/${q.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                              {q.constructor.logo_url && (
                                <img src={q.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                              )}
                              {q.constructor.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center font-mono text-text-secondary">{q.q1 ?? "—"}</TableCell>
                          <TableCell className="text-center font-mono text-text-secondary">{q.q2 ?? "—"}</TableCell>
                          <TableCell className="text-center font-mono text-text-secondary">{q.q3 ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-text-secondary py-8">No qualifying data available.</p>
          )}
        </TabsContent>

        <TabsContent value="sprint">
          {sprints && sprints.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sprint Qualifying</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Grid</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-center">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...sprints].sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99)).map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-center font-heading font-bold text-text-primary">{s.grid ?? "—"}</TableCell>
                            <TableCell>
                              <Link to={`/drivers/${s.driver.driver_id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                                {s.driver.code ?? s.driver.family_name.substring(0, 3).toUpperCase()}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/constructors/${s.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                                {s.constructor.logo_url && (
                                  <img src={s.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                )}
                                {s.constructor.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center font-heading font-bold text-text-primary">{s.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sprint Race Results</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Pos</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-center">Laps</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sprints.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-center font-heading font-bold text-text-primary">{s.position ?? "DNF"}</TableCell>
                            <TableCell>
                              <Link to={`/drivers/${s.driver.driver_id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                                {s.driver.code ?? s.driver.family_name.substring(0, 3).toUpperCase()}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/constructors/${s.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                                {s.constructor.logo_url && (
                                  <img src={s.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                )}
                                {s.constructor.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center font-mono text-text-secondary">{s.laps ?? "—"}</TableCell>
                            <TableCell className="text-text-secondary text-xs">{s.status ?? "—"}</TableCell>
                            <TableCell className="text-right font-heading font-bold text-text-primary">{s.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center text-text-secondary py-8">No sprint data available.</p>
          )}
        </TabsContent>

        <TabsContent value="grid">
          {results && results.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Pos</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Q1</TableHead>
                        <TableHead>Q2</TableHead>
                        <TableHead>Q3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...results]
                        .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                        .map((r) => {
                          const q = qualifying?.find((qr) => qr.driver.driver_id === r.driver.driver_id)
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-center font-heading font-bold text-text-primary">{r.grid ?? "—"}</TableCell>
                              <TableCell>
                                <Link to={`/drivers/${r.driver.driver_id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                                  {r.driver.given_name.charAt(0)}. {r.driver.family_name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link to={`/constructors/${r.constructor.constructor_id}`} className="inline-flex items-center gap-1.5 hover:underline text-text-secondary">
                                  {r.constructor.logo_url && (
                                    <img src={r.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                  )}
                                  {r.constructor.name}
                                </Link>
                              </TableCell>
                              <TableCell className="font-mono text-text-secondary text-xs">{q?.q1 ?? "—"}</TableCell>
                              <TableCell className="font-mono text-text-secondary text-xs">{q?.q2 ?? "—"}</TableCell>
                              <TableCell className="font-mono text-text-secondary text-xs">{q?.q3 ?? "—"}</TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <GridSkeleton />
          )}
        </TabsContent>

        <TabsContent value="strategy">
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
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
                          <TableCell className="text-center font-mono text-text-primary">{ps.stop_number}</TableCell>
                          <TableCell>
                            <Link to={`/drivers/${ps.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5 text-text-primary">
                              {getFlagUrl(ps.driver.nationality ?? "") && (
                                <img src={getFlagUrl(ps.driver.nationality ?? "")!} alt={ps.driver.nationality ?? ""} className="w-4 h-4 object-cover rounded-none" />
                              )}
                              {`${ps.driver.given_name} ${ps.driver.family_name}`}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-mono text-text-primary">{ps.lap}</TableCell>
                          <TableCell className="text-right font-mono text-text-primary">
                            {ps.duration_ms != null ? `${(ps.duration_ms / 1000).toFixed(2)}s` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!pitStops || pitStops.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-text-secondary">
                            No pit stop data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
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
                              <Link to={`/drivers/${ts.driver.driver_id}`} className="hover:underline inline-flex items-center gap-1.5 text-text-primary">
                                {getFlagUrl(ts.driver.nationality ?? "") && (
                                  <img src={getFlagUrl(ts.driver.nationality ?? "")!} alt={ts.driver.nationality ?? ""} className="w-4 h-4 object-cover rounded-none" />
                                )}
                                {`${ts.driver.given_name} ${ts.driver.family_name}`}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                                ts.compound?.toLowerCase() === "soft" ? "bg-red-900/30 text-red-400" :
                                ts.compound?.toLowerCase() === "medium" ? "bg-yellow-900/30 text-yellow-400" :
                                ts.compound?.toLowerCase() === "hard" ? "bg-white/10 text-text-secondary border border-default" :
                                ts.compound?.toLowerCase() === "intermediate" ? "bg-green-900/30 text-green-400" :
                                ts.compound?.toLowerCase() === "wet" ? "bg-blue-900/30 text-blue-400" :
                                "bg-tertiary text-text-secondary"
                              }`}>
                                {ts.compound ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-text-primary">{ts.stint_start_lap ?? "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-text-primary">{ts.stint_end_lap ?? "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-text-primary">
                              {ts.stint_start_lap != null && ts.stint_end_lap != null
                                ? ts.stint_end_lap - ts.stint_start_lap + 1
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-text-secondary">No tyre stint data available.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
