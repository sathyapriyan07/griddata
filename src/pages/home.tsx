import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { PositionBadge } from "@/components/shared/position-badge"
import { Flag, Trophy, Users, Building2, Globe, Swords } from "lucide-react"

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
      const grouped = new Map<string, any>()
      for (const s of data as any[]) {
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
      const grouped = new Map<string, any>()
      for (const s of data as any[]) {
        const existing = grouped.get(s.constructor.constructor_id)
        if (!existing || s.points > existing.points) grouped.set(s.constructor.constructor_id, s)
      }
      return [...grouped.values()].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    },
    enabled: !!latestSeason,
  })

  const navCards = [
    { to: "/races", label: "Races", icon: Flag, desc: "Results, qualifying, practice & pit stops across every season." },
    { to: "/drivers", label: "Drivers", icon: Users, desc: "Career profiles, stats, teammate comparisons & rivalries." },
    { to: "/constructors", label: "Teams", icon: Building2, desc: "Team histories, standings, driver rosters & analytics." },
    { to: "/circuits", label: "Circuits", icon: Globe, desc: "Track specs, lap records, winner history & stats." },
    { to: "/standings", label: "Standings", icon: Trophy, desc: "Driver & constructor championships with progression." },
    { to: "/rivalry", label: "Rivalry", icon: Swords, desc: "Head-to-head comparisons and battle analysis." },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-f1-red/10 via-background to-background border p-5 sm:p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-f1-red text-xs font-semibold uppercase tracking-widest mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-f1-red animate-pulse" />
            {currentSeason} Season
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wide text-foreground leading-tight">
            Formula 1
            <br />
            <span className="text-f1-red">Database & Statistics</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
            Explore every aspect of Formula 1 — from historical seasons to modern race weekends.
          </p>
        </div>
      </section>

      {/* Championship Leaders - Big Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {driverLeaders?.[0] && (
          <StatCard
            label={`${currentSeason} Driver Champion`}
            value={driverLeaders[0].points}
            icon={<Trophy className="h-4 w-4 text-f1-red" />}
            size="lg"
            className="col-span-2 sm:col-span-1"
          />
        )}
        {constructorLeaders?.[0] && (
          <StatCard
            label={`${currentSeason} Team Champion`}
            value={constructorLeaders[0].points}
            icon={<Trophy className="h-4 w-4 text-f1-red" />}
            size="lg"
            className="col-span-2 sm:col-span-1"
          />
        )}
      </div>

      {/* Top 3 Leaders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {driverLeaders && driverLeaders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-f1-red text-sm">Drivers' Championship</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driverLeaders.slice(0, 3).map((s, i) => (
                  <Link
                    key={s.driver.driver_id}
                    to={`/drivers/${s.driver.driver_id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors -mx-2"
                  >
                    <PositionBadge position={s.position ?? i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.driver.given_name} {s.driver.family_name}
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{s.points} pts</span>
                  </Link>
                ))}
              </div>
              <Link to="/standings" className="inline-block mt-3 text-xs text-f1-red font-semibold hover:underline">
                Full standings →
              </Link>
            </CardContent>
          </Card>
        )}

        {constructorLeaders && constructorLeaders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-f1-red text-sm">Constructors' Championship</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {constructorLeaders.slice(0, 3).map((s, i) => (
                  <Link
                    key={s.constructor.constructor_id}
                    to={`/constructors/${s.constructor.constructor_id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors -mx-2"
                  >
                    <PositionBadge position={s.position ?? i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.constructor.name}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{s.points} pts</span>
                  </Link>
                ))}
              </div>
              <Link to="/standings" className="inline-block mt-3 text-xs text-f1-red font-semibold hover:underline">
                Full standings →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Race Banner */}
      {nextRace && (
        <Link to={`/races/${nextRace.id}`} className="block">
          <Card accent className="hover:bg-card/80 transition-colors">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-f1-red font-semibold uppercase tracking-widest">Next Race</p>
                <p className="font-heading text-lg sm:text-xl uppercase tracking-wide mt-1">{nextRace.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Round {nextRace.round} · {new Date(nextRace.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <span className="text-f1-red text-sm font-semibold shrink-0">View →</span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Navigation Grid */}
      <div>
        <h2 className="font-heading text-lg uppercase tracking-wide text-foreground mb-4">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {navCards.map((nav) => (
            <Link key={nav.to} to={nav.to}>
              <Card className="h-full hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <nav.icon className="h-4 w-4 text-f1-red" />
                    {nav.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-muted-foreground">{nav.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
