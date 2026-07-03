import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { computeConstructorStats } from "@/lib/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import type { Constructor, RaceResult, ConstructorStanding, DriverConstructorHistory } from "@/types/database"

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
        .select("*, races!inner(season_year, round, name, date), driver:drivers(driver_id, given_name, family_name)")
        .eq("constructor_id", teamUuid)
        .order("race_id", { ascending: false })
        .limit(100)
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string; date: string }; driver: { driver_id: string; given_name: string; family_name: string } })[]
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
      return (data ?? []) as ConstructorStanding[]
    },
    enabled: !!teamUuid,
  })

  const { data: drivers } = useQuery({
    queryKey: ["constructor-drivers", teamUuid],
    queryFn: async () => {
      if (!teamUuid) return []
      const { data } = await supabase
        .from("driver_constructor_history")
        .select("*, drivers!inner(driver_id, given_name, family_name, nationality)")
        .eq("constructor_id", teamUuid)
        .order("season_year", { ascending: false })
      return (data ?? []) as (DriverConstructorHistory & { drivers: { driver_id: string; given_name: string; family_name: string; nationality: string | null } })[]
    },
    enabled: !!teamUuid,
  })

  const stats = constructorResults && standings
    ? computeConstructorStats(constructorResults as RaceResult[], standings)
    : null

  if (!team) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
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

      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Season Standings</TabsTrigger>
          <TabsTrigger value="results">Race Results</TabsTrigger>
          <TabsTrigger value="drivers">Driver Roster</TabsTrigger>
        </TabsList>
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
                    <TableHead>Position</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Wins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.season_year}</TableCell>
                      <TableCell>{s.position ? `P${s.position}` : "—"}</TableCell>
                      <TableCell>{s.points}</TableCell>
                      <TableCell>{s.wins}</TableCell>
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
                  {drivers?.map((dch) => (
                    <TableRow key={`${dch.drivers.driver_id}-${dch.season_year}`}>
                      <TableCell>
                        <Link to={`/drivers/${dch.drivers.driver_id}`} className="hover:underline font-medium">
                          {dch.drivers.given_name} {dch.drivers.family_name}
                        </Link>
                      </TableCell>
                      <TableCell>{dch.drivers.nationality ?? "—"}</TableCell>
                      <TableCell>{dch.season_year}</TableCell>
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
      </Tabs>
    </div>
  )
}
