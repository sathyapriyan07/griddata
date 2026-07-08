import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFlagUrl } from "@/lib/nationalityFlags"
import type { Race, Season } from "@/types/database"

export default function RacesPage() {
  const { data: seasons } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data } = await supabase.from("seasons").select("*").order("year", { ascending: false }).limit(10)
      return (data ?? []) as Season[]
    },
  })

  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear())

  useEffect(() => {
    if (seasons?.[0]?.year) setSelectedSeason(seasons[0].year)
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
      return (data ?? []) as any[]
    },
    enabled: completedRaceIds.length > 0,
  })

  const podiumMap = useMemo(() => {
    const map = new Map<string, any[]>()
    podiumResults?.forEach((r: any) => {
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with season pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl uppercase tracking-wide">Races</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Browse Formula 1 races by season.</p>
        </div>
      </div>

      {/* Season Pills */}
      <div className="overflow-x-auto hide-scrollbar -mx-3 sm:-mx-4 px-3 sm:px-4">
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {seasons?.map((s) => (
            <button
              key={s.year}
              onClick={() => setSelectedSeason(s.year)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                selectedSeason === s.year
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.year}
            </button>
          ))}
          {(!seasons || seasons.length === 0) && (
            <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-background text-foreground shadow-sm">
              {new Date().getFullYear()}
            </button>
          )}
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading races...</div>}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-heading text-base uppercase tracking-wide text-f1-red mb-3">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {upcoming.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full hover:bg-accent/50 transition-colors" accent>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-4 h-3 object-cover shrink-0" />
                        )}
                        {race.name}
                      </CardTitle>
                      <Badge variant="default" className="text-[10px]">R{race.round}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {new Date(race.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-heading text-base uppercase tracking-wide text-muted-foreground mb-3">
            Completed ({completed.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {completed.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full hover:bg-accent/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-4 h-3 object-cover shrink-0" />
                        )}
                        {race.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px]">R{race.round}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(race.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {podiumMap.get(race.id) && (
                      <div className="flex flex-col gap-1 pt-2 border-t border-border">
                        {podiumMap.get(race.id)!.map((r: any, i: number) => (
                          <div key={r.driver.driver_id} className="flex items-center gap-2 text-[11px]">
                            <span className={`w-4 shrink-0 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : ""}`}>
                              P{i + 1}
                            </span>
                            {getFlagUrl(r.driver.nationality) && (
                              <img src={getFlagUrl(r.driver.nationality)!} alt={r.driver.nationality ?? ""} className="w-3 h-2 object-cover" />
                            )}
                            <span className="font-medium truncate">{r.driver.family_name.toUpperCase()}</span>
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
        <div className="text-center py-12 text-muted-foreground">No races found for {selectedSeason}.</div>
      )}
    </div>
  )
}
