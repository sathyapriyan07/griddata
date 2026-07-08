import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, X, MapPin, Ruler, CornerDownRight } from "lucide-react"
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide">Circuits</h1>
          <p className="text-sm text-muted-foreground mt-1">All circuits used in Formula 1 history.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search circuits..."
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

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {circuits?.map((circuit) => (
          <Link key={circuit.id} to={`/circuits/${circuit.circuit_id}`}>
            <Card className="h-full group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {circuit.image_url ? (
                    <img src={circuit.image_url} alt="" className="w-14 h-14 object-contain rounded-lg shrink-0 bg-secondary/30 p-1" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading uppercase tracking-wide text-sm truncate">{circuit.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{circuit.location}, {circuit.country}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {circuit.length_km && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Ruler className="h-3 w-3" />
                          {circuit.length_km.toFixed(3)} km
                        </div>
                      )}
                      {circuit.turns && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CornerDownRight className="h-3 w-3" />
                          {circuit.turns} turns
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {circuit.first_gp_year && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          Since {circuit.first_gp_year}
                        </Badge>
                      )}
                      {circuit.direction && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
                          {circuit.direction}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {circuits?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No circuits found.</p>
        </div>
      )}
    </div>
  )
}
