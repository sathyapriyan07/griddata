import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { computeDriverCareerStats, computeDriverSeasonStats, detectMilestones, getStreaks } from "@/lib/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Driver, RaceResult, SprintResult, DriverConstructorHistory } from "@/types/database"

export default function DriverDetailPage() {
  const { driverId } = useParams()

  const { data: driver } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("driver_id", driverId)
        .single()
      return data as Driver | null
    },
  })

  const { data: driverRecord } = useQuery({
    queryKey: ["driver-record", driverId],
    queryFn: async () => {
      if (!driverId) return null
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("driver_id", driverId)
        .single()
      return data as { id: string } | null
    },
    enabled: !!driverId,
  })

  const driverUuid = driverRecord?.id

  const { data: results } = useQuery({
    queryKey: ["driver-results-all", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, races!inner(season_year, round, name, date)")
        .eq("driver_id", driverUuid)
        .order("race_id", { ascending: false })
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string; date: string } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: sprints } = useQuery({
    queryKey: ["driver-sprints", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("*, races!inner(season_year, round, name, date)")
        .eq("driver_id", driverUuid)
        .order("race_id", { ascending: false })
      return (data ?? []) as (SprintResult & { races: { season_year: number; round: number; name: string; date: string } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: dch } = useQuery({
    queryKey: ["driver-dch", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("driver_constructor_history")
        .select("*, constructors!inner(name, constructor_id)")
        .eq("driver_id", driverUuid)
        .order("season_year", { ascending: false })
      return (data ?? []) as (DriverConstructorHistory & { constructors: { name: string; constructor_id: string } })[]
    },
    enabled: !!driverUuid,
  })

  const stats = results ? computeDriverCareerStats(results as RaceResult[], sprints as SprintResult[]) : null
  const milestones = results ? detectMilestones(results as RaceResult[]) : []
  const winStreaks = results ? getStreaks(results as RaceResult[], "wins") : []
  const podiumStreaks = results ? getStreaks(results as RaceResult[], "podiums") : []
  const pointStreaks = results ? getStreaks(results as RaceResult[], "points") : []

  const seasons = results?.reduce(
    (acc, r) => {
      const sy = r.races.season_year
      if (!acc.includes(sy)) acc.push(sy)
      return acc
    },
    [] as number[]
  ) ?? []

  const teamBySeason = new Map<number, { name: string; constructor_id: string }>()
  dch?.forEach((d) => {
    if (!teamBySeason.has(d.season_year)) {
      teamBySeason.set(d.season_year, {
        name: d.constructors.name,
        constructor_id: d.constructors.constructor_id,
      })
    }
  })

  if (!driver) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <Avatar
          src={driver.photo_url ?? undefined}
          alt={`${driver.given_name} ${driver.family_name}`}
          fallback={`${driver.given_name[0]}${driver.family_name[0]}`}
          className="h-24 w-24 text-2xl"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {driver.given_name} {driver.family_name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {driver.nationality && <Badge>{driver.nationality}</Badge>}
            {driver.dob && (
              <Badge variant="secondary">
                Born: {new Date(driver.dob).toLocaleDateString()}
              </Badge>
            )}
          </div>
          {driver.bio && <p className="mt-4 text-muted-foreground">{driver.bio}</p>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Races</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalRaces}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.wins}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Podiums</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.podiums}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalPoints}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sprint Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.sprintWins}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sprint Pods</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.sprintPodiums}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sprint Pts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.sprintPoints}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Finish</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats.avgFinishingPosition?.toFixed(1) ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Race Results</TabsTrigger>
          <TabsTrigger value="seasons">Season by Season</TabsTrigger>
          <TabsTrigger value="teammates">Teammate Battle</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Race Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Grid</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fastest Lap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.races.season_year}</TableCell>
                      <TableCell>
                        <Link to={`/races/${r.race_id}`} className="hover:underline text-sm">
                          {r.races.name}
                        </Link>
                      </TableCell>
                      <TableCell>{r.position ?? r.position_text ?? "DNF"}</TableCell>
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

        <TabsContent value="seasons">
          <Card>
            <CardHeader>
              <CardTitle>Season Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Races</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead>Podiums</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Avg Finish</TableHead>
                    <TableHead>Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.map((season) => {
                    const seasonData = computeDriverSeasonStats(results as RaceResult[], season)
                    const team = teamBySeason.get(season)
                    return (
                      <TableRow key={season}>
                        <TableCell className="font-medium">{season}</TableCell>
                        <TableCell>
                          {team ? (
                            <Link to={`/constructors/${team.constructor_id}`} className="hover:underline">
                              {team.name}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{seasonData.races}</TableCell>
                        <TableCell>{seasonData.wins}</TableCell>
                        <TableCell>{seasonData.podiums}</TableCell>
                        <TableCell className="font-bold">{seasonData.points}</TableCell>
                        <TableCell>{seasonData.avgFinishingPosition?.toFixed(1) ?? "—"}</TableCell>
                        <TableCell>{(seasonData.winRate * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    )
                  })}
                  {seasons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No season data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teammates">
          <Card>
            <CardHeader>
              <CardTitle>Teammate Comparisons</CardTitle>
            </CardHeader>
            <CardContent>
              {dch && dch.length > 0 ? (
                <div className="space-y-6">
                  {dch.map((entry) => (
                    <TeammateSection
                      key={`${entry.season_year}-${entry.constructor_id}`}
                      driverUuid={driverUuid!}
                      season={entry.season_year}
                      constructorId={entry.constructor_id}
                      driverId={driver.driver_id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No teammate data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Career Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {milestones.slice(0, 20).map((m, i) => (
                    <Card key={i} className="bg-muted/50">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{m.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No milestones detected yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks">
          <Card>
            <CardHeader>
              <CardTitle>Best Streaks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Longest Win Streaks</h3>
                <div className="flex flex-wrap gap-2">
                  {winStreaks.slice(0, 5).map((s, i) => (
                    <Badge key={i} variant={s.active ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {s.length} {s.length === 1 ? "win" : "wins"}
                      {s.active ? " (active)" : ""}
                    </Badge>
                  ))}
                  {winStreaks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No win streaks yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Longest Podium Streaks</h3>
                <div className="flex flex-wrap gap-2">
                  {podiumStreaks.slice(0, 5).map((s, i) => (
                    <Badge key={i} variant={s.active ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {s.length} {s.length === 1 ? "podium" : "podiums"}
                      {s.active ? " (active)" : ""}
                    </Badge>
                  ))}
                  {podiumStreaks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No podium streaks yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Longest Points Streaks</h3>
                <div className="flex flex-wrap gap-2">
                  {pointStreaks.slice(0, 5).map((s, i) => (
                    <Badge key={i} variant={s.active ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {s.length} {s.length === 1 ? "race" : "races"}
                      {s.active ? " (active)" : ""}
                    </Badge>
                  ))}
                  {pointStreaks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No points streaks yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TeammateSection({
  driverUuid,
  season,
  constructorId,
  driverId,
}: {
  driverUuid: string
  season: number
  constructorId: string
  driverId: string
}) {
  const { data: teamResults } = useQuery({
    queryKey: ["team-results", constructorId, season],
    queryFn: async () => {
      const { data: races } = await supabase
        .from("races")
        .select("id")
        .eq("season_year", season)

      if (!races || races.length === 0) return { results: [], qualifying: [], teammate: null, teammateName: "" }

      const raceIds = races.map((r) => r.id)

      const { data: results } = await supabase
        .from("race_results")
        .select("*, drivers!inner(driver_id, given_name, family_name)")
        .in("race_id", raceIds)
        .eq("constructor_id", constructorId)
        .order("race_id", { ascending: true })

      const { data: quali } = await supabase
        .from("qualifying_results")
        .select("*, drivers!inner(driver_id, given_name, family_name)")
        .in("race_id", raceIds)
        .eq("constructor_id", constructorId)

      const allResults = (results ?? []) as (Record<string, unknown> & { driver_id: string; drivers: { driver_id: string; given_name: string; family_name: string } })[]
      const allQuali = (quali ?? []) as (Record<string, unknown> & { driver_id: string; drivers: { driver_id: string; given_name: string; family_name: string } })[]

      const teammate = allResults.find((r) => r.driver_id !== driverUuid)
      const teammateName = teammate ? `${teammate.drivers.given_name} ${teammate.drivers.family_name}` : ""

      return { results: allResults, qualifying: allQuali, teammate: teammate?.driver_id ?? null, teammateName }
    },
    enabled: !!driverUuid,
  })

  if (!teamResults?.teammate) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm font-medium">{season}</p>
          <p className="text-xs text-muted-foreground mt-1">No teammate data available for this season.</p>
        </CardContent>
      </Card>
    )
  }

  const driverRaceResults = teamResults.results.filter((r) => r.driver_id === driverUuid)
  const teammateRaceResults = teamResults.results.filter((r) => r.driver_id === teamResults.teammate)
  const driverQuali = teamResults.qualifying.filter((q) => q.driver_id === driverUuid)
  const teammateQuali = teamResults.qualifying.filter((q) => q.driver_id === teamResults.teammate)

  const commonRaceIds = driverRaceResults
    .map((r) => r.race_id)
    .filter((id) => teammateRaceResults.some((tr) => tr.race_id === id))

  let raceH2H = { driverWins: 0, teammateWins: 0, ties: 0 }
  let qualiH2H = { driverWins: 0, teammateWins: 0, ties: 0 }

  for (const raceId of commonRaceIds) {
    const dr = driverRaceResults.find((r) => r.race_id === raceId)
    const tr = teammateRaceResults.find((r) => r.race_id === raceId)
    if (dr?.position && tr?.position) {
      if (dr.position < tr.position) raceH2H.driverWins++
      else if (tr.position < dr.position) raceH2H.teammateWins++
      else raceH2H.ties++
    }

    const dq = driverQuali.find((q) => q.race_id === raceId)
    const tq = teammateQuali.find((q) => q.race_id === raceId)
    if (dq?.position && tq?.position) {
      if (dq.position < tq.position) qualiH2H.driverWins++
      else if (tq.position < dq.position) qualiH2H.teammateWins++
      else qualiH2H.ties++
    }
  }

  const driverPoints = driverRaceResults.reduce((s, r) => s + r.points, 0)
  const teammatePoints = teammateRaceResults.reduce((s, r) => s + r.points, 0)

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{season} Season</p>
          <Badge variant="outline">
            {commonRaceIds.length} races together
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">{driverId}</p>
            <p>Points: {driverPoints}</p>
            <p>Wins: {driverRaceResults.filter((r) => r.position === 1).length}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{teamResults.teammateName}</p>
            <p>Points: {teammatePoints}</p>
            <p>Wins: {teammateRaceResults.filter((r) => r.position === 1).length}</p>
          </div>
        </div>
        <div className="border-t pt-2 text-xs text-muted-foreground">
          <p>Race H2H: {raceH2H.driverWins} - {raceH2H.teammateWins} {raceH2H.ties > 0 ? `(${raceH2H.ties} ties)` : ""}</p>
          <p>Qualifying H2H: {qualiH2H.driverWins} - {qualiH2H.teammateWins} {qualiH2H.ties > 0 ? `(${qualiH2H.ties} ties)` : ""}</p>
        </div>
      </CardContent>
    </Card>
  )
}
