import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Flag,
  Users,
  Building2,
  MapPin,
  Trophy,
  Swords,
  ArrowRight,
  Calendar,
  Clock,
} from "lucide-react"

export default function HomePage() {
  const { data: latestSeason } = useQuery({
    queryKey: ["home-latest-season"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle()
      return data as { year: number } | null
    },
  })

  const currentSeason = latestSeason?.year ?? 2025

  const { data: recentRaces } = useQuery({
    queryKey: ["home-recent-races"],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*")
        .lte("date", new Date().toISOString().substring(0, 10))
        .order("date", { ascending: false })
        .limit(5)
      return data as { id: string; name: string; season_year: number; round: number; date: string }[] | null
    },
  })

  const { data: nextRace } = useQuery({
    queryKey: ["home-next-race"],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("*")
        .gte("date", new Date().toISOString().substring(0, 10))
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle()
      return data as { id: string; name: string; season_year: number; round: number; date: string } | null
    },
  })

  const { data: driverLeaders } = useQuery({
    queryKey: ["home-driver-leaders", currentSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("driver_standings")
        .select("*, driver:drivers(*)")
        .eq("season_year", currentSeason)
        .order("points", { ascending: false, nullsFirst: false })
      if (!data) return []
      const grouped = new Map<string, { position: number | null; points: number; wins: number; driver: { given_name: string; family_name: string; driver_id: string } }>()
      for (const s of data as { position: number | null; points: number; wins: number; driver: { given_name: string; family_name: string; driver_id: string } }[]) {
        const existing = grouped.get(s.driver.driver_id)
        if (!existing || s.points > existing.points) grouped.set(s.driver.driver_id, s)
      }
      return [...grouped.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    },
    enabled: !!latestSeason,
  })

  const { data: constructorLeaders } = useQuery({
    queryKey: ["home-constructor-leaders", currentSeason],
    queryFn: async () => {
      const { data } = await supabase
        .from("constructor_standings")
        .select("*, constructor:constructors(*)")
        .eq("season_year", currentSeason)
        .order("points", { ascending: false, nullsFirst: false })
      if (!data) return []
      const grouped = new Map<string, { position: number | null; points: number; constructor: { name: string; constructor_id: string } }>()
      for (const s of data as { position: number | null; points: number; constructor: { name: string; constructor_id: string } }[]) {
        const existing = grouped.get(s.constructor.constructor_id)
        if (!existing || s.points > existing.points) grouped.set(s.constructor.constructor_id, s)
      }
      return [...grouped.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    },
    enabled: !!latestSeason,
  })

  const { data: latestResult } = useQuery({
    queryKey: ["home-latest-result", recentRaces?.[0]?.id],
    queryFn: async () => {
      if (!recentRaces?.[0]?.id) return null
      const { data } = await supabase
        .from("race_results")
        .select("position, driver:drivers(given_name, family_name, driver_id)")
        .eq("race_id", recentRaces[0].id)
        .eq("position", 1)
        .maybeSingle()
      return data as { position: number | null; driver: { given_name: string; family_name: string; driver_id: string } } | null
    },
    enabled: !!recentRaces?.[0]?.id,
  })

  const quickLinks = [
    { href: "/races", label: "Races", icon: Flag, desc: "Browse every Grand Prix" },
    { href: "/drivers", label: "Drivers", icon: Users, desc: "Driver profiles & stats" },
    { href: "/constructors", label: "Teams", icon: Building2, desc: "Constructor history" },
    { href: "/circuits", label: "Circuits", icon: MapPin, desc: "Circuit guides" },
    { href: "/standings", label: "Standings", icon: Trophy, desc: "Championship tables" },
    { href: "/rivalry", label: "Rivalry", icon: Swords, desc: "Head-to-head analysis" },
  ]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-secondary via-background to-background min-h-[280px] sm:min-h-[320px] flex items-center">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="relative z-10 p-6 sm:p-10 w-full">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 text-xs font-heading tracking-wider uppercase">
              {currentSeason} Season
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading uppercase tracking-tight leading-none mb-3">
              Formula 1<br />
              <span className="text-red-600">Database & Statistics</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-6">
              Explore every aspect of Formula 1 — from historical seasons to modern race weekends.
            </p>
            <div className="flex flex-wrap gap-3">
              {nextRace && (
                <Link
                  to={`/races/${nextRace.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Calendar className="h-4 w-4" />
                  Next: {nextRace.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/standings"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <Trophy className="h-4 w-4" />
                {currentSeason} Standings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestResult && recentRaces?.[0] && (
          <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-heading">
                  Latest Winner
                </span>
                <span className="text-[10px] text-muted-foreground">Round {recentRaces[0].round}</span>
              </div>
              <p className="text-lg font-semibold">{recentRaces[0].name}</p>
              <Link
                to={`/drivers/${latestResult.driver.driver_id}`}
                className="text-sm text-red-600 hover:text-red-500 transition-colors font-medium"
              >
                {latestResult.driver.given_name} {latestResult.driver.family_name}
              </Link>
              <Link
                to={`/races/${recentRaces[0].id}`}
                className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View race details <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        )}

        {driverLeaders && driverLeaders.length > 0 && (
          <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-600" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-heading">
                  Drivers' Championship
                </span>
                <Badge variant="outline" className="text-[10px]">{currentSeason}</Badge>
              </div>
              <div className="space-y-2">
                {driverLeaders.slice(0, 3).map((s, i) => (
                  <div key={s.driver.driver_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                        i === 0 ? "bg-yellow-500 text-black" :
                        i === 1 ? "bg-gray-300 text-black" :
                        i === 2 ? "bg-amber-700 text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {s.position ?? i + 1}
                      </span>
                      <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline truncate">
                        {s.driver.family_name.toUpperCase()}
                      </Link>
                    </div>
                    <span className="font-semibold tabular-nums text-sm">{s.points}</span>
                  </div>
                ))}
              </div>
              <Link to="/standings" className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Full standings <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        )}

        {constructorLeaders && constructorLeaders.length > 0 && (
          <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-heading">
                  Constructors' Championship
                </span>
                <Badge variant="outline" className="text-[10px]">{currentSeason}</Badge>
              </div>
              <div className="space-y-2">
                {constructorLeaders.slice(0, 3).map((s, i) => (
                  <div key={s.constructor.constructor_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                        i === 0 ? "bg-yellow-500 text-black" :
                        i === 1 ? "bg-gray-300 text-black" :
                        i === 2 ? "bg-amber-700 text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {s.position ?? i + 1}
                      </span>
                      <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline truncate">
                        {s.constructor.name}
                      </Link>
                    </div>
                    <span className="font-semibold tabular-nums text-sm">{s.points}</span>
                  </div>
                ))}
              </div>
              <Link to="/standings" className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Full standings <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {nextRace && (
        <Card className="relative overflow-hidden border-dashed border-border/60">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
          <CardContent className="p-5 sm:p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary shrink-0">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-heading">
                    Up Next
                  </p>
                  <p className="text-lg sm:text-xl font-semibold mt-0.5">{nextRace.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Round {nextRace.round} &middot; {new Date(nextRace.date).toLocaleDateString(undefined, {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Link
                to={`/races/${nextRace.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                Race Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-heading uppercase tracking-wider mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                to={link.href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card p-4 sm:p-5 text-center hover:border-border hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary group-hover:bg-secondary/80 transition-colors">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{link.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}
