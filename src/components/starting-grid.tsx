import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import { getConstructorColorsFromRecord } from "@/lib/constructorColors"
import type { Race, DriverImage } from "@/types/database"
import { Flag, Minimize2 } from "lucide-react"

interface DriverData {
  driver_id: string
  code: string | null
  given_name: string
  family_name: string
  nationality: string | null
  photo_url: string | null
}

interface ConstructorData {
  constructor_id: string
  name: string
  logo_url: string | null
  nationality: string | null
  color_primary: string | null
  color_secondary: string | null
  color_accent: string | null
}

interface GridResult {
  id: string
  grid: number | null
  position: number | null
  position_text: string | null
  points: number
  laps: number | null
  status: string | null
  time: string | null
  fastest_lap_time: string | null
  fastest_lap_rank: number | null
  driver_id: string
  constructor_id: string
  driver: DriverData
  constructor: ConstructorData
}

interface QualifyingResult {
  position: number | null
  q1: string | null
  q2: string | null
  q3: string | null
  driver_id: string
  driver: DriverData
  constructor: ConstructorData
}

interface StartingGridProps {
  results: GridResult[]
  qualifying: QualifyingResult[]
  race: Race
}

function getConstructorStyles(constructor: ConstructorData) {
  const c = getConstructorColorsFromRecord({
    name: constructor.name,
    color_primary: constructor.color_primary,
    color_secondary: constructor.color_secondary,
    color_accent: constructor.color_accent,
  })
  return c
}

const DriverCard = ({
  result,
  qualifyingTimes,
  cardImageUrl,
}: {
  result: GridResult
  qualifyingTimes: { q1: string | null; q2: string | null; q3: string | null } | null
  cardImageUrl?: string | null
}) => {
  const colors = getConstructorStyles(result.constructor)
  const gridPos = result.grid ?? 99
  const imageUrl = cardImageUrl

  return (
    <div
      className="group relative select-none"
      style={{ borderRadius: "0.75rem" }}
    >
      <div
        className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}CC, ${colors.secondary}88)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px),
              repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)
            `,
          }}
        />
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-10"
          style={{
            background: `radial-gradient(circle at top right, ${colors.accent}, transparent 70%)`,
          }}
        />
      </div>

      <div className="relative flex items-center gap-2 p-2 w-full">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg z-10"
          style={{ backgroundColor: `${colors.primary}`, color: colors.accent }}
        >
          <span className="text-lg font-bold leading-none" style={{ fontFamily: "var(--font-heading)" }}>
            {gridPos}
          </span>
        </div>

        {imageUrl && (
          <div className="flex-shrink-0 self-end -mb-2 z-10">
            <img
              src={imageUrl}
              alt={`${result.driver.given_name} ${result.driver.family_name}`}
              className="h-20 w-auto object-contain drop-shadow-xl"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 z-10">
          <Link
            to={`/drivers/${result.driver.driver_id}`}
            onClick={(e) => e.stopPropagation()}
            className="block text-base font-bold leading-tight text-white hover:underline truncate"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {result.driver.family_name.toUpperCase()}
          </Link>
          <Link
            to={`/constructors/${result.constructor.constructor_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white/90 hover:underline truncate"
            style={{ fontFamily: "var(--font-team)" }}
          >
            {result.constructor.logo_url && (
              <img
                src={result.constructor.logo_url}
                alt={`${result.constructor.name} logo`}
                className="h-3 w-auto object-contain"
              />
            )}
            {result.constructor.name}
          </Link>
        </div>

        {qualifyingTimes?.q3 && (
          <div className="hidden sm:block text-right flex-shrink-0 z-10">
            <span className="text-xs font-mono text-white/60">{qualifyingTimes.q3}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const GridSkeleton = () => (
  <div className="space-y-3 max-w-4xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(135deg, #666, #333)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 16px)`,
            }}
          />
          <div className="relative flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-14 rounded bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-3 w-20 rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyGrid = ({ raceName }: { raceName: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
        <Flag className="w-10 h-10 text-white/20" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
        <Minimize2 className="w-4 h-4 text-white/20" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-white/60 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
      STARTING GRID NOT YET PUBLISHED
    </h3>
    <p className="text-sm text-white/40 max-w-xs">
      The starting grid for {raceName} has not been published yet. Check back after qualifying.
    </p>
  </div>
)

export default function StartingGrid({
  results,
  qualifying,
  race,
}: StartingGridProps) {
  const driverIds = useMemo(() => [...new Set(results.map((r) => r.driver_id))], [results])

  const { data: driverCardImages } = useQuery({
    queryKey: ["driver-card-images", race.season_year, driverIds.join(",")],
    queryFn: async () => {
      if (driverIds.length === 0) return []
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .in("driver_id", driverIds)
        .eq("type", "card")
        .eq("year", race.season_year)
      return (data ?? []) as DriverImage[]
    },
    enabled: driverIds.length > 0 && !!race.season_year,
  })

  const cardImageMap = useMemo(() => {
    const map = new Map<string, string>()
    driverCardImages?.forEach((img) => {
      if (!map.has(img.driver_id)) map.set(img.driver_id, img.image_url)
    })
    return map
  }, [driverCardImages])

  const gridSorted = useMemo(() => {
    return [...results]
      .filter((r) => r.grid != null)
      .sort((a, b) => (a.grid ?? 99) - (b.grid ?? 99))
  }, [results])

  const oddPositions = useMemo(() => gridSorted.filter((_, i) => i % 2 === 0), [gridSorted])
  const evenPositions = useMemo(() => gridSorted.filter((_, i) => i % 2 === 1), [gridSorted])

  const gridPairs = useMemo(() => {
    const pairs: [GridResult, GridResult | null][] = []
    for (let i = 0; i < gridSorted.length; i += 2) {
      pairs.push([gridSorted[i], gridSorted[i + 1] ?? null])
    }
    return pairs
  }, [gridSorted])

  const qualifyingMap = useMemo(() => {
    const map = new Map<string, { q1: string | null; q2: string | null; q3: string | null }>()
    for (const q of qualifying) {
      map.set(q.driver_id, { q1: q.q1, q2: q.q2, q3: q.q3 })
    }
    return map
  }, [qualifying])

  return (
    <div className="space-y-6">
      {gridSorted.length === 0 ? (
        <EmptyGrid raceName={race.name} />
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="hidden md:grid md:grid-cols-2 md:gap-3">
            <div className="space-y-3">
              {oddPositions.map((result) => {
                const q = qualifyingMap.get(result.driver_id) ?? null
                return (
                  <DriverCard
                    key={result.id}
                    result={result}
                    qualifyingTimes={q}
                    cardImageUrl={cardImageMap.get(result.driver_id)}
                  />
                )
              })}
            </div>
            <div className="space-y-3 pt-0 md:pt-8">
              {evenPositions.map((result) => {
                const q = qualifyingMap.get(result.driver_id) ?? null
                return (
                  <DriverCard
                    key={result.id}
                    result={result}
                    qualifyingTimes={q}
                    cardImageUrl={cardImageMap.get(result.driver_id)}
                  />
                )
              })}
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {gridPairs.map(([odd, even], i) => (
              <div
                key={`pair-${i}`}
                className="space-y-2"
              >
                {odd && (
                  <DriverCard
                    result={odd}
                    qualifyingTimes={qualifyingMap.get(odd.driver_id) ?? null}
                    cardImageUrl={cardImageMap.get(odd.driver_id)}
                  />
                )}
                {even && (
                  <DriverCard
                    result={even}
                    qualifyingTimes={qualifyingMap.get(even.driver_id) ?? null}
                    cardImageUrl={cardImageMap.get(even.driver_id)}
                  />
                )}
                {i < gridPairs.length - 1 && odd && even && (
                  <div className="flex items-center gap-2 px-4 py-0.5">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { GridSkeleton }
