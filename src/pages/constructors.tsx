import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { Search, X } from "lucide-react"
import type { Constructor } from "@/types/database"

export default function ConstructorsPage() {
  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState<"all" | "current" | "past">("all")

  const { data: constructors, isLoading } = useQuery({
    queryKey: ["constructors", search],
    queryFn: async () => {
      let query = supabase.from("constructors").select("*").order("name", { ascending: true })

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide">Constructors</h1>
          <p className="text-sm text-muted-foreground mt-1">All Formula 1 constructors across history.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
          {(["all", "current", "past"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTeamFilter(filter)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize",
                teamFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-card pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredConstructors?.map((team) => (
          <Link key={team.id} to={`/constructors/${team.constructor_id}`}>
            <Card className="h-full group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg shrink-0 bg-secondary/50 p-1.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <span className="font-heading text-xs font-bold text-muted-foreground">{team.name[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {getFlagUrl(team.nationality) && (
                        <img src={getFlagUrl(team.nationality)!} alt="" className="w-4 h-3 object-cover rounded-sm shrink-0" />
                      )}
                      <span className="font-heading uppercase tracking-wide text-sm truncate">{team.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {team.founded_year && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          Est. {team.founded_year}
                        </Badge>
                      )}
                      {currentTeamIds.has(team.id) && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-green-600 text-white border-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                      {team.base && <p>{team.base}</p>}
                      {team.engine_supplier && <p>Engine: {team.engine_supplier}</p>}
                    </div>
                    {teamDrivers?.get(team.id) && teamDrivers.get(team.id)!.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                        {teamDrivers.get(team.id)!.map((d) => (
                          <div key={d.driver_id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {getFlagUrl(d.nationality) && (
                              <img src={getFlagUrl(d.nationality)!} alt="" className="w-3 h-2 object-cover" />
                            )}
                            <span>{d.family_name.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredConstructors?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No {teamFilter} teams found.</p>
        </div>
      )}
    </div>
  )
}
