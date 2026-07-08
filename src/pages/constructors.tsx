import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFlagUrl } from "@/lib/nationalityFlags"
import type { Constructor } from "@/types/database"

export default function ConstructorsPage() {
  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState<"all" | "current" | "past">("all")

  const { data: constructors, isLoading } = useQuery({
    queryKey: ["constructors", search],
    queryFn: async () => {
      let query = supabase.from("constructors").select("*").order("name", { ascending: true }).limit(100)

      if (search) {
        query = query.textSearch("search_vector", search, { type: "websearch" })
      }

      const { data } = await query
      return (data ?? []) as Constructor[]
    },
  })

  const { data: latestSeason } = useQuery({
    queryKey: ["constructors-latest-season"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("year")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle()
      return data as { year: number } | null
    },
  })

  const currentSeason = latestSeason?.year ?? 2025

  const { data: teamDrivers } = useQuery({
    queryKey: ["constructors-team-drivers", currentSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("race_results")
        .select("constructor_id, driver:drivers!inner(driver_id, given_name, family_name, nationality), race:races!inner(season_year)")
        .eq("race.season_year", currentSeason)
      type DriverInfo = { driver_id: string; given_name: string; family_name: string; nationality: string | null }
      if (!data) return new Map<string, DriverInfo[]>()
      const map = new Map<string, Set<string>>()
      const driverInfo = new Map<string, DriverInfo>()
      for (const row of data as { constructor_id: string; driver: DriverInfo }[]) {
        if (!map.has(row.constructor_id)) map.set(row.constructor_id, new Set())
        map.get(row.constructor_id)!.add(row.driver.driver_id)
        driverInfo.set(row.driver.driver_id, row.driver)
      }
      const result = new Map<string, DriverInfo[]>()
      for (const [constructorId, driverIds] of map) {
        result.set(constructorId, [...driverIds].map((id) => driverInfo.get(id)!))
      }
      return result
    },
    enabled: !!latestSeason,
  })

  const currentTeamIds = new Set(teamDrivers?.keys())

  const filteredConstructors = constructors?.filter((team) =>
    teamFilter === "all" ? true : teamFilter === "current" ? currentTeamIds.has(team.id) : !currentTeamIds.has(team.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Constructors</h1>
          <p className="text-muted-foreground">All Formula 1 constructors across history.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border bg-muted p-0.5 text-sm">
            <button
              onClick={() => setTeamFilter("all")}
              className={`rounded px-3 py-1 transition-colors ${teamFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setTeamFilter("current")}
              className={`rounded px-3 py-1 transition-colors ${teamFilter === "current" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Current
            </button>
            <button
              onClick={() => setTeamFilter("past")}
              className={`rounded px-3 py-1 transition-colors ${teamFilter === "past" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Past
            </button>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading constructors...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConstructors?.map((team) => (
          <Link key={team.id} to={`/constructors/${team.constructor_id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg font-heading uppercase tracking-wide flex items-center gap-2">
                  {getFlagUrl(team.nationality) && (
                    <img src={getFlagUrl(team.nationality)!} alt={team.nationality!} className="w-5 h-4 object-cover rounded-sm" />
                  )}
                  {team.name}
                </CardTitle>
                <div className="flex gap-2 mt-1">
                  {team.founded_year && <Badge variant="outline">Founded {team.founded_year}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {team.base && <p>Base: {team.base}</p>}
                  {team.principal && <p>Team Principal: {team.principal}</p>}
                  {team.engine_supplier && <p>Engine: {team.engine_supplier}</p>}
                  {teamDrivers?.get(team.id) && teamDrivers.get(team.id)!.length > 0 && (
                    <p className="mt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground font-heading">Current Drivers</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {teamDrivers.get(team.id)!.map((d) => (
                          <Link
                            key={d.driver_id}
                            to={`/drivers/${d.driver_id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-heading text-foreground hover:underline transition-colors"
                          >
                            {getFlagUrl(d.nationality) && (
                              <img src={getFlagUrl(d.nationality)!} alt={d.nationality ?? ""} className="w-4 h-3 object-cover rounded-none" />
                            )}
                            {d.given_name} {d.family_name}
                          </Link>
                        ))}
                      </div>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredConstructors?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No {teamFilter} teams found.
        </div>
      )}
    </div>
  )
}
