import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import type { Circuit } from "@/types/database"

export default function CircuitsPage() {
  const [search, setSearch] = useState("")

  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits", search],
    queryFn: async () => {
      let query = supabase.from("circuits").select("*").order("name", { ascending: true }).limit(100)
      if (search) {
        query = query.textSearch("search_vector", search, { type: "websearch" })
      }
      const { data } = await query
      return (data ?? []) as Circuit[]
    },
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl uppercase tracking-wide">Circuits</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">All circuits used in Formula 1 history.</p>
        </div>
      </div>

      {/* Sticky Search */}
      <div className="sticky top-12 sm:top-14 z-40 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/95 backdrop-blur-lg border-y">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search circuits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-surface pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-f1-red/50 transition-all"
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading circuits...</div>
      )}

      {/* Mobile: compact list | Desktop: grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {circuits?.map((circuit) => (
          <Link key={circuit.id} to={`/circuits/${circuit.circuit_id}`}>
            <Card className="h-full hover:bg-accent/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">{circuit.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {circuit.location}, {circuit.country}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {circuit.length_km && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {circuit.length_km.toFixed(3)} km
                    </span>
                  )}
                  {circuit.turns && (
                    <span className="text-[11px] text-muted-foreground">
                      · {circuit.turns} turns
                    </span>
                  )}
                  {circuit.first_gp_year && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      GP {circuit.first_gp_year}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {circuits?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No circuits found.</div>
      )}
    </div>
  )
}
