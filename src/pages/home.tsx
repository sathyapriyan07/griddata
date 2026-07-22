import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import {
  Flag,
  Users,
  Building2,
  MapPin,
  Trophy,
  Swords,
  ArrowRight,
  Calendar,
  ChevronRight,
} from "lucide-react"

function Countdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 })

  useEffect(() => {
    function tick() {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0 })
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      })
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (timeLeft.days === 0 && timeLeft.hours === 0) return null

  return (
    <div className="flex items-center gap-4">
      {[
        { value: timeLeft.days, label: "Days" },
        { value: timeLeft.hours, label: "Hrs" },
        { value: timeLeft.minutes, label: "Min" },
      ].map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="text-2xl lg:text-3xl font-mono font-bold text-text-primary leading-none tabular-nums">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="text-[0.5rem] uppercase tracking-[0.15em] text-text-tertiary mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  )
}

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

  const nextRaceDate = nextRace ? new Date(nextRace.date) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
      className="space-y-10 lg:space-y-12"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[300px] lg:min-h-[360px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(3,95%,46%) 0%, transparent 40%)`
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)`
        }} />
        <div className="relative z-10 w-full p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <Badge variant="brand" className="mb-5">
                {currentSeason} Season
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary">
                Formula 1
              </h1>
              <p className="text-lg text-text-secondary mt-4 max-w-lg leading-relaxed">
                Database & Statistics — explore every Grand Prix, driver, circuit, and championship moment.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {nextRace && (
                  <Link
                    to={`/races/${nextRace.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent-red text-white px-5 py-2.5 text-sm font-medium hover:brightness-110 transition-all duration-150 active:scale-[0.97]"
                  >
                    <Calendar className="h-4 w-4" />
                    Next: {nextRace.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  to="/standings"
                  className="inline-flex items-center gap-2 rounded-lg border border-default bg-transparent text-text-primary px-5 py-2.5 text-sm font-medium hover:bg-tertiary transition-all duration-150"
                >
                  <Trophy className="h-4 w-4" />
                  {currentSeason} Standings
                </Link>
              </div>
            </div>
            {nextRaceDate && (
              <div className="flex-shrink-0 bg-bg-secondary/80 backdrop-blur-xl rounded-2xl border border-default p-6 lg:p-8">
                <div className="text-[0.6rem] uppercase tracking-[0.15em] text-text-tertiary font-semibold mb-3">
                  {nextRaceDate > new Date() ? "Next Race" : "Race Weekend"}
                </div>
                <div className="font-heading text-base font-bold uppercase tracking-wide text-text-primary mb-4">
                  {nextRace?.name}
                </div>
                <Countdown targetDate={nextRaceDate} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {latestResult && recentRaces?.[0] && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                    Latest Winner
                  </span>
                  <Badge variant="default">Round {recentRaces[0].round}</Badge>
                </div>
                <p className="font-heading text-lg font-bold uppercase tracking-wide text-text-primary mb-1">
                  {recentRaces[0].name}
                </p>
                <Link
                  to={`/drivers/${latestResult.driver.driver_id}`}
                  className="text-sm text-accent-red hover:text-accent-red/80 transition-colors font-medium"
                >
                  {latestResult.driver.given_name} {latestResult.driver.family_name}
                </Link>
                <Link
                  to={`/races/${recentRaces[0].id}`}
                  className="flex items-center gap-1 mt-auto pt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  View race details <ChevronRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {driverLeaders && driverLeaders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                    Drivers' Championship
                  </span>
                  <Badge variant="default">{currentSeason}</Badge>
                </div>
                <div className="space-y-3 flex-1">
                  {driverLeaders.slice(0, 3).map((s, i) => (
                    <div key={s.driver.driver_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-[0.6rem] font-bold shrink-0",
                          i === 0 ? "bg-yellow-500 text-black" :
                          i === 1 ? "bg-zinc-400 text-black" :
                          "bg-amber-700 text-white"
                        )}>
                          {s.position ?? i + 1}
                        </span>
                        <Link
                          to={`/drivers/${s.driver.driver_id}`}
                          className="font-heading text-sm font-bold uppercase tracking-wide text-text-primary hover:text-accent-red transition-colors truncate"
                        >
                          {s.driver.family_name.toUpperCase()}
                        </Link>
                      </div>
                      <span className="font-mono font-bold text-sm text-text-primary tabular-nums">{s.points}</span>
                    </div>
                  ))}
                </div>
                <Link to="/standings" className="flex items-center gap-1 mt-auto pt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                  Full standings <ChevronRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {constructorLeaders && constructorLeaders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                    Constructors' Championship
                  </span>
                  <Badge variant="default">{currentSeason}</Badge>
                </div>
                <div className="space-y-3 flex-1">
                  {constructorLeaders.slice(0, 3).map((s, i) => (
                    <div key={s.constructor.constructor_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-[0.6rem] font-bold shrink-0",
                          i === 0 ? "bg-yellow-500 text-black" :
                          i === 1 ? "bg-zinc-400 text-black" :
                          "bg-amber-700 text-white"
                        )}>
                          {s.position ?? i + 1}
                        </span>
                        <Link
                          to={`/constructors/${s.constructor.constructor_id}`}
                          className="font-heading text-sm font-bold uppercase tracking-wide text-text-primary hover:text-accent-red transition-colors truncate"
                        >
                          {s.constructor.name}
                        </Link>
                      </div>
                      <span className="font-mono font-bold text-sm text-text-primary tabular-nums">{s.points}</span>
                    </div>
                  ))}
                </div>
                <Link to="/standings" className="flex items-center gap-1 mt-auto pt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                  Full standings <ChevronRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-text-tertiary">Quick Navigation</span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((link, i) => {
            const Icon = link.icon
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              >
                <Link
                  to={link.href}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-default bg-bg-secondary/80 backdrop-blur-xl p-6 text-center hover:border-strong hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-tertiary group-hover:bg-elevated transition-colors">
                    <Icon className="h-5 w-5 text-text-secondary group-hover:text-accent-red transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-bold uppercase tracking-wide text-text-primary">{link.label}</p>
                    <p className="text-[0.65rem] text-text-tertiary mt-1 hidden sm:block">{link.desc}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
