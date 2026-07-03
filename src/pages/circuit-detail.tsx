import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Circuit, Race } from "@/types/database"

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
        .select("driver:drivers(given_name, family_name, driver_id), constructor:constructors(name, constructor_id), races!inner(season_year, name)")
        .in("race_id", raceIds)
        .eq("position", 1)
        .order("race_id", { ascending: false })
        .limit(50)
      return (data ?? []) as { driver: { given_name: string; family_name: string; driver_id: string }; constructor: { name: string; constructor_id: string }; races: { season_year: number; name: string } }[]
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

  if (!circuit) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{circuit.name}</h1>
        <p className="text-lg text-muted-foreground">
          {circuit.location}, {circuit.country}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {circuit.first_gp_year && (
            <Badge>First GP: {circuit.first_gp_year}</Badge>
          )}
          {circuit.direction && (
            <Badge variant="secondary">Direction: {circuit.direction}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {circuit.length_km && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Length</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{circuit.length_km.toFixed(3)} km</p>
            </CardContent>
          </Card>
        )}
        {circuit.turns && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Turns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{circuit.turns}</p>
            </CardContent>
          </Card>
        )}
        {races && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GPs Held</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{races.length}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="races">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="races">Grands Prix</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="fastest-laps">Fastest Laps</TabsTrigger>
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

        <TabsContent value="winners">
          <Card>
            <CardHeader>
              <CardTitle>Race Winners at {circuit.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topWinners.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Most Wins</h3>
                  <div className="flex flex-wrap gap-2">
                    {topWinners.map(([name, count]) => {
                      const [driverId, displayName] = name.split("|")
                      return (
                        <Link key={driverId} to={`/drivers/${driverId}`}>
                          <Badge variant="secondary" className="text-sm px-3 py-1 hover:bg-secondary/80">
                            {displayName} ({count})
                          </Badge>
                        </Link>
                      )
                    })}
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
      </Tabs>
    </div>
  )
}
