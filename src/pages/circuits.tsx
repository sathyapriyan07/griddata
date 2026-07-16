import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, X, MapPin } from "lucide-react"
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
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide text-text-primary">Circuits</h1>
          <p className="text-sm text-text-secondary mt-1">All circuits used in Formula 1 history.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search circuits..."
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

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-tertiary/50 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && circuits && circuits.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Circuit</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Length</TableHead>
                    <TableHead className="text-center">Turns</TableHead>
                    <TableHead className="text-center">First GP</TableHead>
                    <TableHead>Direction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {circuits.map((circuit) => (
                    <TableRow key={circuit.id}>
                      <TableCell>
                        <Link to={`/circuits/${circuit.circuit_id}`} className="inline-flex items-center gap-2.5 hover:text-accent-red transition-colors">
                          {circuit.image_url ? (
                            <img src={circuit.image_url} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-tertiary flex items-center justify-center shrink-0">
                              <MapPin className="h-4 w-4 text-text-tertiary" />
                            </div>
                          )}
                          <span className="font-medium text-text-primary">{circuit.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">{circuit.location ?? "—"}</TableCell>
                      <TableCell className="text-text-secondary text-sm">{circuit.country ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-text-secondary text-sm">{circuit.length_km != null ? `${circuit.length_km.toFixed(3)} km` : "—"}</TableCell>
                      <TableCell className="text-center font-mono text-text-secondary text-sm">{circuit.turns ?? "—"}</TableCell>
                      <TableCell className="text-center font-mono text-text-secondary text-sm">{circuit.first_gp_year ?? "—"}</TableCell>
                      <TableCell className="text-text-secondary text-xs capitalize">{circuit.direction ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {circuits?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <MapPin className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">No circuits found.</p>
        </div>
      )}
    </div>
  )
}
