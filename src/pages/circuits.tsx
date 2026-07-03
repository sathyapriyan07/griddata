import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Circuits</h1>
          <p className="text-muted-foreground">All circuits used in Formula 1 history.</p>
        </div>
        <input
          type="text"
          placeholder="Search circuits..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm bg-background"
        />
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading circuits...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {circuits?.map((circuit) => (
          <Link key={circuit.id} to={`/circuits/${circuit.circuit_id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">{circuit.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{circuit.location}, {circuit.country}</p>
                  {circuit.length_km && <p>Length: {circuit.length_km.toFixed(3)} km</p>}
                  {circuit.turns && <p>Turns: {circuit.turns}</p>}
                </div>
                <div className="flex gap-2 mt-2">
                  {circuit.first_gp_year && (
                    <Badge variant="secondary">First GP: {circuit.first_gp_year}</Badge>
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
