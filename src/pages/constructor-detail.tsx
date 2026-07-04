import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { computeConstructorStats } from "@/lib/stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getConstructorColors } from "@/lib/constructorColors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Constructor, RaceResult, ConstructorStanding } from "@/types/database"

export default function ConstructorDetailPage() {
  const { constructorId } = useParams()

  const { data: team } = useQuery({
    queryKey: ["constructor", constructorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("constructors")
        .select("*")
        .eq("constructor_id", constructorId)
        .single()
      return data as Constructor | null
    },
  })

  const { data: teamRecord } = useQuery({
    queryKey: ["constructor-record", constructorId],
    queryFn: async () => {
      if (!constructorId) return null
      const { data } = await supabase
        .from("constructors")
        .select("id")
        .eq("constructor_id", constructorId)
        .single()
      return data as { id: string } | null
    },
    enabled: !!constructorId,
  })

  const teamUuid = teamRecord?.id

  const { data: constructorResults } = useQuery({
    queryKey: ["constructor-results", constructorId],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, races!inner(season_year, round, name, date, circuit_id, circuits!inner(name)), driver:drivers(driver_id, given_name, family_name)")
        .eq("constructor_id", teamUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
        .limit(100)
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string; date: string; circuit_id: string; circuits: { name: string } }; driver: { driver_id: string; given_name: string; family_name: string } })[]
    },
    enabled: !!teamUuid,
  })

  const { data: standings } = useQuery({
    queryKey: ["constructor-standings", constructorId],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("constructor_standings")
        .select("*")
        .eq("constructor_id", teamUuid)
        .order("season_year", { ascending: false })
        .order("points", { ascending: false })
      if (!data) return []
      const grouped = new Map<number, ConstructorStanding>()
      for (const s of data as ConstructorStanding[]) {
        const existing = grouped.get(s.season_year)
        if (!existing || (s.points > existing.points)) {
          grouped.set(s.season_year, s)
        }
      }
      return [...grouped.values()].sort((a, b) => b.season_year - a.season_year)
    },
    enabled: !!teamUuid,
  })

  const { data: drivers } = useQuery({
    queryKey: ["constructor-drivers", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("drivers!inner(driver_id, given_name, family_name, nationality), races!inner(season_year)")
        .eq("constructor_id", teamUuid)
      if (!data) return []
      const driverMap = new Map<string, { driver_id: string; given_name: string; family_name: string; nationality: string | null; seasons: number[] }>()
      for (const r of data as unknown as { drivers: { driver_id: string; given_name: string; family_name: string; nationality: string | null }; races: { season_year: number } }[]) {
        const did = r.drivers.driver_id
        if (!driverMap.has(did)) {
          driverMap.set(did, { driver_id: did, given_name: r.drivers.given_name, family_name: r.drivers.family_name, nationality: r.drivers.nationality, seasons: [] })
        }
        const entry = driverMap.get(did)!
        if (!entry.seasons.includes(r.races.season_year)) {
          entry.seasons.push(r.races.season_year)
        }
      }
      return [...driverMap.values()].sort((a, b) => b.seasons[0] - a.seasons[0])
    },
    enabled: !!teamUuid,
  })

  const { data: teamCarImages } = useQuery({
    queryKey: ["team-car-images", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("team_car_images")
        .select("*")
        .eq("constructor_id", teamUuid)
        .order("year", { ascending: false })
      return (data ?? []) as { id: string; year: number; image_url: string; caption: string | null }[]
    },
    enabled: !!teamUuid,
  })

  const { data: qualiResults } = useQuery({
    queryKey: ["constructor-quali", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("driver_id, position")
        .eq("constructor_id", teamUuid)
      return (data ?? []) as { driver_id: string; position: number | null }[]
    },
    enabled: !!teamUuid,
  })

  const { data: sprintResults } = useQuery({
    queryKey: ["constructor-sprints", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("driver_id, position, points")
        .eq("constructor_id", teamUuid)
      return (data ?? []) as { driver_id: string; position: number | null; points: number }[]
    },
    enabled: !!teamUuid,
  })

  const driverRecords = (constructorResults ?? []).reduce((acc, r) => {
    const did = r.driver.driver_id
    if (!acc.has(did)) acc.set(did, { driver_id: did, given_name: r.driver.given_name, family_name: r.driver.family_name, races: 0, wins: 0, podiums: 0, points: 0, poles: 0, sprints: 0, sprintWins: 0, sprintPodiums: 0, sprintPoints: 0 })
    const rec = acc.get(did)!
    rec.races++
    if (r.position === 1) rec.wins++
    if (r.position !== null && r.position <= 3) rec.podiums++
    rec.points += r.points
    return acc
  }, new Map<string, { driver_id: string; given_name: string; family_name: string; races: number; wins: number; podiums: number; points: number; poles: number; sprints: number; sprintWins: number; sprintPodiums: number; sprintPoints: number }>())

  for (const q of qualiResults ?? []) {
    const did = q.driver_id
    if (driverRecords.has(did) && q.position === 1) {
      driverRecords.get(did)!.poles++
    }
  }

  for (const s of sprintResults ?? []) {
    const did = s.driver_id
    if (driverRecords.has(did)) {
      const rec = driverRecords.get(did)!
      rec.sprints++
      if (s.position === 1) rec.sprintWins++
      if (s.position !== null && s.position <= 3) rec.sprintPodiums++
      rec.sprintPoints += s.points
    }
  }

  const sortedDriverRecords = [...driverRecords.values()].sort((a, b) => b.wins - a.wins)

  const driverMilestones = (() => {
    const map = new Map<string, {
      driver_id: string
      given_name: string
      family_name: string
      circuit_id: string
      circuit_name: string
      races: number
      longestWins: number
      longestPodiums: number
      longestPoles: number
      longestPoints: number
      currentWinStreak: number
      currentPodiumStreak: number
      currentPoleStreak: number
      currentPointsStreak: number
    }>()

    const rows = [...(constructorResults ?? [])]
      .filter((r) => r.races?.circuit_id && r.races?.circuits?.name)
      .sort((a, b) => new Date(a.races.date).getTime() - new Date(b.races.date).getTime())

    for (const r of rows) {
      const driverId = r.driver.driver_id
      const circuitId = r.races.circuit_id
      const circuitName = r.races.circuits?.name ?? "Unknown Circuit"
      const key = `${driverId}|${circuitId}`
      if (!map.has(key)) {
        map.set(key, {
          driver_id: driverId,
          given_name: r.driver.given_name,
          family_name: r.driver.family_name,
          circuit_id: circuitId,
          circuit_name: circuitName,
          races: 0,
          longestWins: 0,
          longestPodiums: 0,
          longestPoles: 0,
          longestPoints: 0,
          currentWinStreak: 0,
          currentPodiumStreak: 0,
          currentPoleStreak: 0,
          currentPointsStreak: 0,
        })
      }
      const entry = map.get(key)!
      entry.races += 1

      if (r.position === 1) {
        entry.currentWinStreak += 1
      } else {
        entry.currentWinStreak = 0
      }
      entry.longestWins = Math.max(entry.longestWins, entry.currentWinStreak)

      if (r.position !== null && r.position <= 3) {
        entry.currentPodiumStreak += 1
      } else {
        entry.currentPodiumStreak = 0
      }
      entry.longestPodiums = Math.max(entry.longestPodiums, entry.currentPodiumStreak)

      if (r.grid === 1) {
        entry.currentPoleStreak += 1
      } else {
        entry.currentPoleStreak = 0
      }
      entry.longestPoles = Math.max(entry.longestPoles, entry.currentPoleStreak)

      if (r.points > 0) {
        entry.currentPointsStreak += 1
      } else {
        entry.currentPointsStreak = 0
      }
      entry.longestPoints = Math.max(entry.longestPoints, entry.currentPointsStreak)
    }

    return [...map.values()].sort((a, b) => b.longestWins - a.longestWins || b.longestPodiums - a.longestPodiums || b.longestPoints - a.longestPoints)
  })()

  const stats = constructorResults && standings
    ? computeConstructorStats(constructorResults as RaceResult[], standings)
    : null

  if (!team) {
    return <PageSkeleton />
  }

  const colors = getConstructorColors(team.name)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {team.logo_url && (
          <img
            src={team.logo_url}
            alt={`${team.name} logo`}
            className="w-16 h-16 object-contain rounded-md"
          />
        )}
        <div>
          <div className="flex items-center gap-3">
            {colors && (
              <div className="w-10 h-10 rounded-sm" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, border: `2px solid ${colors.accent}` }} />
            )}
            <h1 className="text-3xl font-bold">{team.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {team.nationality && <Badge>{team.nationality}</Badge>}
            {team.founded_year && <Badge variant="secondary">Founded {team.founded_year}</Badge>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 max-w-md text-sm">
            {team.base && (
              <div>
                <span className="text-muted-foreground">Base</span>
                <p className="font-medium">{team.base}</p>
              </div>
            )}
            {team.principal && (
              <div>
                <span className="text-muted-foreground">Team Principal</span>
                <p className="font-medium">{team.principal}</p>
              </div>
            )}
            {team.engine_supplier && (
              <div>
                <span className="text-muted-foreground">Engine</span>
                <p className="font-medium">{team.engine_supplier}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Championships</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.championships}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{(stats.winRate * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalPoints}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {teamCarImages && teamCarImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Car Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teamCarImages.map((img) => (
                <div key={img.id} className="space-y-1">
                  <img
                    src={img.image_url}
                    alt={`${team.name} ${img.year} car`}
                    className="w-full h-32 object-contain rounded-md border bg-muted/30"
                  />
                  <p className="text-sm text-center font-medium">{img.year}</p>
                  {img.caption && <p className="text-xs text-center text-muted-foreground">{img.caption}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="standings">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="standings">Season Standings</TabsTrigger>
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="drivers">Driver Roster</TabsTrigger>
            <TabsTrigger value="records">Driver Records</TabsTrigger>
            <TabsTrigger value="milestones">Driver Milestones</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="standings">
          <Card>
            <CardHeader>
              <CardTitle>Championship History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead className="text-center">Position</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.season_year}</TableCell>
                      <TableCell className="text-center">{s.position ? `P${s.position}` : "—"}</TableCell>
                      <TableCell className="text-right">{s.points}</TableCell>
                      <TableCell className="text-right">{s.wins}</TableCell>
                    </TableRow>
                  ))}
                  {(!standings || standings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No standings data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Recent Race Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Pos</TableHead>
                    <TableHead>Grid</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructorResults?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.races.season_year}</TableCell>
                      <TableCell>{r.races.round}</TableCell>
                      <TableCell>
                        <Link to={`/races/${r.race_id}`} className="hover:underline">{r.races.name}</Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/drivers/${r.driver.driver_id}`} className="hover:underline">
                          {r.driver.given_name} {r.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{r.position ?? r.position_text ?? "DNF"}</TableCell>
                      <TableCell>{r.grid ?? "—"}</TableCell>
                      <TableCell>{r.points}</TableCell>
                      <TableCell>{r.status ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!constructorResults || constructorResults.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No race results available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Drivers who drove for {team.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Season</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers?.map((d) => (
                    <TableRow key={d.driver_id}>
                      <TableCell>
                        <Link to={`/drivers/${d.driver_id}`} className="hover:underline font-medium">
                          {d.given_name} {d.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{d.nationality ?? "—"}</TableCell>
                      <TableCell>{d.seasons.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                  {(!drivers || drivers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No driver data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Driver Records — {team.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Races</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead>Win %</TableHead>
                    <TableHead>Podiums</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Poles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDriverRecords.map((d) => (
                    <TableRow key={d.driver_id}>
                      <TableCell>
                        <Link to={`/drivers/${d.driver_id}`} className="font-medium hover:underline">
                          {d.given_name} {d.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{d.races + d.sprints}</TableCell>
                      <TableCell className="font-semibold">{d.wins + d.sprintWins}</TableCell>
                      <TableCell>{d.races + d.sprints > 0 ? `${((d.wins + d.sprintWins) / (d.races + d.sprints) * 100).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell>{d.podiums + d.sprintPodiums}</TableCell>
                      <TableCell className="font-bold">{d.points + d.sprintPoints}</TableCell>
                      <TableCell>{d.poles}</TableCell>
                    </TableRow>
                  ))}
                  {sortedDriverRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No race results available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Driver Milestones — {team.name}</CardTitle>
              <CardDescription>Best streaks by driver at each circuit with team results.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Circuit</TableHead>
                    <TableHead>Races</TableHead>
                    <TableHead>Best Win Streak</TableHead>
                    <TableHead>Best Podium Streak</TableHead>
                    <TableHead>Best Pole Streak</TableHead>
                    <TableHead>Best Points Streak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverMilestones.map((item) => (
                    <TableRow key={`${item.driver_id}-${item.circuit_id}`}>
                      <TableCell>
                        <Link to={`/drivers/${item.driver_id}`} className="font-medium hover:underline">
                          {item.given_name} {item.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{item.circuit_name}</TableCell>
                      <TableCell>{item.races}</TableCell>
                      <TableCell>{item.longestWins}</TableCell>
                      <TableCell>{item.longestPodiums}</TableCell>
                      <TableCell>{item.longestPoles}</TableCell>
                      <TableCell>{item.longestPoints}</TableCell>
                    </TableRow>
                  ))}
                  {driverMilestones.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No driver milestones available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
