import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import { StatCard } from "@/components/shared/stat-card"
import type { Circuit, Race, CircuitImage } from "@/types/database"

export default function CircuitDetailPage() {
  const { circuitId } = useParams()

  const { data: circuit } = useQuery({
    queryKey: ["circuit", circuitId],
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
    queryKey: ["circuit-record", circuitId],
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
      return (data ?? []) as any[]
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
      return (data ?? []) as any[]
    },
    enabled: raceIds.length > 0,
  })

  const driverWinCounts = winners?.reduce(
    (acc: Record<string, number>, w: any) => {
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

  const circuitLayoutImg = circuitImages?.find((img) => img.type === "layout")
  const circuitHero = circuitImages?.find((img) => img.type === "hero")
  const circuitAerial = circuitImages?.find((img) => img.type === "aerial")

  const { data: raceResults } = useQuery({
    queryKey: ["circuit-race-results", raceIds],
    queryFn: async () => {
      if (raceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, points, grid, status, driver:drivers(given_name, family_name, driver_id), constructor:constructors(name, constructor_id)")
        .in("race_id", raceIds)
        .limit(1000)
      return (data ?? []) as any[]
    },
    enabled: raceIds.length > 0,
  })

  const driverStats = (raceResults ?? []).reduce((acc: Record<string, any>, r: any) => {
    const id = `${r.driver.driver_id}|${r.driver.given_name} ${r.driver.family_name}`
    if (!acc[id]) {
      acc[id] = { driverId: r.driver.driver_id, name: `${r.driver.given_name} ${r.driver.family_name}`, races: 0, points: 0, wins: 0, podiums: 0, p2: 0, p3: 0, poles: 0, dnfs: 0, dns: 0 }
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
  }, {})

  const teamStats = (raceResults ?? []).reduce((acc: Record<string, any>, r: any) => {
    const ctor = r.constructor
    if (!ctor) return acc
    const id = `${ctor.constructor_id}|${ctor.name}`
    if (!acc[id]) {
      acc[id] = { constructorId: ctor.constructor_id, name: ctor.name, races: 0, points: 0, wins: 0, podiums: 0, p2: 0, p3: 0, poles: 0, dnfs: 0, dns: 0 }
    }
    const s = acc[id]
    s.races += 1; s.points += r.points ?? 0
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
  }, {})

  if (!circuit) return <PageSkeleton />

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-f1-red/5 via-background to-background border">
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 sm:p-6">
          {circuit.image_url && (
            <img src={circuit.image_url} alt={circuit.name} className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl uppercase tracking-wide">{circuit.name}</h1>
            <p className="text-sm text-muted-foreground">{circuit.location}, {circuit.country}</p>
            {circuit.direction && (
              <Badge variant="outline" className="mt-2 text-[10px]">{circuit.direction} direction</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Length" value={circuit.length_km ? `${circuit.length_km.toFixed(3)} km` : "—"} size="sm" />
        <StatCard label="Turns" value={circuit.turns} size="sm" />
        <StatCard label="First GP" value={races?.length ? Math.min(...races.map((r) => r.season_year)) : "—"} size="sm" />
        <StatCard label="GPs Held" value={races?.length} size="sm" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="races">
        <TabsList>
          <TabsTrigger value="races">Grands Prix</TabsTrigger>
          <TabsTrigger value="winners">Winners</TabsTrigger>
          <TabsTrigger value="fastest-laps">Fastest Laps</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="team-records">Team Records</TabsTrigger>
          <TabsTrigger value="circuit-info">Circuit Info</TabsTrigger>
        </TabsList>

        <TabsContent value="races">
          <Card>
            <CardHeader><CardTitle>Grands Prix at {circuit.name}</CardTitle></CardHeader>
            <CardContent>
              <Table stacked>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {races?.map((race) => (
                    <TableRow key={race.id}>
                      <TableCell data-label="Season">{race.season_year}</TableCell>
                      <TableCell data-label="Round">{race.round}</TableCell>
                      <TableCell data-label="Race"><Link to={`/races/${race.id}`} className="hover:underline text-f1-red">{race.name}</Link></TableCell>
                      <TableCell data-label="Date">{new Date(race.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!races || races.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No race data available yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winners">
          <Card>
            <CardHeader><CardTitle>Race Winners at {circuit.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {topWinners.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Most Wins</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const winnerInfo = new Map<string, any>()
                      winners?.forEach((w: any) => {
                        const key = `${w.driver.driver_id}|${w.driver.given_name} ${w.driver.family_name}`
                        if (!winnerInfo.has(key)) winnerInfo.set(key, { photo_url: w.driver.photo_url, constructor: w.constructor })
                      })
                      return topWinners.map(([name, count]) => {
                        const [driverId] = name.split("|")
                        const info = winnerInfo.get(name)
                        return (
                          <div key={driverId} className="rounded-lg border bg-card overflow-hidden">
                            <div className="p-3 sm:p-4">
                              <div className="flex items-center gap-3">
                                {info?.photo_url && <img src={info.photo_url} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />}
                                <div className="min-w-0 flex-1">
                                  <Link to={`/drivers/${driverId}`} className="text-sm font-medium hover:underline block truncate">{name.split("|")[1]}</Link>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xl font-bold tabular-nums">{count}</div>
                                  <div className="text-[10px] text-muted-foreground">wins</div>
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
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Winners</h3>
                <Table stacked>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Race</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winners?.map((w: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell data-label="Season">{w.races.season_year}</TableCell>
                        <TableCell data-label="Race">{w.races.name}</TableCell>
                        <TableCell data-label="Driver"><Link to={`/drivers/${w.driver.driver_id}`} className="hover:underline text-f1-red">{w.driver.given_name} {w.driver.family_name}</Link></TableCell>
                        <TableCell data-label="Team"><Link to={`/constructors/${w.constructor.constructor_id}`} className="hover:underline">{w.constructor.name}</Link></TableCell>
                      </TableRow>
                    ))}
                    {(!winners || winners.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No winner data available.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fastest-laps">
          <Card>
            <CardHeader><CardTitle>Fastest Laps at {circuit.name}</CardTitle></CardHeader>
            <CardContent>
              <Table stacked>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fastLaps?.map((fl: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell data-label="Season">{fl.races.season_year}</TableCell>
                      <TableCell data-label="Race">{fl.races.name}</TableCell>
                      <TableCell data-label="Driver"><Link to={`/drivers/${fl.driver.driver_id}`} className="hover:underline text-f1-red">{fl.driver.given_name} {fl.driver.family_name}</Link></TableCell>
                      <TableCell data-label="Time" className="font-mono">{fl.fastest_lap_time}</TableCell>
                    </TableRow>
                  ))}
                  {(!fastLaps || fastLaps.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No fastest lap data available.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader><CardTitle>Records at {circuit.name}</CardTitle></CardHeader>
            <CardContent>
              <Table stacked>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Races</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Podiums</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(driverStats).sort((a: any, b: any) => b.points - a.points).slice(0, 50).map((s: any) => (
                    <TableRow key={s.driverId}>
                      <TableCell data-label="Driver"><Link to={`/drivers/${s.driverId}`} className="hover:underline text-f1-red">{s.name}</Link></TableCell>
                      <TableCell data-label="Races" className="text-right font-mono">{s.races}</TableCell>
                      <TableCell data-label="Points" className="text-right font-mono">{s.points}</TableCell>
                      <TableCell data-label="Wins" className="text-right font-mono">{s.wins}</TableCell>
                      <TableCell data-label="Podiums" className="text-right font-mono">{s.podiums}</TableCell>
                    </TableRow>
                  ))}
                  {Object.values(driverStats).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records available yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-records">
          <Card>
            <CardHeader><CardTitle>Team Records at {circuit.name}</CardTitle></CardHeader>
            <CardContent>
              <Table stacked>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Races</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Podiums</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(teamStats).sort((a: any, b: any) => b.points - a.points).slice(0, 50).map((s: any) => (
                    <TableRow key={s.constructorId}>
                      <TableCell data-label="Team"><Link to={`/constructors/${s.constructorId}`} className="hover:underline text-f1-red">{s.name}</Link></TableCell>
                      <TableCell data-label="Races" className="text-right font-mono">{s.races}</TableCell>
                      <TableCell data-label="Points" className="text-right font-mono">{s.points}</TableCell>
                      <TableCell data-label="Wins" className="text-right font-mono">{s.wins}</TableCell>
                      <TableCell data-label="Podiums" className="text-right font-mono">{s.podiums}</TableCell>
                    </TableRow>
                  ))}
                  {Object.values(teamStats).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No team records available yet.</TableCell></TableRow>
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
                <CardHeader><CardTitle>Circuit Hero</CardTitle></CardHeader>
                <CardContent>
                  <img src={circuitHero.image_url} alt="Circuit hero" className="w-full h-48 sm:h-64 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Coordinates</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latitude</span>
                    <span className="font-medium font-mono">{circuit.lat ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude</span>
                    <span className="font-medium font-mono">{circuit.lng ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {circuitLayoutImg && (
              <Card>
                <CardHeader><CardTitle>Circuit Layout</CardTitle></CardHeader>
                <CardContent>
                  <img src={circuitLayoutImg.image_url} alt="Circuit layout" className="w-full h-40 sm:h-48 object-contain rounded-lg" />
                </CardContent>
              </Card>
            )}
            {circuit.lat && circuit.lng && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Map</CardTitle></CardHeader>
                <CardContent>
                  <iframe title="Circuit Map" width="100%" height="300" className="rounded-lg border"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${circuit.lng - 0.02},${circuit.lat - 0.02},${circuit.lng + 0.02},${circuit.lat + 0.02}&layer=mapnik&marker=${circuit.lat},${circuit.lng}`} />
                </CardContent>
              </Card>
            )}
            {circuitAerial && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Aerial View</CardTitle></CardHeader>
                <CardContent>
                  <img src={circuitAerial.image_url} alt="Aerial view" className="w-full h-48 sm:h-80 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}
            {circuit.image_url && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Circuit Image</CardTitle></CardHeader>
                <CardContent>
                  <img src={circuit.image_url} alt={circuit.name} className="w-full h-48 sm:h-64 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
