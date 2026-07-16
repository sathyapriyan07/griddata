import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { Search, X, Building2 } from "lucide-react"
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
      const { data: raceData } = await supabase
        .from("races")
        .select("id")
        .eq("season_year", currentSeason)
      const races = (raceData ?? []) as { id: string }[]
      if (races.length === 0) return new Map<string, { driver_id: string; given_name: string; family_name: string; nationality: string | null }[]>()
      const raceIds = races.map((r) => r.id)
      const { data: resultData } = await supabase
        .from("race_results")
        .select("constructor_id, driver:drivers!inner(driver_id, given_name, family_name, nationality)")
        .in("race_id", raceIds)
      type DriverInfo = { driver_id: string; given_name: string; family_name: string; nationality: string | null }
      const data = (resultData ?? []) as { constructor_id: string; driver: DriverInfo }[]
      const map = new Map<string, Set<string>>()
      const driverInfo = new Map<string, DriverInfo>()
      for (const row of data) {
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
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide text-text-primary">Constructors</h1>
          <p className="text-sm text-text-secondary mt-1">All Formula 1 constructors across history.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 rounded-xl bg-tertiary p-1">
          {(["all", "current", "past"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTeamFilter(filter)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 capitalize",
                teamFilter === filter ? "bg-secondary text-text-primary shadow-sm border border-default" : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-default bg-secondary pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-text-tertiary hover:text-text-primary transition-colors" />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-tertiary/50 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filteredConstructors && filteredConstructors.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Constructor</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead className="text-center">Founded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Drivers</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Engine</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConstructors.map((team) => {
                    const drivers = teamDrivers?.get(team.id)
                    return (
                      <TableRow key={team.id}>
                        <TableCell>
                          <Link to={`/constructors/${team.constructor_id}`} className="inline-flex items-center gap-2.5 hover:text-accent-red transition-colors">
                            {team.logo_url ? (
                              <img src={team.logo_url} alt="" className="w-7 h-7 object-contain rounded shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-tertiary flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-text-tertiary">{team.name[0]}</span>
                              </div>
                            )}
                            <span className="font-medium text-text-primary">{team.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            {getFlagUrl(team.nationality ?? "") && (
                              <img src={getFlagUrl(team.nationality ?? "")!} alt="" className="w-4 h-3 object-cover rounded-sm" />
                            )}
                            <span className="text-text-secondary text-sm">{team.nationality ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-text-secondary text-sm">{team.founded_year ?? "—"}</TableCell>
                        <TableCell>
                          {currentTeamIds.has(team.id) ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-600/20 text-emerald-400">Current</span>
                          ) : (
                            <span className="text-text-tertiary text-xs">Past</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {drivers && drivers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {drivers.map((d) => (
                                <Link key={d.driver_id} to={`/drivers/${d.driver_id}`} className="hover:underline text-text-secondary text-xs">
                                  {d.family_name.toUpperCase()}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="text-text-tertiary text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-text-secondary text-xs max-w-[150px] truncate">{team.base ?? "—"}</TableCell>
                        <TableCell className="text-text-secondary text-xs">{team.engine_supplier ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredConstructors?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Building2 className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">No {teamFilter} teams found.</p>
        </div>
      )}
    </div>
  )
}
