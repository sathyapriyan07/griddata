import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"
import type { DriverStanding, ConstructorStanding, Season, SeasonWikipedia } from "@/types/database"
import { Trophy, Medal, Crown, Building2, BarChart3, Users, Book, ExternalLink } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

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

  const { data: seasonWikipedia } = useQuery({
    queryKey: ["season-wikipedia", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("season_wikipedia")
        .select("*")
        .eq("entity_id", selectedSeason)
        .maybeSingle()
      return data as SeasonWikipedia | null
    },
    enabled: !!selectedSeason,
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
    if (!pos) return <span className="text-xs font-semibold text-text-secondary">—</span>
    if (pos === 1) return <Crown className="w-4 h-4 text-yellow-500" />
    if (pos === 2) return <Medal className="w-4 h-4 text-gray-400" />
    if (pos === 3) return <Medal className="w-4 h-4 text-amber-600" />
    return <span className="text-xs font-semibold text-text-primary">P{pos}</span>
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { fullName: string; points: number } }[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-default bg-secondary p-3 shadow-sm text-sm">
          <p className="font-medium text-text-primary">{payload[0].payload.fullName}</p>
          <p className="text-text-secondary">{payload[0].payload.points} points</p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[160px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default p-8 lg:p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%)`
        }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute top-0 left-0 h-full w-[4px] bg-accent-red" />
        <div className="relative z-10">
          <h1 className="text-3xl lg:text-5xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Championship Standings
          </h1>
          <p className="text-text-secondary mt-2">Drivers' and Constructors' championship standings.</p>
        </div>
      </section>

      <div className="overflow-x-auto hide-scrollbar">
        <div className="inline-flex gap-1.5 p-1">
          {seasons?.map((s) => (
            <button
              key={s.year}
              onClick={() => setSelectedSeason(s.year)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedSeason === s.year
                  ? "bg-accent-red text-white shadow-sm"
                  : "bg-tertiary text-text-secondary hover:bg-tertiary/80"
              }`}
            >
              {s.year}
            </button>
          ))}
        </div>
      </div>

      {seasonWikipedia?.short_description && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Book className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary leading-relaxed">{seasonWikipedia.short_description}</p>
              {seasonWikipedia.page_url && (
                <a
                  href={seasonWikipedia.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Read more on Wikipedia</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="drivers">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="drivers" className="gap-2">
              <Users className="w-4 h-4" />
              Drivers' Championship
            </TabsTrigger>
            <TabsTrigger value="constructors" className="gap-2">
              <Building2 className="w-4 h-4" />
              Constructors' Championship
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="drivers">
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            {chartData.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-text-secondary" />
                      Top 10 Points — {selectedSeason}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-text-tertiary/20" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="points" fill="hsl(3, 95%, 46%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedSeason} Drivers' Championship</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><div className="text-center">Pos</div></TableHead>
                        <TableHead>Driver</TableHead>
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
                              className="font-medium hover:underline text-text-primary"
                            >
                              {s.driver.given_name} {s.driver.family_name}
                            </Link>
                          </TableCell>
                          <TableCell><div className="text-end font-bold text-text-primary">{s.points}</div></TableCell>
                          <TableCell><div className="text-end text-text-primary">{s.wins}</div></TableCell>
                        </TableRow>
                      ))}

                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        <TabsContent value="constructors">
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            {constructorChartData.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Points — {selectedSeason}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={constructorChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-text-tertiary/20" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="points" fill="hsl(3, 95%, 46%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedSeason} Constructors' Championship</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><div className="text-center">Pos</div></TableHead>
                        <TableHead>Constructor</TableHead>
                        <TableHead>Nationality</TableHead>
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
                              className="font-medium hover:underline text-text-primary"
                            >
                              {s.constructor.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-text-secondary">{s.constructor.nationality}</TableCell>
                          <TableCell><div className="text-end font-bold text-text-primary">{s.points}</div></TableCell>
                          <TableCell><div className="text-end text-text-primary">{s.wins}</div></TableCell>
                        </TableRow>
                      ))}

                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
