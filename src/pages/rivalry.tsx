import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { compareDrivers } from "@/lib/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"
import type { Driver, RaceResult, QualifyingResult } from "@/types/database"
import { Swords, Trophy, Flag, Users, Gauge, Medal } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

export default function RivalryPage() {
  const [driver1Id, setDriver1Id] = useState("")
  const [driver2Id, setDriver2Id] = useState("")

  const { data: drivers } = useQuery({
    queryKey: ["all-drivers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, driver_id, given_name, family_name")
        .order("family_name", { ascending: true })
      return (data ?? []) as Driver[]
    },
  })

  const { data: driver1Record } = useQuery({
    queryKey: ["driver-record-r1", driver1Id],
    queryFn: async () => {
      if (!driver1Id) return null
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("driver_id", driver1Id)
        .single()
      return data as { id: string } | null
    },
    enabled: !!driver1Id,
  })

  const { data: driver2Record } = useQuery({
    queryKey: ["driver-record-r2", driver2Id],
    queryFn: async () => {
      if (!driver2Id) return null
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("driver_id", driver2Id)
        .single()
      return data as { id: string } | null
    },
    enabled: !!driver2Id,
  })

  const d1Uuid = driver1Record?.id
  const d2Uuid = driver2Record?.id

  const { data: d1Results } = useQuery({
    queryKey: ["rivalry-d1-results", d1Uuid],
    queryFn: async () => {
      if (!d1Uuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, races!inner(season_year, round, name, date)")
        .eq("driver_id", d1Uuid)
        .order("race_id", { ascending: true })
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string } })[]
    },
    enabled: !!d1Uuid,
  })

  const { data: d2Results } = useQuery({
    queryKey: ["rivalry-d2-results", d2Uuid],
    queryFn: async () => {
      if (!d2Uuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, races!inner(season_year, round, name, date)")
        .eq("driver_id", d2Uuid)
        .order("race_id", { ascending: true })
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string } })[]
    },
    enabled: !!d2Uuid,
  })

  const { data: d1Quali } = useQuery({
    queryKey: ["rivalry-d1-quali", d1Uuid],
    queryFn: async () => {
      if (!d1Uuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("*")
        .eq("driver_id", d1Uuid)
        .order("race_id", { ascending: true })
      return (data ?? []) as QualifyingResult[]
    },
    enabled: !!d1Uuid,
  })

  const { data: d2Quali } = useQuery({
    queryKey: ["rivalry-d2-quali", d2Uuid],
    queryFn: async () => {
      if (!d2Uuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("*")
        .eq("driver_id", d2Uuid)
        .order("race_id", { ascending: true })
      return (data ?? []) as QualifyingResult[]
    },
    enabled: !!d2Uuid,
  })

  const d1Name = drivers?.find((d) => d.driver_id === driver1Id)
  const d2Name = drivers?.find((d) => d.driver_id === driver2Id)
  const d1Label = d1Name ? `${d1Name.given_name} ${d1Name.family_name}` : "Driver 1"
  const d2Label = d2Name ? `${d2Name.given_name} ${d2Name.family_name}` : "Driver 2"

  const stats = (d1Results && d2Results && d1Quali && d2Quali)
    ? compareDrivers(d1Results as RaceResult[], d2Results as RaceResult[], d1Quali, d2Quali)
    : null

  const commonRaceIds = (d1Results ?? [])
    .map((r) => r.race_id)
    .filter((id) => (d2Results ?? []).some((r) => r.race_id === id))
    .slice(0, 30)

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
            <Swords className="w-8 h-8 text-accent-red" />
            Rivalry Analysis
          </h1>
          <p className="text-text-secondary mt-2">Compare two drivers head-to-head across their careers.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-text-primary">
              <Users className="w-4 h-4 text-text-secondary" />
              Driver 1
            </label>
            <select
              value={driver1Id}
              onChange={(e) => setDriver1Id(e.target.value)}
              className="w-full rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select driver...</option>
              {drivers?.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.given_name} {d.family_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-text-primary">
              <Users className="w-4 h-4 text-text-secondary" />
              Driver 2
            </label>
            <select
              value={driver2Id}
              onChange={(e) => setDriver2Id(e.target.value)}
              className="w-full rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select driver...</option>
              {drivers?.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.given_name} {d.family_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
                <CardContent className="p-5 flex items-center gap-3">
                  <Flag className="w-8 h-8 text-text-tertiary" />
                  <div>
                    <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Races Together</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.racesTogether}</p>
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
                    <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Race H2H</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stats.headToHeadRace.driver1Wins} – {stats.headToHeadRace.driver2Wins}
                    </p>
                    <p className="text-xs text-text-secondary">{d1Label} vs {d2Label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
                <CardContent className="p-5 flex items-center gap-3">
                  <Gauge className="w-8 h-8 text-blue-400/60" />
                  <div>
                    <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Quali H2H</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stats.headToHeadQuali.driver1Wins} – {stats.headToHeadQuali.driver2Wins}
                    </p>
                    <p className="text-xs text-text-secondary">{d1Label} vs {d2Label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
                <CardContent className="p-5 flex items-center gap-3">
                  <Medal className="w-8 h-8 text-amber-500/60" />
                  <div>
                    <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Avg Finish</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stats.driver1AvgFinish?.toFixed(1) ?? "—"} vs {stats.driver2AvgFinish?.toFixed(1) ?? "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>{d1Label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Wins</span>
                    <span className="font-semibold text-text-primary">{stats.driver1Wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Podiums</span>
                    <span className="font-semibold text-text-primary">{stats.driver1Podiums}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Avg Finish</span>
                    <span className="font-semibold text-text-primary">{stats.driver1AvgFinish?.toFixed(1) ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>{d2Label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Wins</span>
                    <span className="font-semibold text-text-primary">{stats.driver2Wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Podiums</span>
                    <span className="font-semibold text-text-primary">{stats.driver2Podiums}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Avg Finish</span>
                    <span className="font-semibold text-text-primary">{stats.driver2AvgFinish?.toFixed(1) ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {commonRaceIds.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Head-to-Head Races (last {commonRaceIds.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Race</TableHead>
                        <TableHead>Season</TableHead>
                        <TableHead><div className="text-end">{d1Label} Pos</div></TableHead>
                        <TableHead><div className="text-end">{d2Label} Pos</div></TableHead>
                        <TableHead>Winner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commonRaceIds.map((raceId) => {
                        const r1 = d1Results?.find((r) => r.race_id === raceId)
                        const r2 = d2Results?.find((r) => r.race_id === raceId)
                        const race = r1?.races ?? r2?.races
                        let winner = "—"
                        if (r1?.position && r2?.position) {
                          if (r1.position < r2.position) winner = d1Label
                          else if (r2.position < r1.position) winner = d2Label
                          else winner = "Tie"
                        } else if (r1?.position && !r2?.position) {
                          winner = d1Label
                        } else if (!r1?.position && r2?.position) {
                          winner = d2Label
                        }
                        return (
                          <TableRow key={raceId}>
                            <TableCell>
                              <Link to={`/races/${raceId}`} className="hover:underline text-text-primary">{race?.name ?? "—"}</Link>
                            </TableCell>
                            <TableCell className="text-text-primary">{race?.season_year ?? "—"}</TableCell>
                            <TableCell className={`text-right ${r1?.position === 1 ? "font-bold text-emerald-400" : "text-text-primary"}`}>
                              {r1?.position ?? "DNF"}
                            </TableCell>
                            <TableCell className={`text-right ${r2?.position === 1 ? "font-bold text-emerald-400" : "text-text-primary"}`}>
                              {r2?.position ?? "DNF"}
                            </TableCell>
                            <TableCell className="text-sm text-text-primary">{winner}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {!stats && driver1Id && driver2Id && (
        <p className="text-center text-text-secondary py-8">
          Loading comparison data...
        </p>
      )}
    </motion.div>
  )
}
