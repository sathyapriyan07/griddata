import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock } from "lucide-react"
import type { Race, Season } from "@/types/database"

export default function RacesPage() {
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

  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear())

  useEffect(() => {
    if (seasons?.[0]?.year) {
      setSelectedSeason(seasons[0].year)
    }
  }, [seasons])

  const { data: races, isLoading } = useQuery({
    queryKey: ["races", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*, circuits!inner(country)")
        .eq("season_year", selectedSeason)
        .order("round", { ascending: true })
      return (data ?? []) as (Race & { circuits: { country: string } })[]
    },
  })

  const completedRaceIds = useMemo(() => {
    return races?.filter((r) => new Date(r.date) < new Date()).map((r) => r.id) ?? []
  }, [races])

  const { data: podiumResults } = useQuery({
    queryKey: ["races-podium", selectedSeason, completedRaceIds.join(",")],
    queryFn: async () => {
      if (completedRaceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("race_id, driver:drivers(driver_id, given_name, family_name, nationality), constructor:constructors(name)")
        .in("race_id", completedRaceIds)
        .in("position", [1, 2, 3])
        .order("position", { ascending: true })
      return (data ?? []) as { race_id: string; driver: { driver_id: string; given_name: string; family_name: string; nationality: string | null }; constructor: { name: string } }[]
    },
    enabled: completedRaceIds.length > 0,
  })

  const podiumMap = useMemo(() => {
    const map = new Map<string, { driver: { driver_id: string; given_name: string; family_name: string; nationality: string | null }; constructor: { name: string } }[]>()
    podiumResults?.forEach((r) => {
      const arr = map.get(r.race_id) ?? []
      arr.push(r)
      map.set(r.race_id, arr)
    })
    return map
  }, [podiumResults])

  const now = new Date()
  const upcoming = races?.filter((r) => new Date(r.date) >= now) ?? []
  const completed = races?.filter((r) => new Date(r.date) < now) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide text-text-primary">Races</h1>
          <p className="text-sm text-text-secondary mt-1">Browse Formula 1 races by season.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {seasons?.map((s) => (
            <button
              key={s.year}
              onClick={() => setSelectedSeason(s.year)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                selectedSeason === s.year
                  ? "bg-accent-red text-white shadow-sm"
                  : "bg-tertiary text-text-secondary hover:text-text-primary"
              )}
            >
              {s.year}
            </button>
          ))}
          {(!seasons || seasons.length === 0) && (
            <span className="text-xs text-text-secondary px-2 py-1.5">
              {new Date().getFullYear()}
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-tertiary/50 animate-pulse" />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-red" />
              Upcoming ({upcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Round</TableHead>
                    <TableHead>Grand Prix</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((race) => (
                    <TableRow key={race.id}>
                      <TableCell className="text-center font-heading font-bold text-text-primary">{race.round}</TableCell>
                      <TableCell>
                        <Link to={`/races/${race.id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                          {race.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {new Date(race.date).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Round</TableHead>
                    <TableHead>Grand Prix</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>P2</TableHead>
                    <TableHead>P3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map((race) => {
                    const podium = podiumMap.get(race.id) ?? []
                    return (
                      <TableRow key={race.id}>
                        <TableCell className="text-center font-heading font-bold text-text-primary">{race.round}</TableCell>
                        <TableCell>
                          <Link to={`/races/${race.id}`} className="hover:text-accent-red transition-colors font-medium text-text-primary">
                            {race.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {new Date(race.date).toLocaleDateString(undefined, {
                            weekday: "short", month: "short", day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {podium[0] ? (
                            <Link to={`/drivers/${podium[0].driver.driver_id}`} className="hover:underline text-yellow-500 font-medium text-sm">
                              {podium[0].driver.family_name.toUpperCase()}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {podium[1] ? (
                            <Link to={`/drivers/${podium[1].driver.driver_id}`} className="hover:underline text-zinc-400 font-medium text-sm">
                              {podium[1].driver.family_name.toUpperCase()}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {podium[2] ? (
                            <Link to={`/drivers/${podium[2].driver.driver_id}`} className="hover:underline text-amber-700 font-medium text-sm">
                              {podium[2].driver.family_name.toUpperCase()}
                            </Link>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {races?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No races found for {selectedSeason}.</p>
        </div>
      )}
    </div>
  )
}
