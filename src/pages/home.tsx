import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    queryKey: ["home-driver-leaders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("driver_standings")
        .select("*, driver:drivers(*)")
        .eq("season_year", currentSeason)
        .order("position", { ascending: true, nullsFirst: false })
        .limit(3)
      return (data ?? []) as { position: number | null; points: number; wins: number; driver: { given_name: string; family_name: string; driver_id: string } }[]
    },
  })

  const { data: constructorLeaders } = useQuery({
    queryKey: ["home-constructor-leaders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("constructor_standings")
        .select("*, constructor:constructors(*)")
        .eq("season_year", currentSeason)
        .order("position", { ascending: true, nullsFirst: false })
        .limit(3)
      return (data ?? []) as { position: number | null; points: number; constructor: { name: string; constructor_id: string } }[]
    },
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

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Formula 1 Database & Statistics
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore every aspect of Formula 1 — from historical seasons to modern race weekends.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {latestResult && recentRaces?.[0] && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest Race Winner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{recentRaces[0].name}</p>
              <p className="text-sm text-muted-foreground">
                Round {recentRaces[0].round} · {recentRaces[0].season_year}
              </p>
              <Link
                to={`/drivers/${latestResult.driver.driver_id}`}
                className="inline-block mt-2 text-primary hover:underline font-medium"
              >
                {latestResult.driver.given_name} {latestResult.driver.family_name}
              </Link>
              <Link
                to={`/races/${recentRaces[0].id}`}
                className="block mt-1 text-xs text-muted-foreground hover:underline"
              >
                View race details →
              </Link>
            </CardContent>
          </Card>
        )}

        {driverLeaders && driverLeaders.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentSeason} Drivers' Championship
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {driverLeaders.map((s, i) => (
                  <div key={s.driver.driver_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={i === 0 ? "default" : "secondary"} className="w-6 justify-center">
                        {s.position ?? i + 1}
                      </Badge>
                      <Link to={`/drivers/${s.driver.driver_id}`} className="hover:underline font-medium">
                        {s.driver.given_name} {s.driver.family_name}
                      </Link>
                    </div>
                    <span className="font-semibold">{s.points} pts</span>
                  </div>
                ))}
              </div>
              <Link to="/standings" className="block mt-3 text-xs text-muted-foreground hover:underline">
                Full standings →
              </Link>
            </CardContent>
          </Card>
        )}

        {constructorLeaders && constructorLeaders.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentSeason} Constructors' Championship
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {constructorLeaders.map((s, i) => (
                  <div key={s.constructor.constructor_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={i === 0 ? "default" : "secondary"} className="w-6 justify-center">
                        {s.position ?? i + 1}
                      </Badge>
                      <Link to={`/constructors/${s.constructor.constructor_id}`} className="hover:underline font-medium">
                        {s.constructor.name}
                      </Link>
                    </div>
                    <span className="font-semibold">{s.points} pts</span>
                  </div>
                ))}
              </div>
              <Link to="/standings" className="block mt-3 text-xs text-muted-foreground hover:underline">
                Full standings →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {nextRace && (
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Next Race</p>
            <p className="text-2xl font-bold mt-1">{nextRace.name}</p>
            <p className="text-muted-foreground">
              Round {nextRace.round} · {new Date(nextRace.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <Link to={`/races/${nextRace.id}`} className="inline-block mt-2 text-sm text-primary hover:underline">
              Race details →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Races</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Browse race results, qualifying, practice sessions, and pit stop data across every season.
            </p>
            <Link to="/races" className="inline-block mt-3 text-sm text-primary hover:underline">
              Explore races →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Full career profiles with statistics, teammate comparisons, and rivalry analysis.
            </p>
            <Link to="/drivers" className="inline-block mt-3 text-sm text-primary hover:underline">
              Browse drivers →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Constructors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Team histories, constructor standings, driver rosters, and performance analytics.
            </p>
            <Link to="/constructors" className="inline-block mt-3 text-sm text-primary hover:underline">
              View teams →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Circuits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Circuit specifications, lap records, winner history, and race stats for every track.
            </p>
            <Link to="/circuits" className="inline-block mt-3 text-sm text-primary hover:underline">
              Explore circuits →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Championships</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Driver and constructor standings with season progression charts and battle analysis.
            </p>
            <Link to="/standings" className="inline-block mt-3 text-sm text-primary hover:underline">
              View standings →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Press <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">⌘K</kbd> to quickly find drivers, teams, circuits, and races.
            </p>
            <Link to="/drivers" className="inline-block mt-3 text-sm text-primary hover:underline">
              Get started →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
