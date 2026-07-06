import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { computeDriverCareerStats, computeDriverSeasonStats, detectMilestones, getStreaks } from "@/lib/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Driver, DriverImage, QualifyingResult, RaceResult, SprintResult } from "@/types/database"

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
        .select("*, races!inner(season_year, round, name, date, circuit_id, distance_km, circuits!inner(name))")
        .eq("driver_id", driverUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string; date: string; circuit_id: string; distance_km: number | null; circuits: { name: string } } })[]
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
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (SprintResult & { races: { season_year: number; round: number; name: string; date: string } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: qualifyingResults } = useQuery({
    queryKey: ["driver-qualifying-results", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("position, q1, q2, q3, races!inner(season_year, round, name, date)")
        .eq("driver_id", driverUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (QualifyingResult & { races: { season_year: number; round: number; name: string; date: string } })[]
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

  const { data: teamSprintStats } = useQuery({
    queryKey: ["driver-team-sprint-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("position, points, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; points: number; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: driverImages } = useQuery({
    queryKey: ["driver-images-gallery", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .eq("driver_id", driverUuid)
        .order("created_at", { ascending: false })
      return (data ?? []) as DriverImage[]
    },
    enabled: !!driverUuid,
  })

  const driverTeamRecords = (() => {
    const teams = new Map<string, { constructor_id: string; name: string; races: number; wins: number; podiums: number; points: number; poles: number; sprints: number; sprintWins: number; sprintPodiums: number; sprintPoints: number }>()
    for (const r of teamRaceStats ?? []) {
      const cid = r.constructors.constructor_id
      if (!teams.has(cid)) teams.set(cid, { constructor_id: cid, name: r.constructors.name, races: 0, wins: 0, podiums: 0, points: 0, poles: 0, sprints: 0, sprintWins: 0, sprintPodiums: 0, sprintPoints: 0 })
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
    for (const s of teamSprintStats ?? []) {
      const cid = s.constructors.constructor_id
      if (teams.has(cid)) {
        const t = teams.get(cid)!
        t.sprints++
        if (s.position === 1) t.sprintWins++
        if (s.position !== null && s.position <= 3) t.sprintPodiums++
        t.sprintPoints += s.points
      }
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
  const { data: winsWithCircuit } = useQuery({
    queryKey: ["driver-wins-circuit", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, grid, races!inner(season_year, round, name, date, circuit_id)")
        .eq("driver_id", driverUuid)
        .eq("position", 1)
        .order("races(date)", { ascending: true })
        .order("races(round)", { ascending: true })
      return (data ?? []) as { position: number | null; grid: number | null; races: { season_year: number; round: number; name: string; date: string; circuit_id: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: circuitsMap } = useQuery({
    queryKey: ["circuits-map"],
    queryFn: async () => {
      const { data } = await supabase.from("circuits").select("id, name")
      return new Map((data ?? [] as { id: string; name: string }[]).map((c) => [c.id, c.name]))
    },
    staleTime: Infinity,
  })

  const achievements = (() => {
    if (!winsWithCircuit || winsWithCircuit.length === 0) return null
    const wins = winsWithCircuit

    const circuitWins = new Map<string, { name: string; count: number }>()
    for (const w of wins) {
      const cid = w.races.circuit_id
      const cname = circuitsMap?.get(cid) ?? "Unknown"
      const existing = circuitWins.get(cid)
      if (existing) existing.count++
      else circuitWins.set(cid, { name: cname, count: 1 })
    }
    const favoriteCircuit = [...circuitWins.values()].sort((a, b) => b.count - a.count)[0]

    const firstWin = wins[0]
    const latestWin = wins[wins.length - 1]

    const seasonWins = new Map<number, number>()
    for (const w of wins) {
      seasonWins.set(w.races.season_year, (seasonWins.get(w.races.season_year) ?? 0) + 1)
    }
    const bestSeason = [...seasonWins.entries()].sort((a, b) => b[1] - a[1])[0]

    const seasonsSorted = [...seasonWins.keys()].sort((a, b) => a - b)
    let consecutiveStreak = 1
    let bestStreak = 1
    for (let i = 1; i < seasonsSorted.length; i++) {
      if (seasonsSorted[i] === seasonsSorted[i - 1] + 1) {
        consecutiveStreak++
        bestStreak = Math.max(bestStreak, consecutiveStreak)
      } else {
        consecutiveStreak = 1
      }
    }

    const comebackWins = wins.filter((w) => w.grid != null && w.grid > 5).length
    const poleWins = wins.filter((w) => w.grid === 1).length
    const nonPoleWins = wins.length - poleWins

    return {
      totalWins: wins.length,
      favoriteCircuit,
      firstWin,
      latestWin,
      bestSeason,
      consecutiveWinningSeasons: bestStreak,
      comebackWins,
      poleWins,
      nonPoleWins,
    }
  })()

  const milestones = results ? detectMilestones(results as RaceResult[]) : []
  const winStreaks = results ? getStreaks(results as RaceResult[], "wins") : []
  const podiumStreaks = results ? getStreaks(results as RaceResult[], "podiums") : []
  const pointStreaks = results ? getStreaks(results as RaceResult[], "points") : []

  const frontRowStarts = qualifyingResults?.filter((q) => q.position !== null && q.position <= 2).length ?? 0
  const q3Appearances = qualifyingResults?.filter((q) => q.q3 && q.q3.trim() !== "").length ?? 0
  const pointsFinishes = stats?.pointsFinishes ?? 0
  const top5Finishes = results?.filter((r) => r.position !== null && r.position <= 5).length ?? 0
  const top10Finishes = results?.filter((r) => r.position !== null && r.position <= 10).length ?? 0
  const totalLapsCompleted = results?.reduce((sum, r) => sum + (r.laps ?? 0), 0) ?? 0
  const totalKilometersRaced = results?.reduce((sum, r) => sum + (r.races?.distance_km ?? 0), 0) ?? 0
  const grandSlams = results?.filter((r) => r.position === 1 && r.grid === 1 && r.fastest_lap_rank === 1).length ?? 0
  const averageQualifying = (() => {
    const positions = qualifyingResults?.filter((q) => q.position !== null).map((q) => q.position!) ?? []
    return positions.length > 0 ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length : null
  })()
  const averageGrid = stats?.avgGridPosition ?? null

  const [circuitSort, setCircuitSort] = useState<"wins" | "podiums" | "avgFinish">("wins")
  const [showAllStats, setShowAllStats] = useState(false)

  const circuitPerformance = (() => {
    const map = new Map<string, {
      circuitId: string
      circuitName: string
      races: number
      wins: number
      podiums: number
      poles: number
      fastestLaps: number
      points: number
      finishCount: number
      finishTotal: number
    }>()

    for (const r of results ?? []) {
      const circuitId = r.races?.circuit_id ?? ""
      const circuitName = r.races?.circuits?.name ?? r.races?.name ?? "Unknown"
      if (!map.has(circuitId)) {
        map.set(circuitId, {
          circuitId,
          circuitName,
          races: 0,
          wins: 0,
          podiums: 0,
          poles: 0,
          fastestLaps: 0,
          points: 0,
          finishCount: 0,
          finishTotal: 0,
        })
      }
      const entry = map.get(circuitId)!
      entry.races += 1
      if (r.position === 1) entry.wins += 1
      if (r.position !== null && r.position <= 3) entry.podiums += 1
      if (r.grid === 1) entry.poles += 1
      if (r.fastest_lap_rank === 1) entry.fastestLaps += 1
      entry.points += r.points
      if (r.position !== null) {
        entry.finishCount += 1
        entry.finishTotal += r.position
      }
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        averageFinish: entry.finishCount > 0 ? entry.finishTotal / entry.finishCount : null,
      }))
      .sort((a, b) => {
        if (circuitSort === "wins") return b.wins - a.wins || a.averageFinish - b.averageFinish
        if (circuitSort === "podiums") return b.podiums - a.podiums || a.averageFinish - b.averageFinish
        return (a.averageFinish ?? Number.POSITIVE_INFINITY) - (b.averageFinish ?? Number.POSITIVE_INFINITY) || b.wins - a.wins
      })
  })()

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
        {driver.photo_url && (
          <div className="relative shrink-0 self-center">
            <img src={driver.photo_url} alt={`${driver.given_name} ${driver.family_name}`} className="w-28 h-28 object-cover rounded-lg" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent rounded-b-lg" />
          </div>
        )}
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

      {driverImages && driverImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Driver Images</CardTitle>
          </CardHeader>
          <CardContent>
            {(["hero", "card", "pole", "event"] as const).map((type) => {
              const filtered = driverImages.filter((img) => img.type === type)
              if (filtered.length === 0) return null
              const typeLabel = type === "hero" ? "Hero Banner" : type === "card" ? "Card" : type === "pole" ? "Pole Position" : "Event"
              return (
                <div key={type} className="mb-4 last:mb-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{typeLabel}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((img) => (
                      <div key={img.id} className="space-y-1">
                        <img
                          src={img.image_url}
                          alt={`${driver.given_name} ${driver.family_name} ${typeLabel}`}
                          className="w-full h-32 object-contain rounded-md border bg-muted/30"
                        />
                        {img.year && <p className="text-sm text-center font-medium">{img.year}</p>}
                        {img.caption && <p className="text-xs text-center text-muted-foreground">{img.caption}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="results">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="seasons">Season by Season</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="team-records">Team Records</TabsTrigger>
            <TabsTrigger value="teammates">Teammate Battle</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="circuit-performance">Circuit Performance</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="advanced-stats">Advanced Stats</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Race Results</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">All Stats</span>
                <button
                  onClick={() => setShowAllStats(!showAllStats)}
                  aria-pressed={showAllStats}
                  className={
                    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ` +
                    (showAllStats ? "bg-primary" : "bg-muted")
                  }
                >
                  <span
                    className={
                      `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ` +
                      (showAllStats ? "translate-x-5" : "translate-x-1")
                    }
                  />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><div>Season</div></TableHead>
                    <TableHead><div>Race</div></TableHead>
                    <TableHead><div className="text-center">Position</div></TableHead>
                    <TableHead><div className="text-center">Grid</div></TableHead>
                    <TableHead><div className="text-end">Points</div></TableHead>
                    {showAllStats && <TableHead><div>Status</div></TableHead>}
                    {showAllStats && <TableHead><div className="text-end">Fastest Lap</div></TableHead>}
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
                      <TableCell><div className="text-center">{r.position ?? r.position_text ?? "DNF"}</div></TableCell>
                      <TableCell><div className="text-center">{r.grid ?? "—"}</div></TableCell>
                      <TableCell><div className="text-end">{r.points}</div></TableCell>
                      {showAllStats && <TableCell>{r.status ?? "—"}</TableCell>}
                      {showAllStats && <TableCell><div className="text-end font-mono">{r.fastest_lap_time ?? "—"}</div></TableCell>}
                    </TableRow>
                  ))}
                  {(!results || results.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={showAllStats ? 7 : 5} className="text-center text-muted-foreground">
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
                        <TableCell>{seasonData.races + seasonData.sprints}</TableCell>
                        <TableCell>{seasonData.wins + seasonData.sprintWins}</TableCell>
                        <TableCell>{seasonData.podiums + seasonData.sprintPodiums}</TableCell>
                        <TableCell className="font-bold">{seasonData.points + seasonData.sprintPoints}</TableCell>
                        <TableCell>{seasonData.avgFinishingPosition?.toFixed(1) ?? "—"}</TableCell>
                        <TableCell>{seasonData.races + seasonData.sprints > 0 ? `${((seasonData.wins + seasonData.sprintWins) / (seasonData.races + seasonData.sprints) * 100).toFixed(0)}%` : "—"}</TableCell>
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
                    const currentTeamSince = Math.min(
                      ...teamSeasons
                        .filter((ts) => ts.constructor_id === currentTeam.constructor_id)
                        .map((ts) => ts.season_year)
                    )
                    const currentTeamRecord = driverTeamRecords.find((t) => t.constructor_id === currentTeam.constructor_id)
                    const seenCtors = new Set<string>()
                    const priorTeams = teamSeasons.filter((ts) => {
                      if (ts.constructor_id === currentTeam.constructor_id) return false
                      if (seenCtors.has(ts.constructor_id)) return false
                      seenCtors.add(ts.constructor_id)
                      return true
                    })
                    return (
                      <>
                        <Card className="border-primary/30 bg-primary/5">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Team</p>
                                <Link
                                  to={`/constructors/${currentTeam.constructor_id}`}
                                  className="text-xl font-bold hover:underline"
                                >
                                  {currentTeam.name}
                                </Link>
                                <p className="text-sm text-muted-foreground">since {currentTeamSince}</p>
                              </div>
                              <Badge variant="default" className="text-xs">{latestSeason}</Badge>
                            </div>
                            {currentTeamRecord && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-primary/20">
                                <div>
                                  <span className="text-muted-foreground">Races</span>
                                  <p className="font-semibold">{currentTeamRecord.races + currentTeamRecord.sprints}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Wins</span>
                                  <p className="font-semibold">{currentTeamRecord.wins + currentTeamRecord.sprintWins}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Podiums</span>
                                  <p className="font-semibold">{currentTeamRecord.podiums + currentTeamRecord.sprintPodiums}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Points</span>
                                  <p className="font-semibold">{currentTeamRecord.points + currentTeamRecord.sprintPoints}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Poles</span>
                                  <p className="font-semibold">{currentTeamRecord.poles}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Win Rate</span>
                                  <p className="font-semibold">
                                    {currentTeamRecord.races + currentTeamRecord.sprints > 0
                                      ? `${((currentTeamRecord.wins + currentTeamRecord.sprintWins) / (currentTeamRecord.races + currentTeamRecord.sprints) * 100).toFixed(1)}%`
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        {priorTeams.map((ts) => {
                          const teamRecord = driverTeamRecords.find((t) => t.constructor_id === ts.constructor_id)
                          return (
                            <TeamHistoryCard key={ts.constructor_id} entry={ts} teamSeasons={teamSeasons} results={results ?? []} driverUuid={driverUuid!} teamRecord={teamRecord} />
                          )
                        })}
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
                      <TableCell>{t.races + t.sprints}</TableCell>
                      <TableCell className="font-semibold">{t.wins + t.sprintWins}</TableCell>
                      <TableCell>{t.races + t.sprints > 0 ? `${((t.wins + t.sprintWins) / (t.races + t.sprints) * 100).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell>{t.podiums + t.sprintPodiums}</TableCell>
                      <TableCell className="font-bold">{t.points + t.sprintPoints}</TableCell>
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
                        {m.raceName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.seasonYear} Round {m.round} — {m.raceName}
                          </p>
                        )}
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

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Wins</p>
                      <p className="text-3xl font-bold mt-1">{achievements.totalWins}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Favorite Circuit</p>
                      <p className="text-lg font-bold mt-1">{achievements.favoriteCircuit.name}</p>
                      <p className="text-sm text-muted-foreground">{achievements.favoriteCircuit.count} wins</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Best Season</p>
                      <p className="text-lg font-bold mt-1">{achievements.bestSeason[0]}</p>
                      <p className="text-sm text-muted-foreground">{achievements.bestSeason[1]} wins</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Consecutive Winning Seasons</p>
                      <p className="text-3xl font-bold mt-1">{achievements.consecutiveWinningSeasons}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pole-to-Win</p>
                      <p className="text-3xl font-bold mt-1">{achievements.poleWins}</p>
                      <p className="text-sm text-muted-foreground">{achievements.totalWins > 0 ? `${(achievements.poleWins / achievements.totalWins * 100).toFixed(0)}% conversion` : "—"}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Comeback Wins</p>
                      <p className="text-3xl font-bold mt-1">{achievements.comebackWins}</p>
                      <p className="text-sm text-muted-foreground">(started outside top 5)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 sm:col-span-2 lg:col-span-3">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">First Win</p>
                        <p className="text-lg font-bold mt-1">{achievements.firstWin.races.name}</p>
                        <p className="text-sm text-muted-foreground">{achievements.firstWin.races.season_year} Round {achievements.firstWin.races.round} — {new Date(achievements.firstWin.races.date).toLocaleDateString()}</p>
                      </div>
                      <div className="sm:border-l sm:pl-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Latest Win</p>
                        <p className="text-lg font-bold mt-1">{achievements.latestWin.races.name}</p>
                        <p className="text-sm text-muted-foreground">{achievements.latestWin.races.season_year} Round {achievements.latestWin.races.round} — {new Date(achievements.latestWin.races.date).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-muted-foreground">No wins yet — achievements will appear here once the driver has a win.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circuit-performance">
          <Card>
            <CardHeader>
              <CardTitle>Circuit Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <p className="text-sm text-muted-foreground">Sort by:</p>
                <select
                  value={circuitSort}
                  onChange={(event) => setCircuitSort(event.target.value as "wins" | "podiums" | "avgFinish")}
                  className="rounded-md border px-3 py-2"
                >
                  <option value="wins">Most wins</option>
                  <option value="podiums">Most podiums</option>
                  <option value="avgFinish">Best average finish</option>
                </select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><div>Circuit</div></TableHead>
                    <TableHead><div className="text-end">Races</div></TableHead>
                    <TableHead><div className="text-end">Wins</div></TableHead>
                    <TableHead><div className="text-end">Podiums</div></TableHead>
                    <TableHead><div className="text-end">Poles</div></TableHead>
                    <TableHead><div className="text-end">Fastest Laps</div></TableHead>
                    <TableHead><div className="text-end">Average Finish</div></TableHead>
                    <TableHead><div className="text-end">Points</div></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {circuitPerformance.map((row) => (
                    <TableRow key={row.circuitId}>
                      <TableCell>{row.circuitName}</TableCell>
                      <TableCell><div className="text-end">{row.races}</div></TableCell>
                      <TableCell><div className="text-end">{row.wins}</div></TableCell>
                      <TableCell><div className="text-end">{row.podiums}</div></TableCell>
                      <TableCell><div className="text-end">{row.poles}</div></TableCell>
                      <TableCell><div className="text-end">{row.fastestLaps}</div></TableCell>
                      <TableCell><div className="text-end">{row.averageFinish ? row.averageFinish.toFixed(2) : "—"}</div></TableCell>
                      <TableCell><div className="text-end">{row.points}</div></TableCell>
                    </TableRow>
                  ))}
                  {circuitPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No circuit performance data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced-stats">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Front Row Starts</p>
                    <p className="text-3xl font-bold mt-1">{frontRowStarts}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Points Finishes</p>
                    <p className="text-3xl font-bold mt-1">{pointsFinishes}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Top 5 Finishes</p>
                    <p className="text-3xl font-bold mt-1">{top5Finishes}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Top 10 Finishes</p>
                    <p className="text-3xl font-bold mt-1">{top10Finishes}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Laps Led</p>
                    <p className="text-3xl font-bold mt-1">—</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Laps Completed</p>
                    <p className="text-3xl font-bold mt-1">{totalLapsCompleted}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Kilometers Raced</p>
                    <p className="text-3xl font-bold mt-1">{totalKilometersRaced.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Q3 Appearances</p>
                    <p className="text-3xl font-bold mt-1">{q3Appearances}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Grand Slams</p>
                    <p className="text-3xl font-bold mt-1">{grandSlams}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Average Qualifying</p>
                    <p className="text-3xl font-bold mt-1">{averageQualifying ? averageQualifying.toFixed(2) : "—"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Average Grid</p>
                    <p className="text-3xl font-bold mt-1">{averageGrid ? averageGrid.toFixed(2) : "—"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Average Finish</p>
                    <p className="text-3xl font-bold mt-1">{stats?.avgFinishingPosition ? stats.avgFinishingPosition.toFixed(2) : "—"}</p>
                  </CardContent>
                </Card>
              </div>
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
}: {
  driverUuid: string
  season: number
  constructorId: string
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

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{season} Season</p>
          <Badge variant="outline">
            {commonRaceIds.length} races together
          </Badge>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{teamResults.teammateName}</p>
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
  teamRecord,
}: {
  entry: { constructor_id: string; constructor_name: string; season_year: number }
  teamSeasons: { constructor_id: string; constructor_name: string; season_year: number }[]
  results: (RaceResult & { races: { season_year: number; round: number; name: string; date: string } })[]
  driverUuid: string
  teamRecord?: { races: number; wins: number; podiums: number; points: number; poles: number; sprints: number; sprintWins: number; sprintPodiums: number; sprintPoints: number }
}) {
  const seasons = [...new Set(
    teamSeasons
      .filter((ts) => ts.constructor_id === entry.constructor_id)
      .map((ts) => ts.season_year)
  )].sort((a, b) => b - a)

  const t = teamRecord ?? (() => {
    const teamResults = results.filter(
      (r) => r.driver_id === driverUuid && r.constructor_id === entry.constructor_id
    )
    return {
      races: teamResults.length,
      wins: teamResults.filter((r) => r.position === 1).length,
      podiums: teamResults.filter((r) => r.position !== null && r.position <= 3).length,
      points: teamResults.reduce((s, r) => s + r.points, 0),
      poles: 0,
      sprints: 0,
      sprintWins: 0,
      sprintPodiums: 0,
      sprintPoints: 0,
    }
  })()

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
              {t.races + t.sprints} races
            </span>
            {t.wins + t.sprintWins > 0 && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full px-2 py-0.5">
                {t.wins + t.sprintWins} {t.wins + t.sprintWins === 1 ? "win" : "wins"}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Races</span>
            <p className="font-semibold">{t.races + t.sprints}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Wins</span>
            <p className="font-semibold">{t.wins + t.sprintWins}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Podiums</span>
            <p className="font-semibold">{t.podiums + t.sprintPodiums}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Points</span>
            <p className="font-semibold">{t.points + t.sprintPoints}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Poles</span>
            <p className="font-semibold">{t.poles}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Win Rate</span>
            <p className="font-semibold">
              {t.races + t.sprints > 0
                ? `${((t.wins + t.sprintWins) / (t.races + t.sprints) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
