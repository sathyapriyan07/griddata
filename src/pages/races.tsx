import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Race, Season } from "@/types/database"

const CURRENT_SEASON = 2025

export default function RacesPage() {
  const [selectedSeason, setSelectedSeason] = useState(CURRENT_SEASON)

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

  const { data: races, isLoading } = useQuery({
    queryKey: ["races", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*")
        .eq("season_year", selectedSeason)
        .order("round", { ascending: true })
      return (data ?? []) as Race[]
    },
  })

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
            <option value={CURRENT_SEASON}>{CURRENT_SEASON}</option>
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
                      <CardTitle className="text-base">{race.name}</CardTitle>
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
                      <CardTitle className="text-base">{race.name}</CardTitle>
                      <Badge variant="secondary">Round {race.round}</Badge>
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

      {races?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No races found for {selectedSeason}.
        </div>
      )}
    </div>
  )
}
