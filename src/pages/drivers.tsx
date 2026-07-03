import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import type { Driver } from "@/types/database"

export default function DriversPage() {
  const [search, setSearch] = useState("")
  const [nationality, setNationality] = useState<string>("")

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers", search, nationality],
    queryFn: async () => {
      let query = supabase.from("drivers").select("*").order("family_name", { ascending: true }).limit(100)

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
      const { data } = await supabase
        .from("drivers")
        .select("nationality")
        .not("nationality", "is", null)
        .order("nationality")
      return [...new Set(data?.map((d) => d.nationality) ?? [])] as string[]
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">
            All Formula 1 drivers across history.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {drivers?.map((driver) => (
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

      {drivers?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No drivers found matching your criteria.
        </div>
      )}
    </div>
  )
}
