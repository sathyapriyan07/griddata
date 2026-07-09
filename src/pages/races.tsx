import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Calendar, CheckCircle2, Clock, Trophy, ChevronRight } from "lucide-react"
import type { Race, Season } from "@/types/database"

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

export default function RacesPage() {
  const { data: seasons } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false })
        .limit(10)
      return (data ?? []) as Season[]
    },
  })

  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear())

  useEffect(() => {
    if (seasons?.[0]?.year) {
      setSelectedSeason(seasons[0].year)
    }
  }, [seasons])

  const { data: races, isLoading } = useQuery({
    queryKey: ["races", selectedSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*, circuits!inner(country)")
        .eq("season_year", selectedSeason)
        .order("round", { ascending: true })
      return (data ?? []) as (Race & { circuits: { country: string } })[]
    },
  })

  const completedRaceIds = useMemo(() => {
    return races?.filter((r) => new Date(r.date) < new Date()).map((r) => r.id) ?? []
  }, [races])

  const { data: podiumResults } = useQuery({
    queryKey: ["races-podium", selectedSeason, completedRaceIds.join(",")],
    queryFn: async () => {
      if (completedRaceIds.length === 0) return []
      const { data } = await supabase
        .from("race_results")
        .select("race_id, driver:drivers(driver_id, given_name, family_name, nationality), constructor:constructors(name)")
        .in("race_id", completedRaceIds)
        .in("position", [1, 2, 3])
        .order("position", { ascending: true })
      return (data ?? []) as { race_id: string; driver: { driver_id: string; given_name: string; family_name: string; nationality: string | null }; constructor: { name: string } }[]
    },
    enabled: completedRaceIds.length > 0,
  })

  const podiumMap = useMemo(() => {
    const map = new Map<string, { driver: { driver_id: string; given_name: string; family_name: string; nationality: string | null }; constructor: { name: string } }[]>()
    podiumResults?.forEach((r) => {
      const arr = map.get(r.race_id) ?? []
      arr.push(r)
      map.set(r.race_id, arr)
    })
    return map
  }, [podiumResults])

  const now = new Date()
  const upcoming = races?.filter((r) => new Date(r.date) >= now) ?? []
  const completed = races?.filter((r) => new Date(r.date) < now) ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-wide text-text-primary">Races</h1>
          <p className="text-sm text-text-secondary mt-1">Browse Formula 1 races by season.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {seasons?.map((s) => (
            <button
              key={s.year}
              onClick={() => setSelectedSeason(s.year)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                selectedSeason === s.year
                  ? "bg-accent-red text-white shadow-sm"
                  : "bg-tertiary text-text-secondary hover:text-text-primary"
              )}
            >
              {s.year}
            </button>
          ))}
          {(!seasons || seasons.length === 0) && (
            <span className="text-xs text-text-secondary px-2 py-1.5">
              {new Date().getFullYear()}
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-tertiary/50 animate-pulse" />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-accent-red" />
            <h2 className="text-sm font-heading uppercase tracking-wider text-text-secondary">
              Upcoming ({upcoming.length})
            </h2>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {upcoming.map((race) => (
              <motion.div key={race.id} variants={itemVariants}>
                <Link to={`/races/${race.id}`} className="block h-full">
                  <Card className="relative overflow-hidden h-full border-dashed border-default hover:border-strong transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red/60" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFlagUrl(race.circuits.country) && (
                            <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-5 h-4 object-cover rounded-sm shrink-0" />
                          )}
                          <span className="font-heading uppercase tracking-wide text-sm font-bold text-text-primary truncate">
                            {race.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          R{race.round}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Calendar className="h-3 w-3" />
                        {new Date(race.date).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-heading uppercase tracking-wider text-text-secondary">
              Completed ({completed.length})
            </h2>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {completed.map((race) => (
              <motion.div key={race.id} variants={itemVariants}>
                <Link to={`/races/${race.id}`} className="block h-full">
                  <Card className="relative overflow-hidden h-full group hover:border-strong transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500/60" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFlagUrl(race.circuits.country) && (
                            <img src={getFlagUrl(race.circuits.country)!} alt={race.circuits.country} className="w-5 h-4 object-cover rounded-sm shrink-0" />
                          )}
                          <span className="font-heading uppercase tracking-wide text-sm font-bold text-text-primary truncate">
                            {race.name}
                          </span>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          R{race.round}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-3">
                        <Calendar className="h-3 w-3" />
                        {new Date(race.date).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </div>
                      {podiumMap.get(race.id) && (
                        <div className="flex items-center gap-2 pt-3 border-t border-subtle">
                          <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />
                          {podiumMap.get(race.id)!.map((r, i) => (
                            <div key={r.driver.driver_id} className="flex items-center gap-1 text-[11px]">
                              <span className={cn(
                                "font-heading text-xs font-bold",
                                i === 0 ? "text-yellow-500" : i === 1 ? "text-zinc-400" : "text-amber-700"
                              )}>
                                P{i + 1}
                              </span>
                              {getFlagUrl(r.driver.nationality) && (
                                <img src={getFlagUrl(r.driver.nationality)!} alt="" className="w-3 h-2 object-cover" />
                              )}
                              <span className="text-text-secondary truncate max-w-[80px]">
                                {r.driver.family_name.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-3 text-[0.6rem] font-medium uppercase tracking-wider text-text-tertiary group-hover:text-text-secondary transition-colors">
                        View details <ChevronRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {races?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No races found for {selectedSeason}.</p>
        </div>
      )}
    </motion.div>
  )
}
