import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { cn } from "@/lib/utils"
import { Calendar, CheckCircle2, Clock } from "lucide-react"
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide">Races</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse Formula 1 races by season.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {seasons?.map((s) => (
            <button
              key={s.year}
              onClick={() => setSelectedSeason(s.year)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                selectedSeason === s.year
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {s.year}
            </button>
          ))}
          {(!seasons || seasons.length === 0) && (
            <span className="text-xs text-muted-foreground px-2 py-1.5">
              {new Date().getFullYear()}
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-heading uppercase tracking-wider text-muted-foreground">
              Upcoming ({upcoming.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full group hover:shadow-md transition-all duration-200 border-dashed border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-5 h-4 object-cover rounded-sm shrink-0" />
                        )}
                        <span className="font-heading uppercase tracking-wide text-sm truncate">
                          {race.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        R{race.round}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(race.date).toLocaleDateString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-heading uppercase tracking-wider text-muted-foreground">
              Completed ({completed.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-5 h-4 object-cover rounded-sm shrink-0" />
                        )}
                        <span className="font-heading uppercase tracking-wide text-sm truncate">
                          {race.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        R{race.round}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(race.date).toLocaleDateString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </div>
                    {podiumMap.get(race.id) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        {podiumMap.get(race.id)!.map((r, i) => (
                          <div key={r.driver.driver_id} className="flex items-center gap-1 text-[11px]">
                            <span className={cn(
                              "font-heading text-xs font-bold",
                              i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : "text-amber-700"
                            )}>
                              P{i + 1}
                            </span>
                            {getFlagUrl(r.driver.nationality) && (
                              <img src={getFlagUrl(r.driver.nationality)!} alt="" className="w-3 h-2 object-cover" />
                            )}
                            <span className="text-muted-foreground truncate max-w-[80px]">
                              {r.driver.family_name.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {races?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No races found for {selectedSeason}.</p>
        </div>
      )}
    </div>
  )
}
