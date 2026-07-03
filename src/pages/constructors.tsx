import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Constructor } from "@/types/database"

export default function ConstructorsPage() {
  const [search, setSearch] = useState("")

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Constructors</h1>
          <p className="text-muted-foreground">All Formula 1 constructors across history.</p>
        </div>
        <input
          type="text"
          placeholder="Search constructors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm bg-background"
        />
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading constructors...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {constructors?.map((team) => (
          <Link key={team.id} to={`/constructors/${team.constructor_id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <div className="flex gap-2 mt-1">
                  {team.nationality && <Badge variant="secondary">{team.nationality}</Badge>}
                  {team.founded_year && <Badge variant="outline">Founded {team.founded_year}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {team.base && <p>Base: {team.base}</p>}
                  {team.principal && <p>Team Principal: {team.principal}</p>}
                  {team.engine_supplier && <p>Engine: {team.engine_supplier}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {constructors?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No constructors found.
        </div>
      )}
    </div>
  )
}
