import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Race, Circuit } from "@/types/database"

export function RaceWeekendBar() {
  const { data: latestSeason } = useQuery({
    queryKey: ["rwb-latest-season"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("year")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle()
      return data as { year: number } | null
    },
  })

  const currentSeason = latestSeason?.year ?? 2025

  const { data: nextRace } = useQuery({
    queryKey: ["rwb-next-race", currentSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*, circuits!inner(*)")
        .gte("date", new Date().toISOString().substring(0, 10))
        .eq("season_year", currentSeason)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle()
      return data as (Race & { circuits: Circuit }) | null
    },
  })

  const { data: nationalityFlagsArray } = useQuery({
    queryKey: ["rwb-nationality-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nationality_flags")
        .select("nationality, flag_url")
      return (data ?? []) as { nationality: string; flag_url: string }[]
    },
  })

  const nationalityFlags = new Map<string, string>()
  nationalityFlagsArray?.forEach((f) => nationalityFlags.set(f.nationality, f.flag_url))

  if (!nextRace) return null

  const now = new Date()
  const raceDate = new Date(nextRace.date)
  const diffMs = raceDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isThisWeek = diffDays >= 0 && diffDays <= 7

  return (
    <div className="border-b bg-accent/40">
      <div className="container mx-auto flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {diffDays > 0 ? "Next Race" : "Race Weekend"}
          </span>
          {nationalityFlags.get(nextRace.circuits.country) && (
            <img
              src={nationalityFlags.get(nextRace.circuits.country)!}
              alt={nextRace.circuits.country}
              className="w-5 h-4 object-cover rounded-sm"
            />
          )}
          <Link
            to={`/races/${nextRace.id}`}
            className="font-medium hover:underline"
          >
            {nextRace.name}
          </Link>

        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {raceDate.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          {isThisWeek && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              This weekend
            </span>
          )}
          <Link
            to={`/races/${nextRace.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  )
}
