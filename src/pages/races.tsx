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
        .select("race_id, driver:drivers(driver_id, given_name, family_name, photo_url), constructor:constructors(name)")
        .in("race_id", completedRaceIds)
        .in("position", [1, 2, 3])
        .order("position", { ascending: true })
      return (data ?? []) as { race_id: string; driver: { driver_id: string; given_name: string; family_name: string; photo_url: string | null }; constructor: { name: string } }[]
    },
    enabled: completedRaceIds.length > 0,
  })

  const podiumMap = useMemo(() => {
    const map = new Map<string, { driver: { driver_id: string; given_name: string; family_name: string; photo_url: string | null }; constructor: { name: string } }[]>()
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Races</h1>
          <p className="text-muted-foreground">Browse Formula 1 races by season.</p>
        </div>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
          className="rounded-md border px-3 py-1.5 text-sm bg-background"
        >
          {seasons?.map((s) => (
            <option key={s.year} value={s.year}>
              {s.year}
            </option>
          ))}
          {(!seasons || seasons.length === 0) && (
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          )}
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading races...</div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Upcoming Races ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2 font-heading uppercase tracking-wide">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-4 h-3 object-cover" />
                        )}
                        {race.name}
                      </CardTitle>
                      <Badge>Round {race.round}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {new Date(race.date).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Completed Races ({completed.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((race) => (
              <Link key={race.id} to={`/races/${race.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2 font-heading uppercase tracking-wide">
                        {getFlagUrl(race.circuits.country) && (
                          <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-4 h-3 object-cover" />
                        )}
                        {race.name}
                      </CardTitle>
                      <Badge variant="secondary">Round {race.round}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {new Date(race.date).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {podiumMap.get(race.id) && (
                      <div className="flex flex-col gap-1 pt-3 border-t">
                        {podiumMap.get(race.id)!.map((r, i) => (
                          <div key={r.driver.driver_id} className="flex items-center gap-2 text-xs">
                            <span className="w-4 shrink-0">
                              {["🥇", "🥈", "🥉"][i]}
                            </span>
                            {r.driver.photo_url && (
                              <img src={r.driver.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                            )}
                            <span className="font-medium truncate">
                              {r.driver.given_name} {r.driver.family_name}
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
        <div className="text-center py-12 text-muted-foreground">
          No races found for {selectedSeason}.
        </div>
      )}
    </div>
  )
}
