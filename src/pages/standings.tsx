import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { DriverStanding, ConstructorStanding, Season } from "@/types/database"

export default function StandingsPage() {
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear())

  const { data: seasons } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false })
        .limit(10)
      return (data ?? []) as Season[]
    },
  })

  useEffect(() => {
    if (seasons?.[0]?.year) {
      setSelectedSeason(seasons[0].year)
    }
  }, [seasons])

  const { data: driverStandings } = useQuery({
    queryKey: ["driver-standings", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("driver_standings")
        .select("*, driver:drivers(*)")
        .eq("season_year", selectedSeason)
        .order("points", { ascending: false, nullsFirst: false })
      if (!data) return []
      const grouped = new Map<string, DriverStanding & { driver: { given_name: string; family_name: string; driver_id: string; nationality: string } }>()
      for (const s of data as (DriverStanding & { driver: { given_name: string; family_name: string; driver_id: string; nationality: string } })[]) {
        const existing = grouped.get(s.driver_id)
        if (!existing || s.points > existing.points) grouped.set(s.driver_id, s)
      }
      return [...grouped.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    },
  })

  const { data: driverTeams } = useQuery({
    queryKey: ["driver-teams-from-results", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("race_results")
        .select("driver_id, constructor:constructors!inner(name), races!inner(season_year, date)")
        .eq("races.season_year", selectedSeason)
        .order("races.date", { ascending: false })
      if (!data) return []
      const seen = new Set<string>()
      const unique: { driver_id: string; constructor: { name: string } }[] = []
      for (const r of data as unknown as { driver_id: string; constructor: { name: string } }[]) {
        if (!seen.has(r.driver_id)) {
          seen.add(r.driver_id)
          unique.push(r)
        }
      }
      return unique
    },
  })

  const driverTeamMap = new Map<string, string>()
  driverTeams?.forEach((dt) => {
    if (!driverTeamMap.has(dt.driver_id)) driverTeamMap.set(dt.driver_id, dt.constructor.name)
  })

  const { data: constructorStandings } = useQuery({
    queryKey: ["constructor-standings", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("constructor_standings")
        .select("*, constructor:constructors(*)")
        .eq("season_year", selectedSeason)
        .order("points", { ascending: false, nullsFirst: false })
        .limit(100)
      if (!data) return []
      const grouped = new Map<string, ConstructorStanding & { constructor: { name: string; constructor_id: string; nationality: string } }>()
      for (const s of data as (ConstructorStanding & { constructor: { name: string; constructor_id: string; nationality: string } })[]) {
        const existing = grouped.get(s.constructor_id)
        if (!existing || s.points > existing.points) grouped.set(s.constructor_id, s)
      }
      return [...grouped.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    },
  })

  const chartData = (driverStandings ?? [])
    .filter((s) => s.position && s.position <= 10)
    .map((s) => ({
      name: `${s.driver.given_name.split(" ")[0]} ${s.driver.family_name.substring(0, 3)}`,
      fullName: `${s.driver.given_name} ${s.driver.family_name}`,
      points: s.points,
      driverId: s.driver.driver_id,
    }))

  const constructorChartData = (constructorStandings ?? [])
    .filter((s) => s.position && s.position <= 10)
    .map((s) => ({
      name: s.constructor.name.substring(0, 12),
      fullName: s.constructor.name,
      points: s.points,
      constructorId: s.constructor.constructor_id,
    }))



  const getPositionBadge = (pos: number | null) => {
    if (!pos) return <span className="text-xs font-semibold">—</span>
    return <span className="text-xs font-semibold">P{pos}</span>
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { fullName: string; points: number } }[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border bg-background p-2 shadow-sm text-sm">
          <p className="font-medium">{payload[0].payload.fullName}</p>
          <p className="text-muted-foreground">{payload[0].payload.points} points</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Championship Standings</h1>
          <p className="text-muted-foreground">Drivers' and Constructors' standings.</p>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            {seasons?.map((s) => (
              <button
                key={s.year}
                onClick={() => setSelectedSeason(s.year)}
                className={
                  `inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ` +
                  (selectedSeason === s.year
                    ? "bg-background text-foreground shadow"
                    : "hover:bg-background/50")
                }
              >
                {s.year}
              </button>
            ))}

          </div>
        </div>
      </div>

      <Tabs defaultValue="drivers">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="drivers">Drivers' Championship</TabsTrigger>
            <TabsTrigger value="constructors">Constructors' Championship</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="drivers">
          {chartData.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Top 10 Points — {selectedSeason}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{selectedSeason} Drivers' Championship</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><div className="text-center">Pos</div></TableHead>
                    <TableHead><div>Driver</div></TableHead>
                    <TableHead><div className="text-end">Points</div></TableHead>
                    <TableHead><div className="text-end">Wins</div></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverStandings?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><div className="text-center">{getPositionBadge(s.position)}</div></TableCell>
                      <TableCell>
                        <Link
                          to={`/drivers/${s.driver.driver_id}`}
                          className="font-medium hover:underline"
                        >
                          {s.driver.given_name} {s.driver.family_name}
                        </Link>
                      </TableCell>
                      <TableCell><div className="text-end font-bold">{s.points}</div></TableCell>
                      <TableCell><div className="text-end">{s.wins}</div></TableCell>
                    </TableRow>
                  ))}

                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constructors">
          {constructorChartData.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Top 10 Points — {selectedSeason}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={constructorChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{selectedSeason} Constructors' Championship</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><div className="text-center">Pos</div></TableHead>
                    <TableHead><div>Constructor</div></TableHead>
                    <TableHead><div>Nationality</div></TableHead>
                    <TableHead><div className="text-end">Points</div></TableHead>
                    <TableHead><div className="text-end">Wins</div></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructorStandings?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><div className="text-center">{getPositionBadge(s.position)}</div></TableCell>
                      <TableCell>
                        <Link
                          to={`/constructors/${s.constructor.constructor_id}`}
                          className="font-medium hover:underline"
                        >
                          {s.constructor.name}
                        </Link>
                      </TableCell>
                      <TableCell>{s.constructor.nationality}</TableCell>
                      <TableCell><div className="text-end font-bold">{s.points}</div></TableCell>
                      <TableCell><div className="text-end">{s.wins}</div></TableCell>
                    </TableRow>
                  ))}

                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
