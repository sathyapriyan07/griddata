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
import type { Race, RaceResult, QualifyingResult, SprintResult, Circuit, PitStop, Weather, RaceSession, NationalityFlag } from "@/types/database"

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
      return (data ?? []) as (RaceResult & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null }; constructor: { id: string; name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
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
      return (data ?? []) as (QualifyingResult & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null }; constructor: { name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
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
      return (data ?? []) as (SprintResult & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null }; constructor: { name: string; constructor_id: string; logo_url: string | null; nationality: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
    },
    enabled: !!raceId,
  })

  const { data: pitStops } = useQuery({
    queryKey: ["race-pitstops", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("pit_stops")
        .select("*, driver:drivers(code, given_name, family_name, driver_id, nationality), constructor:constructors(logo_url, name)")
        .eq("race_id", raceId)
        .order("lap", { ascending: true })
      return (data ?? []) as (PitStop & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null }; constructor: { logo_url: string | null; name: string } })[]
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
  const [gridTabCardView, setGridTabCardView] = useState(false)
  const [sprintGridCardView, setSprintGridCardView] = useState(false)
  const [sprintRaceCardView, setSprintRaceCardView] = useState(false)

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
      <div>
        <h1 className="text-3xl font-bold">{race.name}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
          <Badge>{race.season_year}</Badge>
          <Badge variant="secondary">Round {race.round}</Badge>
          <span>
            {raceDate.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        {circuit && (
          <Link
            to={`/circuits/${circuit.circuit_id}`}
            className="text-sm text-primary hover:underline mt-1 inline-block"
          >
            {circuit.name} — {circuit.location}, {circuit.country}
          </Link>
        )}
      </div>

      <Tabs defaultValue="results">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
            <TabsTrigger value="sprint">Sprint</TabsTrigger>
            <TabsTrigger value="grid">Starting Grid</TabsTrigger>
            <TabsTrigger value="pitstops">Pit Stops</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="sessions">Session Times</TabsTrigger>
          </TabsList>
        </div>

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
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
                            {r.position ?? r.position_text ?? "DNF"}
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
                  <TableRow key={r.id} style={{ background: `${getConstructorColorsFromRecord(r.constructor).primary}33` }}>
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
                      <TableRow key={q.id} style={{ background: `${getConstructorColorsFromRecord(q.constructor).primary}33` }}>
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
                          <TableRow key={s.id} style={{ background: `${getConstructorColorsFromRecord(s.constructor).primary}33` }}>
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
                      <TableRow key={s.id} style={{ background: `${getConstructorColorsFromRecord(s.constructor).primary}33` }}>
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
                onClick={() => setGridTabCardView(!gridTabCardView)}
                aria-pressed={gridTabCardView}
                className={
                  `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
                  (gridTabCardView ? "bg-primary" : "bg-muted")
                }
              >
                <span
                  className={
                    `inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ` +
                    (gridTabCardView ? "translate-x-4.5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
          </div>
          {gridTabCardView ? (
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
                          <TableRow key={r.id} style={{ background: `${getConstructorColorsFromRecord(r.constructor).primary}33` }}>
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

        <TabsContent value="pitstops">
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
        </TabsContent>

        <TabsContent value="weather">
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
        </TabsContent>

        <TabsContent value="sessions">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
