import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { compareDrivers } from "@/lib/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Driver, RaceResult, QualifyingResult } from "@/types/database"

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rivalry Analysis</h1>
        <p className="text-muted-foreground">Compare two drivers head-to-head across their careers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Driver 1</label>
          <select
            value={driver1Id}
            onChange={(e) => setDriver1Id(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="">Select driver...</option>
            {drivers?.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.given_name} {d.family_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Driver 2</label>
          <select
            value={driver2Id}
            onChange={(e) => setDriver2Id(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="">Select driver...</option>
            {drivers?.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.given_name} {d.family_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Races Together</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.racesTogether}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Race H2H</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.headToHeadRace.driver1Wins} – {stats.headToHeadRace.driver2Wins}
                </p>
                <p className="text-xs text-muted-foreground">{d1Label} vs {d2Label}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quali H2H</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.headToHeadQuali.driver1Wins} – {stats.headToHeadQuali.driver2Wins}
                </p>
                <p className="text-xs text-muted-foreground">{d1Label} vs {d2Label}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Finish</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {stats.driver1AvgFinish?.toFixed(1) ?? "—"} vs {stats.driver2AvgFinish?.toFixed(1) ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{d1Label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Wins</span><span className="font-semibold">{stats.driver1Wins}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Podiums</span><span className="font-semibold">{stats.driver1Podiums}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Finish</span><span className="font-semibold">{stats.driver1AvgFinish?.toFixed(1) ?? "—"}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{d2Label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Wins</span><span className="font-semibold">{stats.driver2Wins}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Podiums</span><span className="font-semibold">{stats.driver2Podiums}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Finish</span><span className="font-semibold">{stats.driver2AvgFinish?.toFixed(1) ?? "—"}</span></div>
              </CardContent>
            </Card>
          </div>

          {commonRaceIds.length > 0 && (
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
                      <TableHead>{d1Label} Pos</TableHead>
                      <TableHead>{d2Label} Pos</TableHead>
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
                            <Link to={`/races/${raceId}`} className="hover:underline">{race?.name ?? "—"}</Link>
                          </TableCell>
                          <TableCell>{race?.season_year ?? "—"}</TableCell>
                          <TableCell className={r1?.position === 1 ? "font-bold text-green-600" : ""}>
                            {r1?.position ?? "DNF"}
                          </TableCell>
                          <TableCell className={r2?.position === 1 ? "font-bold text-green-600" : ""}>
                            {r2?.position ?? "DNF"}
                          </TableCell>
                          <TableCell className="text-sm">{winner}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!stats && driver1Id && driver2Id && (
        <p className="text-center text-muted-foreground py-8">
          Loading comparison data...
        </p>
      )}
    </div>
  )
}
