import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { Search, X } from "lucide-react"
import type { Driver } from "@/types/database"

export default function DriversPage() {
  const [search, setSearch] = useState("")
  const [nationality, setNationality] = useState<string>("")

  const { data: latestSeason } = useQuery({
    queryKey: ["drivers-latest-season"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle()
      return (data as { year: number } | null)?.year ?? null
    },
  })

  const { data: currentStandings } = useQuery({
    queryKey: ["drivers-current-standings", latestSeason],
    queryFn: async () => {
      if (!latestSeason) return []
      const result = await supabase
        .from("driver_standings")
        .select("driver_id, position")
        .eq("season_year", latestSeason)
        .order("position", { ascending: true, nullsFirst: false })
      return (result.data ?? []) as { driver_id: string; position: number | null }[]
    },
    enabled: !!latestSeason,
  })

  const currentDriverIds = useMemo(
    () => new Set(currentStandings?.map((s) => s.driver_id) ?? []),
    [currentStandings],
  )

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers", search, nationality],
    queryFn: async () => {
      let query = supabase.from("drivers").select("*").order("family_name", { ascending: true })

      if (search) {
        query = query.textSearch("search_vector", search, { type: "websearch" })
      }
      if (nationality) {
        query = query.eq("nationality", nationality)
      }

      const { data } = await query
      return (data ?? []) as Driver[]
    },
  })

  const { data: nationalities } = useQuery({
    queryKey: ["driver-nationalities"],
    queryFn: async () => {
      const result = await supabase
        .from("drivers")
        .select("nationality")
        .not("nationality", "is", null)
        .order("nationality")
      const data = result.data as { nationality: string | null }[] | null
      return [...new Set(data?.map((d) => d.nationality).filter(Boolean) ?? [])] as string[]
    },
  })

  const currentDrivers = useMemo(() => {
    if (!drivers || !currentStandings) return []
    const driverMap = new Map(drivers.map((d) => [d.driver_id, d]))
    return currentStandings
      .map((s) => driverMap.get(s.driver_id))
      .filter(Boolean) as Driver[]
  }, [drivers, currentStandings])

  const pastDrivers = useMemo(
    () => drivers?.filter((d) => !currentDriverIds.has(d.driver_id)),
    [drivers, currentDriverIds],
  )

  const [tab, setTab] = useState<"current" | "past">("current")
  const hasResults = drivers && drivers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse current and past Formula 1 drivers.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drivers..."
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
        <select
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className="rounded-xl border border-border/50 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Nationalities</option>
          {nationalities?.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 rounded-xl bg-secondary/60 p-1 w-fit">
        <button
          onClick={() => setTab("current")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-xs font-medium transition-all",
            tab === "current" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Current ({currentDrivers.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-xs font-medium transition-all",
            tab === "past" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Past ({pastDrivers?.length ?? 0})
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}

      {hasResults && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {(tab === "current" ? currentDrivers : pastDrivers).map((driver) => (
            <Link key={driver.id} to={`/drivers/${driver.driver_id}`}>
              <Card className="h-full group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-border/30 group-hover:ring-border/60 transition-all">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-heading text-lg font-bold text-muted-foreground">
                        {driver.given_name[0]}{driver.family_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {driver.family_name.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {driver.given_name}
                    </p>
                  </div>
                  {driver.nationality && (
                    <div className="flex items-center gap-1">
                      {getFlagUrl(driver.nationality) && (
                        <img src={getFlagUrl(driver.nationality)!} alt="" className="w-3.5 h-3 object-cover rounded-none" />
                      )}
                      <span className="text-[10px] text-muted-foreground">{driver.nationality}</span>
                    </div>
                  )}
                  {driver.code && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {driver.code}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {drivers?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No drivers found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
