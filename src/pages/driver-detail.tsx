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
import type { Driver, RaceResult, SprintResult } from "@/types/database"

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

  const { data: teamRaceStats } = useQuery({
    queryKey: ["driver-team-race-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, points, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; points: number; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: teamQualiStats } = useQuery({
    queryKey: ["driver-team-quali-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("position, constructor_id, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; constructor_id: string; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const driverTeamRecords = (() => {
    const teams = new Map<string, { constructor_id: string; name: string; races: number; wins: number; podiums: number; points: number; poles: number }>()
    for (const r of teamRaceStats ?? []) {
      const cid = r.constructors.constructor_id
      if (!teams.has(cid)) teams.set(cid, { constructor_id: cid, name: r.constructors.name, races: 0, wins: 0, podiums: 0, points: 0, poles: 0 })
      const t = teams.get(cid)!
      t.races++
      if (r.position === 1) t.wins++
      if (r.position !== null && r.position <= 3) t.podiums++
      t.points += r.points
    }
    for (const q of teamQualiStats ?? []) {
      const cid = q.constructors.constructor_id
      if (teams.has(cid) && q.position === 1) teams.get(cid)!.poles++
    }
    return [...teams.values()].sort((a, b) => b.wins - a.wins)
  })()

  const { data: teamSeasons } = useQuery({
    queryKey: ["driver-team-seasons", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("constructors!inner(name, constructor_id), races!inner(season_year)")
        .eq("driver_id", driverUuid)
      if (!data) return []
      const seen = new Set<string>()
      const out: { constructor_id: string; constructor_name: string; season_year: number }[] = []
      for (const r of data as unknown as { constructors: { name: string; constructor_id: string }; races: { season_year: number } }[]) {
        const key = `${r.constructors.constructor_id}|${r.races.season_year}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          constructor_id: r.constructors.constructor_id,
          constructor_name: r.constructors.name,
          season_year: r.races.season_year,
        })
      }
      return out.sort((a, b) => b.season_year - a.season_year)
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
  teamSeasons?.forEach((ts) => {
    if (!teamBySeason.has(ts.season_year)) {
      teamBySeason.set(ts.season_year, {
        name: ts.constructor_name,
        constructor_id: ts.constructor_id,
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
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="seasons">Season by Season</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="team-records">Team Records</TabsTrigger>
            <TabsTrigger value="teammates">Teammate Battle</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
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
                      <TableHead>Sprints</TableHead>
                      <TableHead>SW</TableHead>
                      <TableHead>SP</TableHead>
                      <TableHead>SPts</TableHead>
                      <TableHead>Avg Finish</TableHead>
                      <TableHead>Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.map((season) => {
                    const seasonResults = (results ?? []).filter((r) => r.races.season_year === season)
                    const seasonSprints = (sprints ?? []).filter((s) => s.races.season_year === season)
                    const seasonData = computeDriverSeasonStats(seasonResults, season, seasonSprints)
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
                        <TableCell>{seasonData.sprints}</TableCell>
                        <TableCell>{seasonData.sprintWins}</TableCell>
                        <TableCell>{seasonData.sprintPodiums}</TableCell>
                        <TableCell>{seasonData.sprintPoints}</TableCell>
                        <TableCell>{seasonData.avgFinishingPosition?.toFixed(1) ?? "—"}</TableCell>
                        <TableCell>{(seasonData.winRate * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    )
                  })}
                  {seasons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground">
                        No season data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Team History & Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {teamSeasons && teamSeasons.length > 0 ? (
                <div className="space-y-6">
                  {(() => {
                    const latestSeason = teamSeasons[0].season_year
                    const currentTeam = {
                      name: teamSeasons[0].constructor_name,
                      constructor_id: teamSeasons[0].constructor_id,
                    }
                    const seenCtors = new Set<string>()
                    const priorTeams = teamSeasons.filter((ts) => {
                      if (seenCtors.has(ts.constructor_id)) return false
                      if (ts.season_year === latestSeason && ts.constructor_id === currentTeam.constructor_id) return false
                      seenCtors.add(ts.constructor_id)
                      return true
                    })
                    return (
                      <>
                        <Card className="border-primary/30 bg-primary/5">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Team</p>
                              <Link
                                to={`/constructors/${currentTeam.constructor_id}`}
                                className="text-xl font-bold hover:underline"
                              >
                                {currentTeam.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">since {latestSeason}</p>
                            </div>
                            <Badge variant="default" className="text-xs">{latestSeason}</Badge>
                          </CardContent>
                        </Card>
                        {priorTeams.map((ts) => (
                          <TeamHistoryCard key={ts.constructor_id} entry={ts} teamSeasons={teamSeasons} results={results ?? []} driverUuid={driverUuid!} />
                        ))}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground">No team history data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-records">
          <Card>
            <CardHeader>
              <CardTitle>Team Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Races</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead>Win %</TableHead>
                    <TableHead>Podiums</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Poles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverTeamRecords.map((t) => (
                    <TableRow key={t.constructor_id}>
                      <TableCell>
                        <Link to={`/constructors/${t.constructor_id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell>{t.races}</TableCell>
                      <TableCell className="font-semibold">{t.wins}</TableCell>
                      <TableCell>{t.races > 0 ? `${(t.wins / t.races * 100).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell>{t.podiums}</TableCell>
                      <TableCell className="font-bold">{t.points}</TableCell>
                      <TableCell>{t.poles}</TableCell>
                    </TableRow>
                  ))}
                  {driverTeamRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No team record data available.
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
              {teamSeasons && teamSeasons.length > 0 ? (
                <div className="space-y-6">
                  {teamSeasons.map((ts) => (
                    <TeammateSection
                      key={`${ts.season_year}-${ts.constructor_id}`}
                      driverUuid={driverUuid!}
                      season={ts.season_year}
                      constructorId={ts.constructor_id}
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
        .select("*, constructors!inner(constructor_id), drivers!inner(driver_id, given_name, family_name)")
        .in("race_id", raceIds)
        .eq("constructors.constructor_id", constructorId)
        .order("race_id", { ascending: true })

      const { data: quali } = await supabase
        .from("qualifying_results")
        .select("*, constructors!inner(constructor_id), drivers!inner(driver_id, given_name, family_name)")
        .in("race_id", raceIds)
        .eq("constructors.constructor_id", constructorId)

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

function TeamHistoryCard({
  entry,
  teamSeasons,
  results,
  driverUuid,
}: {
  entry: { constructor_id: string; constructor_name: string; season_year: number }
  teamSeasons: { constructor_id: string; constructor_name: string; season_year: number }[]
  results: (RaceResult & { races: { season_year: number; round: number; name: string; date: string } })[]
  driverUuid: string
}) {
  const teamResults = results.filter(
    (r) => r.driver_id === driverUuid && r.constructor_id === entry.constructor_id
  )
  const seasons = [...new Set(
    teamSeasons
      .filter((ts) => ts.constructor_id === entry.constructor_id)
      .map((ts) => ts.season_year)
  )].sort((a, b) => b - a)

  const wins = teamResults.filter((r) => r.position === 1).length
  const podiums = teamResults.filter((r) => r.position !== null && r.position <= 3).length
  const points = teamResults.reduce((s, r) => s + r.points, 0)
  const finished = teamResults.filter((r) => r.position !== null)
  const avgFinish = finished.length > 0
    ? finished.reduce((s, r) => s + r.position!, 0) / finished.length
    : null

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Link to={`/constructors/${entry.constructor_id}`} className="text-lg font-semibold hover:underline">{entry.constructor_name}</Link>
            <p className="text-sm text-muted-foreground">{seasons.join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
              {teamResults.length} races
            </span>
            {wins > 0 && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full px-2 py-0.5">
                {wins} {wins === 1 ? "win" : "wins"}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Wins</span>
            <p className="font-semibold">{wins}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Podiums</span>
            <p className="font-semibold">{podiums}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Points</span>
            <p className="font-semibold">{points}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Finish</span>
            <p className="font-semibold">{avgFinish?.toFixed(1) ?? "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
