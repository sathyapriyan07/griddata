import { useMemo } from "react"
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
import { motion } from "framer-motion"
import type { Constructor, ConstructorWikipedia, RaceResult, ConstructorStanding, DriverImage } from "@/types/database"
import { Trophy, Medal, Flag, MapPin, Users, Wrench, BarChart3, Target, Crown, Book, ExternalLink } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

function formatSeasonRange(seasons: number[]): string {
  if (seasons.length === 0) return ""
  if (seasons.length === 1) return String(seasons[0])
  const sorted = [...seasons].sort((a, b) => a - b)
  const consecutive = sorted.every((s, i) => i === 0 || s === sorted[i - 1] + 1)
  if (consecutive) return `${sorted[0]}-${String(sorted[sorted.length - 1]).slice(2)}`
  return sorted.join(", ")
}

export default function ConstructorDetailPage() {
  const { constructorId } = useParams()

  const { data: team } = useQuery({
    queryKey: ["constructor", constructorId ?? ""],
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
    queryKey: ["constructor-record", constructorId ?? ""],
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
        .select("drivers!inner(id, driver_id, given_name, family_name, nationality), races!inner(season_year)")
        .eq("constructor_id", teamUuid)
      if (!data) return []
      const driverMap = new Map<string, { id: string; driver_id: string; given_name: string; family_name: string; nationality: string | null; seasons: number[] }>()
      for (const r of data as unknown as { drivers: { id: string; driver_id: string; given_name: string; family_name: string; nationality: string | null }; races: { season_year: number } }[]) {
        const did = r.drivers.driver_id
        if (!driverMap.has(did)) {
          driverMap.set(did, { id: r.drivers.id, driver_id: did, given_name: r.drivers.given_name, family_name: r.drivers.family_name, nationality: r.drivers.nationality, seasons: [] })
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

  const driverUuids = drivers?.map((d) => d.id) ?? []

  const { data: driverHeroImages } = useQuery({
    queryKey: ["constructor-driver-hero-images", driverUuids.join(",")],
    queryFn: async () => {
      if (driverUuids.length === 0) return []
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .in("driver_id", driverUuids)
        .eq("type", "hero")
      return (data ?? []) as DriverImage[]
    },
    enabled: driverUuids.length > 0,
  })

  const driverHeroMap = useMemo(() => {
    const map = new Map<string, string>()
    driverHeroImages?.forEach((img) => {
      if (!map.has(img.driver_id)) map.set(img.driver_id, img.image_url)
    })
    return map
  }, [driverHeroImages])

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

  const { data: constructorWikipedia } = useQuery({
    queryKey: ["constructor-wikipedia", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return null
      const { data } = await supabase
        .from("constructor_wikipedia")
        .select("*")
        .eq("entity_id", teamUuid)
        .maybeSingle()
      return data as ConstructorWikipedia | null
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
      driver_id: string; given_name: string; family_name: string; circuit_id: string; circuit_name: string;
      races: number; longestWins: number; longestPodiums: number; longestPoles: number; longestPoints: number;
      currentWinStreak: number; currentPodiumStreak: number; currentPoleStreak: number; currentPointsStreak: number
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
          driver_id: driverId, given_name: r.driver.given_name, family_name: r.driver.family_name,
          circuit_id: circuitId, circuit_name: circuitName, races: 0,
          longestWins: 0, longestPodiums: 0, longestPoles: 0, longestPoints: 0,
          currentWinStreak: 0, currentPodiumStreak: 0, currentPoleStreak: 0, currentPointsStreak: 0,
        })
      }
      const entry = map.get(key)!
      entry.races += 1
      if (r.position === 1) entry.currentWinStreak += 1; else entry.currentWinStreak = 0
      entry.longestWins = Math.max(entry.longestWins, entry.currentWinStreak)
      if (r.position !== null && r.position <= 3) entry.currentPodiumStreak += 1; else entry.currentPodiumStreak = 0
      entry.longestPodiums = Math.max(entry.longestPodiums, entry.currentPodiumStreak)
      if (r.grid === 1) entry.currentPoleStreak += 1; else entry.currentPoleStreak = 0
      entry.longestPoles = Math.max(entry.longestPoles, entry.currentPoleStreak)
      if (r.points > 0) entry.currentPointsStreak += 1; else entry.currentPointsStreak = 0
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[240px] lg:min-h-[280px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          {colors && (
            <div className="w-full h-full rounded-full blur-3xl" style={{ background: colors.primary }} />
                )}
              </div>
              {constructorWikipedia?.short_description && (
                <div className="col-span-full">
                  <p className="text-sm text-text-secondary italic mt-1">
                    {constructorWikipedia.short_description}
                  </p>
                </div>
              )}
              {constructorWikipedia?.page_url && (
                <div className="col-span-full">
                  <a
                    href={constructorWikipedia.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                  >
                    <Book className="w-3 h-3" />
                    <span>View on Wikipedia</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%)`
        }} />
        <div className="relative z-10 w-full p-8 lg:p-12">
          <div className="flex items-start gap-4">
            {team.logo_url && (
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-secondary/80 backdrop-blur-xl p-2 border border-default flex items-center justify-center">
                <img src={team.logo_url} alt={`${team.name} logo`} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                {colors && (
                  <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }} />
                )}
                <h1 className="text-3xl lg:text-5xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary">
                  {team.name}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {team.nationality && (
                  <Badge variant="brand" className="gap-1">
                    <Flag className="w-3 h-3" />
                    {team.nationality}
                  </Badge>
                )}
                {team.founded_year && (
                  <Badge variant="outline">{team.founded_year}</Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl text-sm">
                {team.base && (
                  <div>
                    <span className="text-text-tertiary text-[0.6rem] uppercase tracking-wide font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Base
                    </span>
                    <p className="font-medium mt-0.5 text-text-primary">{team.base}</p>
                  </div>
                )}
                {team.principal && (
                  <div>
                    <span className="text-text-tertiary text-[0.6rem] uppercase tracking-wide font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" /> Principal
                    </span>
                    <p className="font-medium mt-0.5 text-text-primary">{team.principal}</p>
                  </div>
                )}
                {team.engine_supplier && (
                  <div>
                    <span className="text-text-tertiary text-[0.6rem] uppercase tracking-wide font-medium flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Engine
                    </span>
                    <p className="font-medium mt-0.5 text-text-primary">{team.engine_supplier}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
              <CardContent className="p-5 flex items-center gap-3">
                <Flag className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Races</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalRaces}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Wins</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.wins}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Medal className="w-8 h-8 text-amber-500/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Podiums</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.podiums}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-500/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Titles</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.championships}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Target className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Win Rate</p>
                  <p className="text-2xl font-bold text-text-primary">{(stats.winRate * 100).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Points</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalPoints}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
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
                  <img src={img.image_url} alt={`${team.name} ${img.year} car`} className="w-full h-32 object-contain rounded-xl border border-default bg-tertiary/30" />
                  <p className="text-sm text-center font-medium text-text-primary">{img.year}</p>
                  {img.caption && <p className="text-xs text-center text-text-secondary">{img.caption}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="standings">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList>
            <TabsTrigger value="standings">Season Standings</TabsTrigger>
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="drivers">Driver Roster</TabsTrigger>
            <TabsTrigger value="records">Driver Records</TabsTrigger>
            <TabsTrigger value="milestones">Driver Milestones</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
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
                      <TableCell className="text-text-primary">{s.season_year}</TableCell>
                      <TableCell className="text-center text-text-primary">{s.position ? `P${s.position}` : "—"}</TableCell>
                      <TableCell className="text-right text-text-primary">{s.points}</TableCell>
                      <TableCell className="text-right text-text-primary">{s.wins}</TableCell>
                    </TableRow>
                  ))}
                  {(!standings || standings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-text-secondary">
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
                      <TableCell className="text-text-primary">{r.races.season_year}</TableCell>
                      <TableCell className="text-text-primary">{r.races.round}</TableCell>
                      <TableCell>
                        <Link to={`/races/${r.race_id}`} className="hover:underline text-text-primary">{r.races.name}</Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/drivers/${r.driver.driver_id}`} className="hover:underline text-text-primary">
                          {r.driver.given_name} {r.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-primary">{r.position ?? r.position_text ?? "DNF"}</TableCell>
                      <TableCell className="text-text-primary">{r.grid ?? "—"}</TableCell>
                      <TableCell className="text-text-primary">{r.points}</TableCell>
                      <TableCell className="text-text-secondary">{r.status ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!constructorResults || constructorResults.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-text-secondary">
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
              <motion.div
                variants={containerVariants}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {drivers?.map((d) => (
                  <motion.div key={d.driver_id} variants={itemVariants}>
                    <Link to={`/drivers/${d.driver_id}`}>
                      <Card className="relative overflow-hidden transition-all duration-300 border-default hover:border-strong">
                        {driverHeroMap.get(d.id) && (
                          <>
                            <div className="absolute inset-0">
                              <img src={driverHeroMap.get(d.id)!} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                          </>
                        )}
                        <CardContent className="relative p-4">
                          <div className="font-heading font-bold truncate text-white drop-shadow-sm">{d.given_name} {d.family_name}</div>
                          <div className="text-xs text-white/70 drop-shadow-sm mt-1">{d.nationality ?? "—"}</div>
                          <div className="text-xs text-white/50 drop-shadow-sm mt-0.5">{formatSeasonRange(d.seasons)}</div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
                {(!drivers || drivers.length === 0) && (
                  <div className="col-span-full text-center text-text-secondary py-8">
                    No driver data available.
                  </div>
                )}
              </motion.div>
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
                        <Link to={`/drivers/${d.driver_id}`} className="font-medium hover:underline text-text-primary">
                          {d.given_name} {d.family_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-primary">{d.races + d.sprints}</TableCell>
                      <TableCell className="font-semibold text-text-primary">{d.wins + d.sprintWins}</TableCell>
                      <TableCell className="text-text-primary">{d.races + d.sprints > 0 ? `${((d.wins + d.sprintWins) / (d.races + d.sprints) * 100).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell className="text-text-primary">{d.podiums + d.sprintPodiums}</TableCell>
                      <TableCell className="font-bold text-text-primary">{d.points + d.sprintPoints}</TableCell>
                      <TableCell className="text-text-primary">{d.poles}</TableCell>
                    </TableRow>
                  ))}
                  {sortedDriverRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-text-secondary">
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
                        <Link to={`/drivers/${item.driver_id}`} className="font-medium hover:underline text-text-primary">
                          {item.given_name} {item.family_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-primary">{item.circuit_name}</TableCell>
                      <TableCell className="text-text-primary">{item.races}</TableCell>
                      <TableCell className="text-text-primary">{item.longestWins}</TableCell>
                      <TableCell className="text-text-primary">{item.longestPodiums}</TableCell>
                      <TableCell className="text-text-primary">{item.longestPoles}</TableCell>
                      <TableCell className="text-text-primary">{item.longestPoints}</TableCell>
                    </TableRow>
                  ))}
                  {driverMilestones.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-text-secondary">
                        No driver milestones available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-4 h-4 text-amber-400" />
                About {team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {constructorWikipedia?.summary ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
                    {constructorWikipedia.summary}
                  </div>
                  {constructorWikipedia.images && (constructorWikipedia.images as { url: string; description: string | null }[]).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(constructorWikipedia.images as { url: string; description: string | null }[]).slice(0, 6).map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                          <div className="relative overflow-hidden rounded-xl bg-tertiary aspect-video">
                            <img src={img.url} alt={img.description ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                          </div>
                          {img.description && (
                            <p className="text-[10px] text-text-tertiary mt-1 line-clamp-2">{img.description}</p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {constructorWikipedia.sections && (constructorWikipedia.sections as { line: string; index: string }[]).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-2">Sections</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(constructorWikipedia.sections as { line: string; index: string }[]).filter((s) => s.index.split(".").length <= 2).slice(0, 20).map((s, i) => (
                          <span key={i} className="text-xs bg-tertiary text-text-secondary rounded-full px-2.5 py-1">
                            {s.line}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {constructorWikipedia.page_url && (
                    <a
                      href={constructorWikipedia.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read full history on Wikipedia
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-text-secondary">No Wikipedia information available for this team.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
