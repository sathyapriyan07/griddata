import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Search, X, MapPin, Ruler, CornerDownRight } from "lucide-react"
import type { Circuit } from "@/types/database"

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
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

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {circuits?.map((circuit) => (
          <motion.div key={circuit.id} variants={itemVariants}>
            <Link to={`/circuits/${circuit.circuit_id}`} className="block h-full">
              <Card className="relative overflow-hidden h-full group">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red/40" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {circuit.image_url ? (
                      <img src={circuit.image_url} alt="" className="w-14 h-14 object-contain rounded-xl shrink-0 bg-tertiary p-1.5 border border-default" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-tertiary flex items-center justify-center shrink-0 border border-default">
                        <MapPin className="h-5 w-5 text-text-tertiary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading uppercase tracking-wide text-sm font-bold text-text-primary truncate">{circuit.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{circuit.location}, {circuit.country}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {circuit.length_km && (
                          <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Ruler className="h-3 w-3" />
                            {circuit.length_km.toFixed(3)} km
                          </div>
                        )}
                        {circuit.turns && (
                          <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
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
          </motion.div>
        ))}
      </motion.div>

      {circuits?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <MapPin className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">No circuits found.</p>
        </div>
      )}
    </motion.div>
  )
}
