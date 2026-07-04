import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const hasResults = drivers && drivers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">
            Browse current and past Formula 1 drivers.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          />
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          >
            <option value="">All Nationalities</option>
            {nationalities?.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading drivers...</div>
      )}

      {hasResults && (
        <Tabs defaultValue="current">
          <div className="overflow-x-auto hide-scrollbar">
            <TabsList className="inline-flex w-max min-w-full">
              <TabsTrigger value="current">
                Current Drivers
                {currentDrivers && <span className="ml-1.5 text-xs">({currentDrivers.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="past">
                Past Drivers
                {pastDrivers && <span className="ml-1.5 text-xs">({pastDrivers.length})</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="current" className="mt-6">
            {currentDrivers && currentDrivers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentDrivers.map((driver) => (
                  <Link key={driver.id} to={`/drivers/${driver.driver_id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <Avatar
                          src={driver.photo_url ?? undefined}
                          alt={`${driver.given_name} ${driver.family_name}`}
                          fallback={`${driver.given_name[0]}${driver.family_name[0]}`}
                        />
                        <div>
                          <CardTitle className="text-base">
                            {driver.given_name} {driver.family_name}
                          </CardTitle>
                          {driver.nationality && (
                            <Badge variant="secondary" className="mt-1">
                              {driver.nationality}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {driver.dob && (
                          <p className="text-sm text-muted-foreground">
                            Born: {new Date(driver.dob).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No current drivers match your criteria.
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastDrivers && pastDrivers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pastDrivers.map((driver) => (
                  <Link key={driver.id} to={`/drivers/${driver.driver_id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <Avatar
                          src={driver.photo_url ?? undefined}
                          alt={`${driver.given_name} ${driver.family_name}`}
                          fallback={`${driver.given_name[0]}${driver.family_name[0]}`}
                        />
                        <div>
                          <CardTitle className="text-base">
                            {driver.given_name} {driver.family_name}
                          </CardTitle>
                          {driver.nationality && (
                            <Badge variant="secondary" className="mt-1">
                              {driver.nationality}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {driver.dob && (
                          <p className="text-sm text-muted-foreground">
                            Born: {new Date(driver.dob).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No past drivers match your criteria.
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {drivers?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No drivers found matching your criteria.
        </div>
      )}
    </div>
  )
}
