import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Race, RaceResult, QualifyingResult, SprintResult, Circuit, PitStop, Weather, RaceSession } from "@/types/database"

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
      return (data ?? []) as (RaceResult & { driver: { given_name: string; family_name: string; driver_id: string }; constructor: { name: string; constructor_id: string } })[]
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
      return (data ?? []) as (QualifyingResult & { driver: { given_name: string; family_name: string; driver_id: string }; constructor: { name: string; constructor_id: string } })[]
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
      return (data ?? []) as (SprintResult & { driver: { given_name: string; family_name: string; driver_id: string }; constructor: { name: string; constructor_id: string } })[]
    },
    enabled: !!raceId,
  })

  const { data: pitStops } = useQuery({
    queryKey: ["race-pitstops", raceId],
    queryFn: async () => {
      if (!raceId) return []
      const { data } = await supabase
        .from("pit_stops")
        .select("*, driver:drivers(given_name, family_name, driver_id)")
        .eq("race_id", raceId)
        .order("lap", { ascending: true })
      return (data ?? []) as (PitStop & { driver: { given_name: string; family_name: string; driver_id: string } })[]
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
        <div className="overflow-x-auto">
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
          <Card>
            <CardHeader>
              <CardTitle>Race Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Grid</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fastest Lap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.position ?? r.position_text ?? "DNF"}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/drivers/${r.driver.driver_id}`}
                          className="hover:underline"
                        >
                          {r.driver.given_name} {r.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/constructors/${r.constructor.constructor_id}`}
                          className="hover:underline"
                        >
                          {r.constructor.name}
                        </Link>
                      </TableCell>
                      <TableCell>{r.grid ?? "—"}</TableCell>
                      <TableCell>{r.points}</TableCell>
                      <TableCell>{r.status ?? "—"}</TableCell>
                      <TableCell>{r.fastest_lap_time ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!results || results.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No results available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifying">
          <Card>
            <CardHeader>
              <CardTitle>Qualifying Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Q1</TableHead>
                    <TableHead>Q2</TableHead>
                    <TableHead>Q3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualifying?.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.position}</TableCell>
                      <TableCell>
                        <Link
                          to={`/drivers/${q.driver.driver_id}`}
                          className="hover:underline"
                        >
                          {q.driver.given_name} {q.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/constructors/${q.constructor.constructor_id}`}
                          className="hover:underline"
                        >
                          {q.constructor.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{q.q1 ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{q.q2 ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{q.q3 ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!qualifying || qualifying.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No qualifying data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sprint">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Weekend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Sprint Qualifying (Grid)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grid</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprints?.length ? (
                      [...sprints]
                        .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                        .map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.grid ?? "—"}</TableCell>
                            <TableCell>
                              <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline">
                                {s.driver.given_name} {s.driver.family_name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline">
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
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Sprint Race Results</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Laps</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprints?.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.position ?? "DNF"}</TableCell>
                        <TableCell>
                          <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline">
                            {s.driver.given_name} {s.driver.family_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline">
                            {s.constructor.name}
                          </Link>
                        </TableCell>
                        <TableCell>{s.points}</TableCell>
                        <TableCell>{s.laps ?? "—"}</TableCell>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid">
          <Card>
            <CardHeader>
              <CardTitle>Starting Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grid</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.length ? (
                    [...results]
                      .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
                      .map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.grid ?? "—"}</TableCell>
                          <TableCell>
                            <Link to={`/drivers/${r.driver.driver_id}`} className="hover:underline">
                              {r.driver.given_name} {r.driver.family_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/constructors/${r.constructor.constructor_id}`} className="hover:underline">
                              {r.constructor.name}
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
            </CardContent>
          </Card>
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
                    <TableHead>Stop</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Lap</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pitStops?.map((ps) => (
                    <TableRow key={ps.id}>
                      <TableCell>{ps.stop_number}</TableCell>
                      <TableCell>
                        <Link to={`/drivers/${ps.driver.driver_id}`} className="hover:underline">
                          {ps.driver.given_name} {ps.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{ps.lap}</TableCell>
                      <TableCell className="font-mono">
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
                      <TableHead>Air Temp</TableHead>
                      <TableHead>Track Temp</TableHead>
                      <TableHead>Rainfall</TableHead>
                      <TableHead>Wind Speed</TableHead>
                      <TableHead>Humidity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weatherData.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{w.air_temp != null ? `${w.air_temp}°C` : "—"}</TableCell>
                        <TableCell>{w.track_temp != null ? `${w.track_temp}°C` : "—"}</TableCell>
                        <TableCell>{w.rainfall ? "Yes" : w.rainfall === false ? "No" : "—"}</TableCell>
                        <TableCell>{w.wind_speed != null ? `${w.wind_speed} m/s` : "—"}</TableCell>
                        <TableCell>{w.humidity != null ? `${w.humidity}%` : "—"}</TableCell>
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
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{sessionLabels[s.type] || s.type}</TableCell>
                        <TableCell>{formatDate(s.start_time)}</TableCell>
                        <TableCell>{formatTime(s.start_time)}</TableCell>
                        <TableCell>{formatTime(s.end_time)}</TableCell>
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
