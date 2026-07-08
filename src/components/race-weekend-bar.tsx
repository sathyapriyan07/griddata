import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { getFlagUrl } from "@/lib/nationalityFlags"
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

  if (!nextRace) return null

  const now = new Date()
  const raceDate = new Date(nextRace.date)
  const diffMs = raceDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isThisWeek = diffDays >= 0 && diffDays <= 7

  return (
    <Link
      to={`/races/${nextRace.id}`}
      className="block border-b bg-gradient-to-r from-f1-red/5 via-transparent to-transparent hover:from-f1-red/10 transition-colors"
    >
      <div className="mx-auto flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 max-w-7xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-f1-red shrink-0">
            {diffDays > 0 ? "Next Race" : "Race Weekend"}
          </span>
          {getFlagUrl(nextRace.circuits.country) && (
            <img
              src={getFlagUrl(nextRace.circuits.country)!}
              alt={nextRace.circuits.country}
              className="w-5 h-4 object-cover rounded-sm shrink-0"
            />
          )}
          <span className="font-heading uppercase tracking-wide text-sm sm:text-base truncate">
            {nextRace.name}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden xs:inline">
            {raceDate.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          {isThisWeek && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-f1-red/10 px-2.5 py-1 text-[11px] font-medium text-f1-red whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-f1-red animate-pulse" />
              This weekend
            </span>
          )}
          <span className="text-xs text-f1-red font-semibold hidden sm:inline">
            Details →
          </span>
        </div>
      </div>
    </Link>
  )
}
