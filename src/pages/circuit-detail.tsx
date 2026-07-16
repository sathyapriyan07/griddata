import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import { motion } from "framer-motion"
import type { Circuit, CircuitWikipedia, Race, CircuitImage } from "@/types/database"
import { MapPin, Gauge, Route, Flag, Trophy, Book, ExternalLink } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

export default function CircuitDetailPage() {
  const { circuitId } = useParams()

  const { data: circuit } = useQuery({
    queryKey: ["circuit", circuitId ?? ""],
    queryFn: async () => {
      const { data } = await supabase
        .from("circuits")
        .select("*")
        .eq("circuit_id", circuitId)
        .single()
      return data as Circuit | null
    },
  })

  const { data: circuitRecord } = useQuery({
    queryKey: ["circuit-record", circuitId ?? ""],
    queryFn: async () => {
      if (!circuitId) return null
      const { data } = await supabase
        .from("circuits")
        .select("id")
        .eq("circuit_id", circuitId)
        .single()
      return data as { id: string } | null
    },
    enabled: !!circuitId,
  })

  const circuitUuid = circuitRecord?.id

  const { data: races } = useQuery({
    queryKey: ["circuit-races", circuitUuid],
    queryFn: async () => {
      if (!circuitUuid) return []
      const { data } = await supabase
        .from("races")
        .select("*")
        .eq("circuit_id", circuitUuid)
        .order("date", { ascending: false })
        .limit(50)
      return (data ?? []) as Race[]
    },
    enabled: !!circuitUuid,
  })

  const raceIds = races?.map((r) => r.id) ?? []

  const { data: fastLaps } = useQuery({
    queryKey: ["circuit-fastlaps", raceIds],
    queryFn: async () => {
      if (raceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("fastest_lap_time, driver:drivers(given_name, family_name, driver_id), races!inner(name, season_year)")
        .in("race_id", raceIds)
        .not("fastest_lap_time", "is", null)
        .eq("fastest_lap_rank", 1)
        .order("race_id", { ascending: false })
        .limit(20)
      return (data ?? []) as { fastest_lap_time: string | null; driver: { given_name: string; family_name: string; driver_id: string }; races: { name: string; season_year: number } }[]
    },
    enabled: raceIds.length > 0,
  })

  const { data: winners } = useQuery({
    queryKey: ["circuit-winners", raceIds],
    queryFn: async () => {
      if (raceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("driver:drivers(given_name, family_name, driver_id, photo_url), constructor:constructors(name, constructor_id, logo_url), races!inner(season_year, name)")
        .in("race_id", raceIds)
        .eq("position", 1)
        .order("race_id", { ascending: false })
        .limit(50)
      return (data ?? []) as { driver: { given_name: string; family_name: string; driver_id: string; photo_url: string | null }; constructor: { name: string; constructor_id: string; logo_url: string | null }; races: { season_year: number; name: string } }[]
    },
    enabled: raceIds.length > 0,
  })

  const driverWinCounts = winners?.reduce(
    (acc, w) => {
      const key = `${w.driver.driver_id}|${w.driver.given_name} ${w.driver.family_name}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  ) ?? {}

  const topWinners = Object.entries(driverWinCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const { data: circuitImages } = useQuery({
    queryKey: ["circuit-images", circuitUuid],
    queryFn: async () => {
      if (!circuitUuid) return []
      const { data } = await supabase
        .from("circuit_images")
        .select("*")
        .eq("circuit_id", circuitUuid)
      return (data ?? []) as CircuitImage[]
    },
    enabled: !!circuitUuid,
  })

  const circuitLayout = circuitImages?.find((img) => img.type === "layout")
  const circuitHero = circuitImages?.find((img) => img.type === "hero")
  const circuitAerial = circuitImages?.find((img) => img.type === "aerial")

  const { data: circuitWikipedia } = useQuery({
    queryKey: ["circuit-wikipedia", circuitUuid],
    queryFn: async () => {
      if (!circuitUuid) return null
      const { data } = await supabase
        .from("circuit_wikipedia")
        .select("*")
        .eq("entity_id", circuitUuid)
        .maybeSingle()
      return data as CircuitWikipedia | null
    },
    enabled: !!circuitUuid,
  })

  const { data: raceResults } = useQuery({
    queryKey: ["circuit-race-results", raceIds],
    queryFn: async () => {
      if (raceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, points, grid, status, driver:drivers(given_name, family_name, driver_id), constructor:constructors(name, constructor_id)")
        .in("race_id", raceIds)
        .limit(1000)
      return (data ?? []) as ({ position: number | null; points: number; grid: number | null; status: string | null; driver: { given_name: string; family_name: string; driver_id: string }; constructor: { name: string; constructor_id: string } | null })[]
    },
    enabled: raceIds.length > 0,
  })

  const driverStats = (raceResults ?? []).reduce((acc, r) => {
    const id = `${r.driver.driver_id}|${r.driver.given_name} ${r.driver.family_name}`
    if (!acc[id]) {
      acc[id] = {
        driverId: r.driver.driver_id,
        name: `${r.driver.given_name} ${r.driver.family_name}`,
        races: 0, points: 0, wins: 0, podiums: 0, p2: 0, p3: 0,
        poles: 0, dnfs: 0, dns: 0,
      }
    }
    const s = acc[id]
    s.races += 1
    s.points += r.points ?? 0
    if (r.position !== null) {
      if (r.position === 1) s.wins += 1
      if (r.position <= 3) s.podiums += 1
      if (r.position === 2) s.p2 += 1
      if (r.position === 3) s.p3 += 1
    }
    if (r.grid === 1) s.poles += 1
    const status = (r.status || "").toLowerCase()
    if (status.includes("dnf")) s.dnfs += 1
    if (status.includes("dns")) s.dns += 1
    return acc
  }, {} as Record<string, { driverId: string; name: string; races: number; points: number; wins: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }>)

  type DriverStat = { driverId: string; name: string; races: number; points: number; wins: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }

  const teamStats = (raceResults ?? []).reduce((acc, r) => {
    const ctor = r.constructor
    if (!ctor) return acc
    const id = `${ctor.constructor_id}|${ctor.name}`
    if (!acc[id]) {
      acc[id] = {
        constructorId: ctor.constructor_id,
        name: ctor.name,
        races: 0, points: 0, wins: 0, podiums: 0, p2: 0, p3: 0,
        poles: 0, dnfs: 0, dns: 0,
      }
    }
    const s = acc[id]
    s.races += 1
    s.points += r.points ?? 0
    if (r.position !== null) {
      if (r.position === 1) s.wins += 1
      if (r.position <= 3) s.podiums += 1
      if (r.position === 2) s.p2 += 1
      if (r.position === 3) s.p3 += 1
    }
    if (r.grid === 1) s.poles += 1
    const status = (r.status || "").toLowerCase()
    if (status.includes("dnf")) s.dnfs += 1
    if (status.includes("dns")) s.dns += 1
    return acc
  }, {} as Record<string, { constructorId: string; name: string; races: number; points: number; wins: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }>)

  if (!circuit) {
    return <PageSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[240px] lg:min-h-[280px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default">
        {circuit.image_url && (
          <div className="absolute inset-0">
            <img src={circuit.image_url} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />
          </div>
        )}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%)`
        }} />
        <div className="relative z-10 w-full p-8 lg:p-12">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl lg:text-5xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary">
                {circuit.name}
              </h1>
              <p className="text-base text-text-secondary flex items-center gap-1 mt-2">
                <MapPin className="w-4 h-4" />
                {circuit.location}, {circuit.country}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {circuit.direction && (
                  <Badge variant="brand" className="gap-1">
                    <Route className="w-3 h-3" />
                    {circuit.direction}
                  </Badge>
                )}
              {circuitWikipedia?.short_description && (
                <p className="mt-2 text-sm text-text-secondary italic">{circuitWikipedia.short_description}</p>
              )}
              {circuitWikipedia?.page_url && (
                <a
                  href={circuitWikipedia.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  <Book className="w-3 h-3" />
                  <span>View on Wikipedia</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
            <CardContent className="p-5 flex items-center gap-3">
              <Gauge className="w-8 h-8 text-text-tertiary" />
              <div>
                <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Length</p>
                <p className="text-2xl font-bold text-text-primary">{circuit.length_km ? `${circuit.length_km.toFixed(3)} km` : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
            <CardContent className="p-5 flex items-center gap-3">
              <Route className="w-8 h-8 text-text-tertiary" />
              <div>
                <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Turns</p>
                <p className="text-2xl font-bold text-text-primary">{circuit.turns ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
            <CardContent className="p-5 flex items-center gap-3">
              <Flag className="w-8 h-8 text-text-tertiary" />
              <div>
                <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">First GP</p>
                <p className="text-2xl font-bold text-text-primary">{races?.length ? Math.min(...races.map((r) => r.season_year)) : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
            <CardContent className="p-5 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500/60" />
              <div>
                <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">GPs Held</p>
                <p className="text-2xl font-bold text-text-primary">{races?.length ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="races">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList>
            <TabsTrigger value="races">Grands Prix</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="fastest-laps">Fastest Laps</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="team-records">Team Records</TabsTrigger>
            <TabsTrigger value="circuit-info">Circuit Info</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="races">
          <Card>
            <CardHeader>
              <CardTitle>Grands Prix at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Race Name</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {races?.map((race) => (
                    <TableRow key={race.id}>
                      <TableCell className="text-text-primary">{race.season_year}</TableCell>
                      <TableCell className="text-text-primary">{race.round}</TableCell>
                      <TableCell>
                        <Link to={`/races/${race.id}`} className="hover:underline text-text-primary">
                          {race.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-secondary">{new Date(race.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!races || races.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-text-secondary">
                        No race data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-records">
          <Card>
            <CardHeader>
              <CardTitle>Team Records at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Races</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Podiums</TableHead>
                    <TableHead className="text-right">P2</TableHead>
                    <TableHead className="text-right">P3</TableHead>
                    <TableHead className="text-right">Poles</TableHead>
                    <TableHead className="text-right">DNFs</TableHead>
                    <TableHead className="text-right">DNS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(teamStats)
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 50)
                    .map((s) => (
                      <TableRow key={s.constructorId}>
                        <TableCell>
                          <Link to={`/constructors/${s.constructorId}`} className="hover:underline text-text-primary">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-text-primary">{s.races}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.points}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.wins}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.podiums}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.p2}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.p3}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.poles}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.dnfs}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.dns}</TableCell>
                      </TableRow>
                    ))}
                  {Object.values(teamStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-text-secondary">
                        No team records available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winners">
          <Card>
            <CardHeader>
              <CardTitle>Race Winners at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topWinners.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Most Wins</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const winnerInfo = new Map<string, { photo_url: string | null; constructor: { name: string; constructor_id: string; logo_url: string | null } }>()
                      winners?.forEach((w) => {
                        const key = `${w.driver.driver_id}|${w.driver.given_name} ${w.driver.family_name}`
                        if (!winnerInfo.has(key)) winnerInfo.set(key, { photo_url: w.driver.photo_url, constructor: w.constructor })
                      })
                      return topWinners.map(([name, count]) => {
                        const [driverId, displayName] = name.split("|")
                        const info = winnerInfo.get(name)
                        return (
                          <div key={driverId} className="rounded-xl border border-default bg-secondary overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                {info?.photo_url && (
                                  <img src={info.photo_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-border-strong" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <Link to={`/drivers/${driverId}`} className="font-medium hover:underline block truncate text-text-primary">
                                    {displayName}
                                  </Link>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xl font-bold text-text-primary">{count}</div>
                                  <div className="text-[0.6rem] text-text-tertiary uppercase tracking-wide">wins</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">All Winners</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Race</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winners?.map((w, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-text-primary">{w.races.season_year}</TableCell>
                        <TableCell className="text-text-primary">{w.races.name}</TableCell>
                        <TableCell>
                          <Link to={`/drivers/${w.driver.driver_id}`} className="hover:underline text-text-primary">
                            {w.driver.given_name} {w.driver.family_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/constructors/${w.constructor.constructor_id}`} className="hover:underline text-text-primary">
                            {w.constructor.name}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!winners || winners.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-text-secondary">
                          No winner data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fastest-laps">
          <Card>
            <CardHeader>
              <CardTitle>Fastest Laps at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fastLaps?.map((fl, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-text-primary">{fl.races.season_year}</TableCell>
                      <TableCell className="text-text-primary">{fl.races.name}</TableCell>
                      <TableCell>
                        <Link to={`/drivers/${fl.driver.driver_id}`} className="hover:underline text-text-primary">
                          {fl.driver.given_name} {fl.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-text-primary">{fl.fastest_lap_time}</TableCell>
                    </TableRow>
                  ))}
                  {(!fastLaps || fastLaps.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-text-secondary">
                        No fastest lap data available.
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
              <CardTitle>Records at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Races</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Podiums</TableHead>
                    <TableHead className="text-right">P2</TableHead>
                    <TableHead className="text-right">P3</TableHead>
                    <TableHead className="text-right">Poles</TableHead>
                    <TableHead className="text-right">DNFs</TableHead>
                    <TableHead className="text-right">DNS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(driverStats as Record<string, DriverStat>)
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 50)
                    .map((s) => (
                      <TableRow key={s.driverId}>
                        <TableCell>
                          <Link to={`/drivers/${s.driverId}`} className="hover:underline text-text-primary">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-text-primary">{s.races}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.points}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.wins}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.podiums}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.p2}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.p3}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.poles}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.dnfs}</TableCell>
                        <TableCell className="text-right text-text-primary">{s.dns}</TableCell>
                      </TableRow>
                    ))}
                  {Object.values(driverStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-text-secondary">
                        No records available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circuit-info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {circuitHero && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Circuit Hero</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={circuitHero.image_url} alt="Circuit hero" className="w-full h-64 object-cover rounded-xl" />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Coordinates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Latitude</span>
                    <span className="font-medium text-text-primary">{circuit.lat ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Longitude</span>
                    <span className="font-medium text-text-primary">{circuit.lng ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {circuitLayout && (
              <Card>
                <CardHeader>
                  <CardTitle>Circuit Layout</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={circuitLayout.image_url} alt="Circuit layout" className="w-full h-48 object-contain rounded-xl" />
                </CardContent>
              </Card>
            )}
            {circuit.lat && circuit.lng && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <iframe
                    title="Circuit Map"
                    width="100%"
                    height="350"
                    className="rounded-xl border border-default"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${circuit.lng - 0.02},${circuit.lat - 0.02},${circuit.lng + 0.02},${circuit.lat + 0.02}&layer=mapnik&marker=${circuit.lat},${circuit.lng}`}
                  />
                </CardContent>
              </Card>
            )}
            {circuitAerial && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Aerial View</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={circuitAerial.image_url} alt="Aerial view" className="w-full h-80 object-cover rounded-xl" />
                </CardContent>
              </Card>
            )}
            {circuit.image_url && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Circuit Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={circuit.image_url} alt={circuit.name} className="w-full h-64 object-cover rounded-xl" />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-4 h-4 text-amber-400" />
                About {circuit.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {circuitWikipedia?.summary ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
                    {circuitWikipedia.summary}
                  </div>
                  {circuitWikipedia.images && (circuitWikipedia.images as { url: string; description: string | null }[]).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(circuitWikipedia.images as { url: string; description: string | null }[]).slice(0, 6).map((img, i) => (
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
                  {circuitWikipedia.sections && (circuitWikipedia.sections as { line: string; index: string }[]).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-2">Sections</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(circuitWikipedia.sections as { line: string; index: string }[]).filter((s) => s.index.split(".").length <= 2).slice(0, 20).map((s, i) => (
                          <span key={i} className="text-xs bg-tertiary text-text-secondary rounded-full px-2.5 py-1">
                            {s.line}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {circuitWikipedia.page_url && (
                    <a
                      href={circuitWikipedia.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read full article on Wikipedia
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-text-secondary">No Wikipedia information available for this circuit.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
