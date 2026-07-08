import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Circuit, Race, RaceResult, CircuitImage } from "@/types/database"

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
        races: 0,
        points: 0,
        wins: 0,
        podiums: 0,
        p2: 0,
        p3: 0,
        poles: 0,
        dnfs: 0,
        dns: 0,
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
  }, {} as Record<string, { driverId: string; name: string; races: number; points: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }>)

  type DriverStat = { driverId: string; name: string; races: number; points: number; wins: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }

  const statsToTop = (key: keyof DriverStat) =>
    Object.values(driverStats as Record<string, DriverStat>)
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .slice(0, 5)

  const teamStats = (raceResults ?? []).reduce((acc, r) => {
    const ctor = r.constructor
    if (!ctor) return acc
    const id = `${ctor.constructor_id}|${ctor.name}`
    if (!acc[id]) {
      acc[id] = {
        constructorId: ctor.constructor_id,
        name: ctor.name,
        races: 0,
        points: 0,
        wins: 0,
        podiums: 0,
        p2: 0,
        p3: 0,
        poles: 0,
        dnfs: 0,
        dns: 0,
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
  }, {} as Record<string, { constructorId: string; name: string; races: number; points: number; podiums: number; p2: number; p3: number; poles: number; dnfs: number; dns: number }>)

  if (!circuit) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {circuit.image_url && (
          <img
            src={circuit.image_url}
            alt={`${circuit.name} image`}
            className="w-48 h-48 object-contain rounded-md"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{circuit.name}</h1>
          <p className="text-lg text-muted-foreground">
            {circuit.location}, {circuit.country}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {circuit.direction && (
              <Badge variant="secondary">Direction: {circuit.direction}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Length</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {circuit.length_km ? `${circuit.length_km.toFixed(3)} km` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{circuit.turns ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">First GP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{races?.length ? Math.min(...races.map((r) => r.season_year)) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPs Held</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{races?.length ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="races">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="races">Grands Prix</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="fastest-laps">Fastest Laps</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="team-records">Team Records</TabsTrigger>
            <TabsTrigger value="circuit-info">Circuit Info</TabsTrigger>
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
                      <TableCell>{race.season_year}</TableCell>
                      <TableCell>{race.round}</TableCell>
                      <TableCell>
                        <Link to={`/races/${race.id}`} className="hover:underline">
                          {race.name}
                        </Link>
                      </TableCell>
                      <TableCell>{new Date(race.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!races || races.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                          <Link to={`/constructors/${s.constructorId}`} className="hover:underline">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{s.races}</TableCell>
                        <TableCell className="text-right">{s.points}</TableCell>
                        <TableCell className="text-right">{s.wins}</TableCell>
                        <TableCell className="text-right">{s.podiums}</TableCell>
                        <TableCell className="text-right">{s.p2}</TableCell>
                        <TableCell className="text-right">{s.p3}</TableCell>
                        <TableCell className="text-right">{s.poles}</TableCell>
                        <TableCell className="text-right">{s.dnfs}</TableCell>
                        <TableCell className="text-right">{s.dns}</TableCell>
                      </TableRow>
                    ))}
                  {Object.values(teamStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Most Wins</h3>
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
                          <div key={driverId} className="rounded-lg border bg-card overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                {info?.photo_url && (
                                  <img src={info.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <Link to={`/drivers/${driverId}`} className="font-medium hover:underline block truncate">
                                    {displayName}
                                  </Link>

                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xl font-bold">{count}</div>
                                  <div className="text-xs text-muted-foreground">wins</div>
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
                <h3 className="text-sm font-medium text-muted-foreground mb-2">All Winners</h3>
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
                        <TableCell>{w.races.season_year}</TableCell>
                        <TableCell>{w.races.name}</TableCell>
                        <TableCell>
                          <Link to={`/drivers/${w.driver.driver_id}`} className="hover:underline">
                            {w.driver.given_name} {w.driver.family_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/constructors/${w.constructor.constructor_id}`} className="hover:underline">
                            {w.constructor.name}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!winners || winners.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                      <TableCell>{fl.races.season_year}</TableCell>
                      <TableCell>{fl.races.name}</TableCell>
                      <TableCell>
                        <Link to={`/drivers/${fl.driver.driver_id}`} className="hover:underline">
                          {fl.driver.given_name} {fl.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono">{fl.fastest_lap_time}</TableCell>
                    </TableRow>
                  ))}
                  {(!fastLaps || fastLaps.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                          <Link to={`/drivers/${s.driverId}`} className="hover:underline">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{s.races}</TableCell>
                        <TableCell className="text-right">{s.points}</TableCell>
                        <TableCell className="text-right">{s.wins}</TableCell>
                        <TableCell className="text-right">{s.podiums}</TableCell>
                        <TableCell className="text-right">{s.p2}</TableCell>
                        <TableCell className="text-right">{s.p3}</TableCell>
                        <TableCell className="text-right">{s.poles}</TableCell>
                        <TableCell className="text-right">{s.dnfs}</TableCell>
                        <TableCell className="text-right">{s.dns}</TableCell>
                      </TableRow>
                    ))}
                  {Object.values(driverStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                  <img src={circuitHero.image_url} alt="Circuit hero" className="w-full h-64 object-cover rounded-lg" />
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
                    <span className="text-muted-foreground">Latitude</span>
                    <span className="font-medium">{circuit.lat ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude</span>
                    <span className="font-medium">{circuit.lng ?? "—"}</span>
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
                  <img src={circuitLayout.image_url} alt="Circuit layout" className="w-full h-48 object-contain rounded-lg" />
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
                    className="rounded-lg border"
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
                  <img src={circuitAerial.image_url} alt="Aerial view" className="w-full h-80 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}

            {circuit.image_url && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Circuit Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={circuit.image_url} alt={circuit.name} className="w-full h-64 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
