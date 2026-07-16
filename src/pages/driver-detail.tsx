import { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { computeDriverCareerStats, computeDriverSeasonStats, detectMilestones, getStreaks } from "@/lib/stats"
import { getConstructorColorsFromRecord } from "@/lib/constructorColors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageSkeleton } from "@/components/loading-skeleton"
import { getFlagUrl } from "@/lib/nationalityFlags"
import type { Driver, DriverImage, DriverWikipedia, QualifyingResult, RaceResult, SprintResult } from "@/types/database"
import { Trophy, Medal, Flag, Zap, Target, BarChart3, Gauge, CalendarDays, Book, ExternalLink } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

function formatSeasonRange(seasons: number[]): string {
  if (seasons.length === 0) return ""
  if (seasons.length === 1) return String(seasons[0])
  const sorted = [...seasons].sort((a, b) => a - b)
  const consecutive = sorted.every((s, i) => i === 0 || s === sorted[i - 1] + 1)
  if (consecutive) return `${sorted[0]}-${String(sorted[sorted.length - 1]).slice(2)}`
  return sorted.join(", ")
}

export default function DriverDetailPage() {
  const { driverId } = useParams()
  const [resultYear, setResultYear] = useState<number | null>(null)

  const { data: driver } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("driver_id", driverId)
        .single()
      return data as Driver | null
    },
  })

  const { data: driverRecord } = useQuery({
    queryKey: ["driver-record", driverId],
    queryFn: async () => {
      if (!driverId) return null
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("driver_id", driverId)
        .single()
      return data as { id: string } | null
    },
    enabled: !!driverId,
  })

  const driverUuid = driverRecord?.id

  const { data: results } = useQuery({
    queryKey: ["driver-results-all", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("*, races!inner(season_year, round, name, date, circuit_id, distance_km, circuits!inner(name, country)), constructor:constructors!inner(name, logo_url, color_primary, color_secondary, color_accent)")
        .eq("driver_id", driverUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (RaceResult & { races: { season_year: number; round: number; name: string; date: string; circuit_id: string; distance_km: number | null; circuits: { name: string; country: string | null } }; constructor: { name: string; logo_url: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: sprints } = useQuery({
    queryKey: ["driver-sprints", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("*, races!inner(season_year, round, name, date)")
        .eq("driver_id", driverUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (SprintResult & { races: { season_year: number; round: number; name: string; date: string } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: qualifyingResults } = useQuery({
    queryKey: ["driver-qualifying-results", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("position, q1, q2, q3, races!inner(season_year, round, name, date)")
        .eq("driver_id", driverUuid)
        .order("races(date)", { ascending: false, nullsFirst: false })
      return (data ?? []) as (QualifyingResult & { races: { season_year: number; round: number; name: string; date: string } })[]
    },
    enabled: !!driverUuid,
  })

  const { data: teamRaceStats } = useQuery({
    queryKey: ["driver-team-race-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, points, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; points: number; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: teamQualiStats } = useQuery({
    queryKey: ["driver-team-quali-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("qualifying_results")
        .select("position, constructor_id, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; constructor_id: string; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: teamSprintStats } = useQuery({
    queryKey: ["driver-team-sprint-stats", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("sprint_results")
        .select("position, points, constructors!inner(constructor_id, name)")
        .eq("driver_id", driverUuid)
      return (data ?? []) as { position: number | null; points: number; constructors: { constructor_id: string; name: string } }[]
    },
    enabled: !!driverUuid,
  })

  const driverTeamRecords = (() => {
    const teams = new Map<string, { constructor_id: string; name: string; races: number; wins: number; podiums: number; points: number; poles: number; sprints: number; sprintWins: number; sprintPodiums: number; sprintPoints: number }>()
    for (const r of teamRaceStats ?? []) {
      const cid = r.constructors.constructor_id
      if (!teams.has(cid)) teams.set(cid, { constructor_id: cid, name: r.constructors.name, races: 0, wins: 0, podiums: 0, points: 0, poles: 0, sprints: 0, sprintWins: 0, sprintPodiums: 0, sprintPoints: 0 })
      const t = teams.get(cid)!
      t.races++
      if (r.position === 1) t.wins++
      if (r.position !== null && r.position <= 3) t.podiums++
      t.points += r.points
    }
    for (const q of teamQualiStats ?? []) {
      const cid = q.constructors.constructor_id
      if (teams.has(cid) && q.position === 1) teams.get(cid)!.poles++
    }
    for (const s of teamSprintStats ?? []) {
      const cid = s.constructors.constructor_id
      if (teams.has(cid)) {
        const t = teams.get(cid)!
        t.sprints++
        if (s.position === 1) t.sprintWins++
        if (s.position !== null && s.position <= 3) t.sprintPodiums++
        t.sprintPoints += s.points
      }
    }
    return [...teams.values()].sort((a, b) => b.wins - a.wins)
  })()

  const { data: teamSeasons } = useQuery({
    queryKey: ["driver-team-seasons", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("constructors!inner(id, name, constructor_id), races!inner(season_year)")
        .eq("driver_id", driverUuid)
      if (!data) return []
      const seen = new Set<string>()
      const out: { constructor_id: string; constructor_name: string; constructor_uuid: string; season_year: number }[] = []
      for (const r of data as unknown as { constructors: { id: string; name: string; constructor_id: string }; races: { season_year: number } }[]) {
        const key = `${r.constructors.constructor_id}|${r.races.season_year}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          constructor_id: r.constructors.constructor_id,
          constructor_name: r.constructors.name,
          constructor_uuid: r.constructors.id,
          season_year: r.races.season_year,
        })
      }
      return out.sort((a, b) => b.season_year - a.season_year)
    },
    enabled: !!driverUuid,
  })

  const { data: teammates } = useQuery({
    queryKey: ["driver-teammates", driverUuid],
    queryFn: async () => {
      if (!driverUuid || !teamSeasons || teamSeasons.length === 0) return []
      const constructorUuids = [...new Set(teamSeasons.map((ts) => ts.constructor_uuid))]
      const seasonYears = [...new Set(teamSeasons.map((ts) => ts.season_year))]
      const { data } = await supabase
        .from("race_results")
        .select("driver_id, constructor_id, races!inner(season_year), drivers!inner(id, driver_id, given_name, family_name, nationality)")
        .in("constructor_id", constructorUuids)
        .in("races.season_year", seasonYears)
        .neq("driver_id", driverUuid)
      if (!data) return []
      const teammateMap = new Map<string, { id: string; uuid: string; given_name: string; family_name: string; nationality: string | null; seasons: { constructor_id: string; constructor_name: string; season_year: number }[] }>()
      for (const r of data as unknown as { driver_id: string; constructor_id: string; races: { season_year: number }; drivers: { id: string; driver_id: string; given_name: string; family_name: string; nationality: string | null } }[]) {
        const ts = teamSeasons.find((t) => t.constructor_uuid === r.constructor_id && t.season_year === r.races.season_year)
        if (!ts) continue
        if (!teammateMap.has(r.driver_id)) {
          teammateMap.set(r.driver_id, {
            id: r.drivers.driver_id,
            uuid: r.drivers.id,
            given_name: r.drivers.given_name,
            family_name: r.drivers.family_name,
            nationality: r.drivers.nationality,
            seasons: [],
          })
        }
        const entry = teammateMap.get(r.driver_id)!
        if (!entry.seasons.some((s) => s.constructor_id === ts.constructor_id && s.season_year === ts.season_year)) {
          entry.seasons.push({ constructor_id: ts.constructor_id, constructor_name: ts.constructor_name, season_year: ts.season_year })
        }
      }
      return [...teammateMap.values()].sort((a, b) => b.seasons[0].season_year - a.seasons[0].season_year)
    },
    enabled: !!driverUuid && !!teamSeasons && teamSeasons.length > 0,
  })

  const teammateUuids = useMemo(() => teammates?.map((t) => t.uuid) ?? [], [teammates])

  const { data: teammateHeroImages } = useQuery({
    queryKey: ["teammate-hero-images", teammateUuids.join(",")],
    queryFn: async () => {
      if (teammateUuids.length === 0) return []
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .in("driver_id", teammateUuids)
        .eq("type", "hero")
      return (data ?? []) as DriverImage[]
    },
    enabled: teammateUuids.length > 0,
  })

  const teammateHeroImagesMap = useMemo(() => {
    const map = new Map<string, string>()
    teammateHeroImages?.forEach((img) => {
      if (!map.has(img.driver_id)) map.set(img.driver_id, img.image_url)
    })
    return map
  }, [teammateHeroImages])
  void teammateHeroImagesMap

  const { data: driverPoleImage } = useQuery({
    queryKey: ["driver-pole-image", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return null
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .eq("driver_id", driverUuid)
        .eq("type", "pole")
        .maybeSingle()
      return data as DriverImage | null
    },
    enabled: !!driverUuid,
  })

  const { data: driverWikipedia } = useQuery({
    queryKey: ["driver-wikipedia", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return null
      const { data } = await supabase
        .from("driver_wikipedia")
        .select("*")
        .eq("entity_id", driverUuid)
        .maybeSingle()
      return data as DriverWikipedia | null
    },
    enabled: !!driverUuid,
  })

  const currentTeam = teamSeasons && teamSeasons.length > 0 ? teamSeasons[0] : null

  const { data: currentConstructorData } = useQuery({
    queryKey: ["current-constructor", currentTeam?.constructor_id],
    queryFn: async () => {
      if (!currentTeam?.constructor_id) return null
      const { data } = await supabase
        .from("constructors")
        .select("*")
        .eq("constructor_id", currentTeam.constructor_id)
        .single()
      return data as {
        name: string
        logo_url: string | null
        color_primary: string | null
        color_secondary: string | null
        color_accent: string | null
      } | null
    },
    enabled: !!currentTeam?.constructor_id,
  })

  const stats = results ? computeDriverCareerStats(results as RaceResult[], sprints as SprintResult[]) : null
  const { data: winsWithCircuit } = useQuery({
    queryKey: ["driver-wins-circuit", driverUuid],
    queryFn: async () => {
      if (!driverUuid) return []
      const { data } = await supabase
        .from("race_results")
        .select("position, grid, races!inner(season_year, round, name, date, circuit_id)")
        .eq("driver_id", driverUuid)
        .eq("position", 1)
        .order("races(date)", { ascending: true })
        .order("races(round)", { ascending: true })
      return (data ?? []) as { position: number | null; grid: number | null; races: { season_year: number; round: number; name: string; date: string; circuit_id: string } }[]
    },
    enabled: !!driverUuid,
  })

  const { data: circuitsMap } = useQuery({
    queryKey: ["circuits-map"],
    queryFn: async () => {
      const { data } = await supabase.from("circuits").select("id, name")
      return new Map((data ?? [] as { id: string; name: string }[]).map((c) => [c.id, c.name]))
    },
    staleTime: Infinity,
  })

  const achievements = (() => {
    if (!winsWithCircuit || winsWithCircuit.length === 0) return null
    const wins = winsWithCircuit

    const circuitWins = new Map<string, { name: string; count: number }>()
    for (const w of wins) {
      const cid = w.races.circuit_id
      const cname = circuitsMap?.get(cid) ?? "Unknown"
      const existing = circuitWins.get(cid)
      if (existing) existing.count++
      else circuitWins.set(cid, { name: cname, count: 1 })
    }
    const favoriteCircuit = [...circuitWins.values()].sort((a, b) => b.count - a.count)[0]

    const firstWin = wins[0]
    const latestWin = wins[wins.length - 1]

    const seasonWins = new Map<number, number>()
    for (const w of wins) {
      seasonWins.set(w.races.season_year, (seasonWins.get(w.races.season_year) ?? 0) + 1)
    }
    const bestSeason = [...seasonWins.entries()].sort((a, b) => b[1] - a[1])[0]

    const seasonsSorted = [...seasonWins.keys()].sort((a, b) => a - b)
    let consecutiveStreak = 1
    let bestStreak = 1
    for (let i = 1; i < seasonsSorted.length; i++) {
      if (seasonsSorted[i] === seasonsSorted[i - 1] + 1) {
        consecutiveStreak++
        bestStreak = Math.max(bestStreak, consecutiveStreak)
      } else {
        consecutiveStreak = 1
      }
    }

    const comebackWins = wins.filter((w) => w.grid != null && w.grid > 5).length
    const poleWins = wins.filter((w) => w.grid === 1).length
    const nonPoleWins = wins.length - poleWins

    return {
      totalWins: wins.length,
      favoriteCircuit,
      firstWin,
      latestWin,
      bestSeason,
      consecutiveWinningSeasons: bestStreak,
      comebackWins,
      poleWins,
      nonPoleWins,
    }
  })()

  const milestones = results ? detectMilestones(results as RaceResult[]) : []
  const winStreaks = results ? getStreaks(results as RaceResult[], "wins") : []
  const podiumStreaks = results ? getStreaks(results as RaceResult[], "podiums") : []
  const pointStreaks = results ? getStreaks(results as RaceResult[], "points") : []

  const frontRowStarts = qualifyingResults?.filter((q) => q.position !== null && q.position <= 2).length ?? 0
  const q3Appearances = qualifyingResults?.filter((q) => q.q3 && q.q3.trim() !== "").length ?? 0
  const pointsFinishes = stats?.pointsFinishes ?? 0
  const top5Finishes = results?.filter((r) => r.position !== null && r.position <= 5).length ?? 0
  const top10Finishes = results?.filter((r) => r.position !== null && r.position <= 10).length ?? 0
  const totalLapsCompleted = results?.reduce((sum, r) => sum + (r.laps ?? 0), 0) ?? 0
  const totalKilometersRaced = results?.reduce((sum, r) => sum + (r.races?.distance_km ?? 0), 0) ?? 0
  const grandSlams = results?.filter((r) => r.position === 1 && r.grid === 1 && r.fastest_lap_rank === 1).length ?? 0
  const averageQualifying = (() => {
    const positions = qualifyingResults?.filter((q) => q.position !== null).map((q) => q.position!) ?? []
    return positions.length > 0 ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length : null
  })()
  const averageGrid = stats?.avgGridPosition ?? null

  const [circuitSort, setCircuitSort] = useState<"wins" | "podiums" | "avgFinish">("wins")
  const circuitPerformance = (() => {
    const map = new Map<string, {
      circuitId: string
      circuitName: string
      races: number
      wins: number
      podiums: number
      poles: number
      fastestLaps: number
      points: number
      finishCount: number
      finishTotal: number
    }>()

    for (const r of results ?? []) {
      const circuitId = r.races?.circuit_id ?? ""
      const circuitName = r.races?.circuits?.name ?? r.races?.name ?? "Unknown"
      if (!map.has(circuitId)) {
        map.set(circuitId, {
          circuitId,
          circuitName,
          races: 0,
          wins: 0,
          podiums: 0,
          poles: 0,
          fastestLaps: 0,
          points: 0,
          finishCount: 0,
          finishTotal: 0,
        })
      }
      const entry = map.get(circuitId)!
      entry.races += 1
      if (r.position === 1) entry.wins += 1
      if (r.position !== null && r.position <= 3) entry.podiums += 1
      if (r.grid === 1) entry.poles += 1
      if (r.fastest_lap_rank === 1) entry.fastestLaps += 1
      entry.points += r.points
      if (r.position !== null) {
        entry.finishCount += 1
        entry.finishTotal += r.position
      }
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        averageFinish: entry.finishCount > 0 ? entry.finishTotal / entry.finishCount : null,
      }))
      .sort((a, b) => {
        if (circuitSort === "wins") return b.wins - a.wins || a.averageFinish - b.averageFinish
        if (circuitSort === "podiums") return b.podiums - a.podiums || a.averageFinish - b.averageFinish
        return (a.averageFinish ?? Number.POSITIVE_INFINITY) - (b.averageFinish ?? Number.POSITIVE_INFINITY) || b.wins - a.wins
      })
  })()

  const seasons = results?.reduce(
    (acc, r) => {
      const sy = r.races.season_year
      if (!acc.includes(sy)) acc.push(sy)
      return acc
    },
    [] as number[]
  ) ?? []

  const teamBySeason = new Map<number, { name: string; constructor_id: string }>()
  teamSeasons?.forEach((ts) => {
    if (!teamBySeason.has(ts.season_year)) {
      teamBySeason.set(ts.season_year, {
        name: ts.constructor_name,
        constructor_id: ts.constructor_id,
      })
    }
  })

  if (!driver) {
    return <PageSkeleton />
  }

  const constructorColors = currentConstructorData ? getConstructorColorsFromRecord(currentConstructorData) : null
  const careerYears = seasons.length > 0 ? `${Math.min(...seasons)}-${String(Math.max(...seasons)).slice(2)}` : ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[240px] lg:min-h-[280px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%)`
        }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        {driverPoleImage?.image_url && (
          <div className="absolute right-[-6%] bottom-0 h-[115%] w-[55%] sm:w-[50%] pointer-events-none z-0">
            <img src={driverPoleImage.image_url} alt="" className="h-full w-full object-contain object-right-bottom" />
          </div>
        )}
        <div className="absolute top-0 left-0 h-full w-[4px] bg-accent-red" />
        <div className="relative z-10 w-full p-8 lg:p-12">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                {constructorColors && (
                  <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: `linear-gradient(135deg, ${constructorColors.primary}, ${constructorColors.secondary})` }} />
                )}
                <h1 className="text-3xl lg:text-5xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-white drop-shadow-lg">
                  {driver.given_name} {driver.family_name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {driver.nationality && (
                  <Badge variant="brand" className="gap-1">
                    {getFlagUrl(driver.nationality) && (
                      <img src={getFlagUrl(driver.nationality)!} alt="" className="w-3.5 h-2.5 object-cover rounded" />
                    )}
                    {driver.nationality}
                  </Badge>
                )}
                {driver.dob && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="w-3 h-3" />
                    Born {new Date(driver.dob).toLocaleDateString()}
                  </Badge>
                )}
                {careerYears && (
                  <Badge variant="outline">{careerYears}</Badge>
                )}
                {driver.code && (
                  <Badge variant="outline" className="border-white/30 text-white/80">
                    #{driver.code}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {currentConstructorData && (
                  <Badge
                    className="text-xs gap-1"
                    style={{
                      backgroundColor: constructorColors?.secondary ?? "#6b7280",
                      color: constructorColors?.accent ?? "#fff",
                    }}
                  >
                    {currentConstructorData.logo_url && (
                      <img src={currentConstructorData.logo_url} alt="" className="w-3 h-3 object-contain" />
                    )}
                    {currentConstructorData.name}
                  </Badge>
                )}
              </div>
              {driver.bio && (
                <p className="mt-3 max-w-xl text-sm text-white/60 drop-shadow-sm leading-relaxed">{driver.bio}</p>
              )}
              {driverWikipedia?.short_description && (
                <p className="mt-2 max-w-xl text-sm text-white/40 drop-shadow-sm italic">
                  {driverWikipedia.short_description}
                </p>
              )}
              {driverWikipedia?.page_url && (
                <a
                  href={driverWikipedia.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  <Book className="w-3 h-3" />
                  <span>View on Wikipedia</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3"
        >
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
              <CardContent className="p-5 flex items-center gap-3">
                <Flag className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Races</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalRaces}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Wins</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.wins}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Medal className="w-8 h-8 text-amber-500/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Podiums</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.podiums}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red/80" />
              <CardContent className="p-5 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Points</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalPoints}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Zap className="w-8 h-8 text-blue-400/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Sprint Wins</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.sprintWins}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-sky-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Medal className="w-8 h-8 text-sky-400/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Sprint Pods</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.sprintPodiums}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-indigo-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Target className="w-8 h-8 text-indigo-400/60" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Sprint Pts</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.sprintPoints}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
              <CardContent className="p-5 flex items-center gap-3">
                <Gauge className="w-8 h-8 text-text-tertiary" />
                <div>
                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Avg Finish</p>
                  <p className="text-2xl font-bold text-text-primary">{stats.avgFinishingPosition?.toFixed(1) ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      <Tabs defaultValue="results">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="results">Race Results</TabsTrigger>
            <TabsTrigger value="seasons">Season by Season</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="team-records">Team Records</TabsTrigger>
            <TabsTrigger value="team-mates">Teammates</TabsTrigger>
            <TabsTrigger value="teammates">Teammate Battle</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="circuit-performance">Circuit Performance</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="advanced-stats">Advanced Stats</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results">
          {(() => {
            const years = [...new Set(results?.map((r) => r.races.season_year) ?? [])].sort((a, b) => b - a)
            const selectedYear = resultYear ?? years[0] ?? null
            const filtered = years.length > 0 ? (results ?? []).filter((r) => r.races.season_year === selectedYear) : results ?? []
            return (
              <motion.div
                variants={containerVariants}
                initial="initial"
                animate="animate"
                className="space-y-3"
              >
                {years.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setResultYear(y)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedYear === y
                            ? "bg-accent-red text-white"
                            : "bg-tertiary text-text-secondary hover:bg-tertiary/80"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
                {filtered.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs text-text-secondary align-top pt-2.5">{r.races.round}</TableCell>
                            <TableCell className="align-top pt-2">
                              <Link to={`/races/${r.race_id}`} className="font-heading font-medium hover:underline text-text-primary">
                                {getFlagUrl(r.races.circuits?.country) && (
                                  <img src={getFlagUrl(r.races.circuits?.country)!} alt="" className="w-4 h-3 object-cover inline-block mr-1.5 -mt-0.5" />
                                )}
                                {r.races.name}
                              </Link>
                            </TableCell>
                            <TableCell className="align-top pt-2">
                              <div className="flex items-center gap-1.5">
                                {r.constructor?.logo_url && (
                                  <img src={r.constructor.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                )}
                                <span className="text-xs text-text-secondary">{r.constructor?.name ?? "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top pt-2 text-text-primary">{r.position ?? "—"}</TableCell>
                            <TableCell className="text-right align-top pt-2 text-xs text-text-secondary">{r.status || (r.position ? "Finished" : "—")}</TableCell>
                            <TableCell className="text-right font-semibold align-top pt-2 text-text-primary">{r.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-text-secondary py-8">
                    {years.length > 0 ? "No results for this year." : "No results available yet."}
                  </p>
                )}
              </motion.div>
            )
          })()}
        </TabsContent>

        <TabsContent value="seasons">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Season Statistics</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto hide-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead><div className="text-end">Races</div></TableHead>
                      <TableHead><div className="text-end">Wins</div></TableHead>
                      <TableHead><div className="text-end">Podiums</div></TableHead>
                      <TableHead><div className="text-end">Points</div></TableHead>
                      <TableHead><div className="text-end">Avg Finish</div></TableHead>
                      <TableHead><div className="text-end">Win Rate</div></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasons.map((season) => {
                      const seasonResults = (results ?? []).filter((r) => r.races.season_year === season)
                      const seasonSprints = (sprints ?? []).filter((s) => s.races.season_year === season)
                      const seasonData = computeDriverSeasonStats(seasonResults, season, seasonSprints)
                      const team = teamBySeason.get(season)
                      return (
                        <TableRow key={season}>
                          <TableCell className="font-medium text-text-primary">{season}</TableCell>
                          <TableCell className="text-text-primary">
                            {team ? (
                              <Link to={`/constructors/${team.constructor_id}`} className="hover:underline">
                                {team.name}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-text-primary">{seasonData.races + seasonData.sprints}</TableCell>
                          <TableCell className="text-right text-text-primary">{seasonData.wins + seasonData.sprintWins}</TableCell>
                          <TableCell className="text-right text-text-primary">{seasonData.podiums + seasonData.sprintPodiums}</TableCell>
                          <TableCell className="text-right font-bold text-text-primary">{seasonData.points + seasonData.sprintPoints}</TableCell>
                          <TableCell className="text-right text-text-primary">{seasonData.avgFinishingPosition?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right text-text-primary">{seasonData.races + seasonData.sprints > 0 ? `${((seasonData.wins + seasonData.sprintWins) / (seasonData.races + seasonData.sprints) * 100).toFixed(0)}%` : "—"}</TableCell>
                        </TableRow>
                      )
                    })}
                    {seasons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-text-secondary">
                          No season data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="teams">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Team History & Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {teamSeasons && teamSeasons.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      const latestSeason = teamSeasons[0].season_year
                      const currentTeam = {
                        name: teamSeasons[0].constructor_name,
                        constructor_id: teamSeasons[0].constructor_id,
                      }
                      const currentTeamSince = Math.min(
                        ...teamSeasons
                          .filter((ts) => ts.constructor_id === currentTeam.constructor_id)
                          .map((ts) => ts.season_year)
                      )
                      const currentTeamRecord = driverTeamRecords.find((t) => t.constructor_id === currentTeam.constructor_id)
                      const seenCtors = new Set<string>()
                      const priorTeams = teamSeasons.filter((ts) => {
                        if (ts.constructor_id === currentTeam.constructor_id) return false
                        if (seenCtors.has(ts.constructor_id)) return false
                        seenCtors.add(ts.constructor_id)
                        return true
                      })
                      return (
                        <>
                          <Card className="border-accent-red/30 bg-accent-red/5">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Current Team</p>
                                  <Link
                                    to={`/constructors/${currentTeam.constructor_id}`}
                                    className="text-xl font-bold hover:underline text-text-primary"
                                  >
                                    {currentTeam.name}
                                  </Link>
                                  <p className="text-sm text-text-secondary">since {currentTeamSince}</p>
                                </div>
                                <Badge variant="default" className="text-xs">{latestSeason}</Badge>
                              </div>
                              {currentTeamRecord && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-accent-red/20">
                                  <div>
                                    <span className="text-text-secondary">Races</span>
                                    <p className="font-semibold text-text-primary">{currentTeamRecord.races + currentTeamRecord.sprints}</p>
                                  </div>
                                  <div>
                                    <span className="text-text-secondary">Wins</span>
                                    <p className="font-semibold text-text-primary">{currentTeamRecord.wins + currentTeamRecord.sprintWins}</p>
                                  </div>
                                  <div>
                                    <span className="text-text-secondary">Podiums</span>
                                    <p className="font-semibold text-text-primary">{currentTeamRecord.podiums + currentTeamRecord.sprintPodiums}</p>
                                  </div>
                                  <div>
                                    <span className="text-text-secondary">Points</span>
                                    <p className="font-semibold text-text-primary">{currentTeamRecord.points + currentTeamRecord.sprintPoints}</p>
                                  </div>
                                  <div>
                                    <span className="text-text-secondary">Poles</span>
                                    <p className="font-semibold text-text-primary">{currentTeamRecord.poles}</p>
                                  </div>
                                  <div>
                                    <span className="text-text-secondary">Win Rate</span>
                                    <p className="font-semibold text-text-primary">
                                      {currentTeamRecord.races + currentTeamRecord.sprints > 0
                                        ? `${((currentTeamRecord.wins + currentTeamRecord.sprintWins) / (currentTeamRecord.races + currentTeamRecord.sprints) * 100).toFixed(1)}%`
                                        : "—"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          {priorTeams.map((ts) => {
                            const teamRecord = driverTeamRecords.find((t) => t.constructor_id === ts.constructor_id)
                            return (
                              <TeamHistoryCard key={ts.constructor_id} entry={ts} teamSeasons={teamSeasons} results={results ?? []} driverUuid={driverUuid!} teamRecord={teamRecord} />
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="text-text-secondary">No team history data available.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="team-records">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Team Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead><div className="text-end">Races</div></TableHead>
                      <TableHead><div className="text-end">Wins</div></TableHead>
                      <TableHead><div className="text-end">Win %</div></TableHead>
                      <TableHead><div className="text-end">Podiums</div></TableHead>
                      <TableHead><div className="text-end">Points</div></TableHead>
                      <TableHead><div className="text-end">Poles</div></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverTeamRecords.map((t) => (
                      <TableRow key={t.constructor_id}>
                        <TableCell>
                          <Link to={`/constructors/${t.constructor_id}`} className="font-medium hover:underline text-text-primary">
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-text-primary">{t.races + t.sprints}</TableCell>
                        <TableCell className="text-right font-semibold text-text-primary">{t.wins + t.sprintWins}</TableCell>
                        <TableCell className="text-right text-text-primary">{t.races + t.sprints > 0 ? `${((t.wins + t.sprintWins) / (t.races + t.sprints) * 100).toFixed(1)}%` : "—"}</TableCell>
                        <TableCell className="text-right text-text-primary">{t.podiums + t.sprintPodiums}</TableCell>
                        <TableCell className="text-right font-bold text-text-primary">{t.points + t.sprintPoints}</TableCell>
                        <TableCell className="text-right text-text-primary">{t.poles}</TableCell>
                      </TableRow>
                    ))}
                    {driverTeamRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-text-secondary">
                          No team record data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="team-mates">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            {teammates && teammates.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teammate</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Seasons Together</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teammates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Link to={`/drivers/${t.id}`} className="flex items-center gap-1.5 font-medium hover:underline text-text-primary">
                            {getFlagUrl(t.nationality) && (
                              <img src={getFlagUrl(t.nationality)!} alt="" className="w-4 h-3 object-cover rounded-none" />
                            )}
                            {t.given_name} {t.family_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">{t.nationality ?? "—"}</TableCell>
                        <TableCell className="text-xs text-text-secondary">{formatSeasonRange(t.seasons.map((s) => s.season_year))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-text-secondary">No teammates found.</p>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="teammates">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            {teamSeasons && teamSeasons.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Teammate</TableHead>
                      <TableHead className="text-right">Races</TableHead>
                      <TableHead className="text-right">Race H2H</TableHead>
                      <TableHead className="text-right">Quali H2H</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamSeasons.map((ts) => (
                      <TeammateSection
                        key={`${ts.season_year}-${ts.constructor_id}`}
                        driverUuid={driverUuid!}
                        season={ts.season_year}
                        constructorId={ts.constructor_id}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-text-secondary">No teammate data available.</p>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="milestones">
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Career Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {milestones.slice(0, 20).map((m, i) => (
                      <motion.div key={i} variants={itemVariants}>
                        <Card className="bg-tertiary/50">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium text-text-primary">{m.description}</p>
                            {m.raceName && (
                              <p className="text-xs text-text-secondary mt-1">
                                {m.seasonYear} Round {m.round} — {m.raceName}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary">No milestones detected yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="achievements">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                {achievements ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Total Wins</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{achievements.totalWins}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Favorite Circuit</p>
                        <p className="text-lg font-bold mt-1 text-text-primary">{achievements.favoriteCircuit.name}</p>
                        <p className="text-sm text-text-secondary">{achievements.favoriteCircuit.count} wins</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Best Season</p>
                        <p className="text-lg font-bold mt-1 text-text-primary">{achievements.bestSeason[0]}</p>
                        <p className="text-sm text-text-secondary">{achievements.bestSeason[1]} wins</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Consecutive Winning Seasons</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{achievements.consecutiveWinningSeasons}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Pole-to-Win</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{achievements.poleWins}</p>
                        <p className="text-sm text-text-secondary">{achievements.totalWins > 0 ? `${(achievements.poleWins / achievements.totalWins * 100).toFixed(0)}% conversion` : "—"}</p>
                      </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Comeback Wins</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{achievements.comebackWins}</p>
                        <p className="text-sm text-text-secondary">(started outside top 5)</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-tertiary/50 sm:col-span-2 lg:col-span-3">
                      <CardContent className="p-4 flex flex-col sm:flex-row gap-6">
                        <div className="flex-1">
                          <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">First Win</p>
                          <p className="text-lg font-bold mt-1 text-text-primary">{achievements.firstWin.races.name}</p>
                          <p className="text-sm text-text-secondary">{achievements.firstWin.races.season_year} Round {achievements.firstWin.races.round} — {new Date(achievements.firstWin.races.date).toLocaleDateString()}</p>
                        </div>
                        <div className="sm:border-l sm:border-default sm:pl-6 flex-1">
                          <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Latest Win</p>
                          <p className="text-lg font-bold mt-1 text-text-primary">{achievements.latestWin.races.name}</p>
                          <p className="text-sm text-text-secondary">{achievements.latestWin.races.season_year} Round {achievements.latestWin.races.round} — {new Date(achievements.latestWin.races.date).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-text-secondary">No wins yet — achievements will appear here once the driver has a win.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="about">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="w-4 h-4 text-amber-400" />
                  About {driver.given_name} {driver.family_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {driverWikipedia?.summary ? (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
                      {driverWikipedia.summary}
                    </div>
                    {driverWikipedia.images && (driverWikipedia.images as { url: string; description: string | null }[]).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(driverWikipedia.images as { url: string; description: string | null }[]).slice(0, 6).map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="relative overflow-hidden rounded-xl bg-tertiary aspect-video">
                              <img src={img.url} alt={img.description ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                            </div>
                            {img.description && (
                              <p className="text-[10px] text-text-tertiary mt-1 line-clamp-2">{img.description}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {driverWikipedia.sections && (driverWikipedia.sections as { line: string; index: string }[]).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-text-primary mb-2">Sections</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(driverWikipedia.sections as { line: string; index: string }[]).filter((s) => s.index.split(".").length <= 2).slice(0, 20).map((s, i) => (
                            <span key={i} className="text-xs bg-tertiary text-text-secondary rounded-full px-2.5 py-1">
                              {s.line}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {driverWikipedia.page_url && (
                      <a
                        href={driverWikipedia.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Read full biography on Wikipedia
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-text-secondary">No Wikipedia biography available for this driver.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="circuit-performance">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Circuit Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <p className="text-sm text-text-secondary">Sort by:</p>
                  <select
                    value={circuitSort}
                    onChange={(event) => setCircuitSort(event.target.value as "wins" | "podiums" | "avgFinish")}
                    className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="wins">Most wins</option>
                    <option value="podiums">Most podiums</option>
                    <option value="avgFinish">Best average finish</option>
                  </select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Circuit</TableHead>
                      <TableHead><div className="text-end">Races</div></TableHead>
                      <TableHead><div className="text-end">Wins</div></TableHead>
                      <TableHead><div className="text-end">Podiums</div></TableHead>
                      <TableHead><div className="text-end">Poles</div></TableHead>
                      <TableHead><div className="text-end">Fastest Laps</div></TableHead>
                      <TableHead><div className="text-end">Avg Finish</div></TableHead>
                      <TableHead><div className="text-end">Points</div></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {circuitPerformance.map((row) => (
                      <TableRow key={row.circuitId}>
                        <TableCell className="text-text-primary">{row.circuitName}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.races}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.wins}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.podiums}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.poles}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.fastestLaps}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.averageFinish ? row.averageFinish.toFixed(2) : "—"}</TableCell>
                        <TableCell className="text-right text-text-primary">{row.points}</TableCell>
                      </TableRow>
                    ))}
                    {circuitPerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-text-secondary">
                          No circuit performance data available yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="advanced-stats">
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Advanced Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Front Row Starts</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{frontRowStarts}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Points Finishes</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{pointsFinishes}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Top 5 Finishes</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{top5Finishes}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Top 10 Finishes</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{top10Finishes}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-purple-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Laps Led</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">—</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-indigo-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Total Laps</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{totalLapsCompleted}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Kilometers</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{totalKilometersRaced.toFixed(1)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-sky-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Q3 Appearances</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{q3Appearances}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-yellow-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Grand Slams</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{grandSlams}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-accent-red/80" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Avg Qualifying</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{averageQualifying ? averageQualifying.toFixed(2) : "—"}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Avg Grid</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{averageGrid ? averageGrid.toFixed(2) : "—"}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden bg-tertiary/50">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500" />
                      <CardContent className="p-4">
                        <p className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">Avg Finish</p>
                        <p className="text-3xl font-bold mt-1 text-text-primary">{stats?.avgFinishingPosition ? stats.avgFinishingPosition.toFixed(2) : "—"}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="streaks">
          <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Best Streaks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Longest Win Streaks</h3>
                  <div className="flex flex-wrap gap-2">
                    {winStreaks.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant={s.active ? "brand" : "default"} className="text-sm px-3 py-1">
                        {s.length} {s.length === 1 ? "win" : "wins"}
                        {s.active ? " (active)" : ""}
                      </Badge>
                    ))}
                    {winStreaks.length === 0 && (
                      <p className="text-sm text-text-secondary">No win streaks yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Longest Podium Streaks</h3>
                  <div className="flex flex-wrap gap-2">
                    {podiumStreaks.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant={s.active ? "brand" : "default"} className="text-sm px-3 py-1">
                        {s.length} {s.length === 1 ? "podium" : "podiums"}
                        {s.active ? " (active)" : ""}
                      </Badge>
                    ))}
                    {podiumStreaks.length === 0 && (
                      <p className="text-sm text-text-secondary">No podium streaks yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Longest Points Streaks</h3>
                  <div className="flex flex-wrap gap-2">
                    {pointStreaks.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant={s.active ? "brand" : "default"} className="text-sm px-3 py-1">
                        {s.length} {s.length === 1 ? "race" : "races"}
                        {s.active ? " (active)" : ""}
                      </Badge>
                    ))}
                    {pointStreaks.length === 0 && (
                      <p className="text-sm text-text-secondary">No points streaks yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

function TeammateSection({
  driverUuid,
  season,
  constructorId,
}: {
  driverUuid: string
  season: number
  constructorId: string
}) {
  const { data: teamResults } = useQuery({
    queryKey: ["team-results", constructorId, season],
    queryFn: async () => {
      const { data: races } = await supabase
        .from("races")
        .select("id")
        .eq("season_year", season)

      if (!races || races.length === 0) return { results: [], qualifying: [], teammate: null, teammateName: "" }

      const raceIds = races.map((r) => r.id)

      const { data: results } = await supabase
        .from("race_results")
        .select("*, constructors!inner(constructor_id), drivers!inner(driver_id, given_name, family_name, nationality)")
        .in("race_id", raceIds)
        .eq("constructors.constructor_id", constructorId)
        .order("race_id", { ascending: true })

      const { data: quali } = await supabase
        .from("qualifying_results")
        .select("*, constructors!inner(constructor_id), drivers!inner(driver_id, given_name, family_name, nationality)")
        .in("race_id", raceIds)
        .eq("constructors.constructor_id", constructorId)

      const allResults = (results ?? []) as (Record<string, unknown> & { driver_id: string; drivers: { driver_id: string; given_name: string; family_name: string; nationality: string | null } })[]
      const allQuali = (quali ?? []) as (Record<string, unknown> & { driver_id: string; drivers: { driver_id: string; given_name: string; family_name: string; nationality: string | null } })[]

      const teammate = allResults.find((r) => r.driver_id !== driverUuid)
      const teammateName = teammate ? `${teammate.drivers.given_name} ${teammate.drivers.family_name}` : ""
      const teammateNationality = teammate?.drivers.nationality ?? null

      return { results: allResults, qualifying: allQuali, teammate: teammate?.driver_id ?? null, teammateName, teammateNationality }
    },
    enabled: !!driverUuid,
  })

  if (!teamResults?.teammate) {
    return null
  }

  const driverRaceResults = teamResults.results.filter((r) => r.driver_id === driverUuid)
  const teammateRaceResults = teamResults.results.filter((r) => r.driver_id === teamResults.teammate)
  const driverQuali = teamResults.qualifying.filter((q) => q.driver_id === driverUuid)
  const teammateQuali = teamResults.qualifying.filter((q) => q.driver_id === teamResults.teammate)

  const commonRaceIds = driverRaceResults
    .map((r) => r.race_id)
    .filter((id) => teammateRaceResults.some((tr) => tr.race_id === id))

  let raceH2H = { driverWins: 0, teammateWins: 0, ties: 0 }
  let qualiH2H = { driverWins: 0, teammateWins: 0, ties: 0 }

  for (const raceId of commonRaceIds) {
    const dr = driverRaceResults.find((r) => r.race_id === raceId)
    const tr = teammateRaceResults.find((r) => r.race_id === raceId)
    if (dr?.position && tr?.position) {
      if (dr.position < tr.position) raceH2H.driverWins++
      else if (tr.position < dr.position) raceH2H.teammateWins++
      else raceH2H.ties++
    }

    const dq = driverQuali.find((q) => q.race_id === raceId)
    const tq = teammateQuali.find((q) => q.race_id === raceId)
    if (dq?.position && tq?.position) {
      if (dq.position < tq.position) qualiH2H.driverWins++
      else if (tq.position < dq.position) qualiH2H.teammateWins++
      else qualiH2H.ties++
    }
  }

  const raceH2HText = `${raceH2H.driverWins}–${raceH2H.teammateWins}${raceH2H.ties > 0 ? `–${raceH2H.ties}` : ""}`
  const qualiH2HText = `${qualiH2H.driverWins}–${qualiH2H.teammateWins}${qualiH2H.ties > 0 ? `–${qualiH2H.ties}` : ""}`

  return (
    <TableRow>
      <TableCell className="text-text-primary">{season}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {getFlagUrl(teamResults.teammateNationality) && (
            <img src={getFlagUrl(teamResults.teammateNationality)!} alt="" className="w-4 h-3 object-cover rounded-none" />
          )}
          <span className="font-medium text-text-primary">{teamResults.teammateName}</span>
        </div>
      </TableCell>
      <TableCell className="text-right text-text-primary">{commonRaceIds.length}</TableCell>
      <TableCell className="text-right text-xs text-text-primary">{raceH2HText}</TableCell>
      <TableCell className="text-right text-xs text-text-primary">{qualiH2HText}</TableCell>
    </TableRow>
  )
}

function TeamHistoryCard({
  entry,
  teamSeasons,
  results,
  driverUuid,
  teamRecord,
}: {
  entry: { constructor_id: string; constructor_name: string; season_year: number }
  teamSeasons: { constructor_id: string; constructor_name: string; season_year: number }[]
  results: (RaceResult & { races: { season_year: number; round: number; name: string; date: string } })[]
  driverUuid: string
  teamRecord?: { races: number; wins: number; podiums: number; points: number; poles: number; sprints: number; sprintWins: number; sprintPodiums: number; sprintPoints: number }
}) {
  const seasons = [...new Set(
    teamSeasons
      .filter((ts) => ts.constructor_id === entry.constructor_id)
      .map((ts) => ts.season_year)
  )].sort((a, b) => b - a)

  const t = teamRecord ?? (() => {
    const teamResults = results.filter(
      (r) => r.driver_id === driverUuid && r.constructor_id === entry.constructor_id
    )
    return {
      races: teamResults.length,
      wins: teamResults.filter((r) => r.position === 1).length,
      podiums: teamResults.filter((r) => r.position !== null && r.position <= 3).length,
      points: teamResults.reduce((s, r) => s + r.points, 0),
      poles: 0,
      sprints: 0,
      sprintWins: 0,
      sprintPodiums: 0,
      sprintPoints: 0,
    }
  })()

  return (
    <Card className="bg-tertiary/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Link to={`/constructors/${entry.constructor_id}`} className="text-lg font-semibold hover:underline text-text-primary">{entry.constructor_name}</Link>
            <p className="text-sm text-text-secondary">{seasons.join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-accent-red/10 text-accent-red rounded-full px-2 py-0.5">
              {t.races + t.sprints} races
            </span>
            {t.wins + t.sprintWins > 0 && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded-full px-2 py-0.5">
                {t.wins + t.sprintWins} {t.wins + t.sprintWins === 1 ? "win" : "wins"}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-text-secondary">Races</span>
            <p className="font-semibold text-text-primary">{t.races + t.sprints}</p>
          </div>
          <div>
            <span className="text-text-secondary">Wins</span>
            <p className="font-semibold text-text-primary">{t.wins + t.sprintWins}</p>
          </div>
          <div>
            <span className="text-text-secondary">Podiums</span>
            <p className="font-semibold text-text-primary">{t.podiums + t.sprintPodiums}</p>
          </div>
          <div>
            <span className="text-text-secondary">Points</span>
            <p className="font-semibold text-text-primary">{t.points + t.sprintPoints}</p>
          </div>
          <div>
            <span className="text-text-secondary">Poles</span>
            <p className="font-semibold text-text-primary">{t.poles}</p>
          </div>
          <div>
            <span className="text-text-secondary">Win Rate</span>
            <p className="font-semibold text-text-primary">
              {t.races + t.sprints > 0
                ? `${((t.wins + t.sprintWins) / (t.races + t.sprints) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


