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
  const isPole = gridPos === 1

  return (
    <div
      className={`group relative select-none transition-all duration-300 ${
        isPole ? "scale-[1.02] -translate-y-0.5" : ""
      }`}
      style={{ borderRadius: "1rem" }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none transition-shadow duration-300">
        <div
          className="absolute inset-0 transition-all duration-500 group-hover:brightness-125"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}DD, ${colors.secondary}99)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 12px),
              repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,0.03) 6px, rgba(255,255,255,0.03) 12px)
            `,
          }}
        />
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-[0.12]"
          style={{
            background: `radial-gradient(circle at top right, ${colors.accent}, transparent 70%)`,
          }}
        />
        {isPole && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(180deg, rgba(234,179,8,0.08) 0%, transparent 50%)`,
            }}
          />
        )}
        {isPole && (
          <div
            className="absolute -inset-[1px] rounded-2xl pointer-events-none"
            style={{
              border: "1.5px solid rgba(234,179,8,0.3)",
              boxShadow: "0 0 30px rgba(234,179,8,0.06), inset 0 0 30px rgba(234,179,8,0.03)",
            }}
          />
        )}
      </div>

      <div className="relative flex items-center gap-3 p-3 w-full">
        <div
          className={`flex-shrink-0 flex items-center justify-center shadow-xl z-10 transition-transform duration-300 group-hover:scale-105 ${
            isPole
              ? "w-12 h-12 rounded-2xl"
              : "w-11 h-11 rounded-xl"
          }`}
          style={{
            backgroundColor: `${colors.primary}`,
            color: colors.accent,
            boxShadow: isPole
              ? `0 0 24px ${colors.primary}60, 0 8px 32px rgba(0,0,0,0.3)`
              : `0 4px 16px rgba(0,0,0,0.25)`,
          }}
        >
          <span
            className={`font-bold leading-none ${isPole ? "text-xl" : "text-lg"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {gridPos}
          </span>
        </div>

        {imageUrl && (
          <div className="flex-shrink-0 self-end -mb-3 z-10 transition-transform duration-300 group-hover:scale-105">
            <img
              src={imageUrl}
              alt={`${result.driver.given_name} ${result.driver.family_name}`}
              className="h-20 w-auto object-contain drop-shadow-2xl"
              style={{
                filter: isPole ? "brightness(1.1)" : undefined,
              }}
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 z-10">
          <Link
            to={`/drivers/${result.driver.driver_id}`}
            onClick={(e) => e.stopPropagation()}
            className={`block font-bold leading-tight hover:underline truncate transition-colors ${
              isPole ? "text-yellow-300" : "text-white"
            }`}
            style={{ fontFamily: "var(--font-heading)", fontSize: isPole ? "1.1rem" : "1rem" }}
          >
            {result.driver.family_name.toUpperCase()}
          </Link>
          <Link
            to={`/constructors/${result.constructor.constructor_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white/85 hover:underline truncate transition-colors"
            style={{ fontSize: "0.75rem", fontFamily: "var(--font-team)" }}
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
            <span
              className="text-xs font-mono"
              style={{ color: isPole ? "rgba(253,224,71,0.7)" : "rgba(255,255,255,0.5)" }}
            >
              {qualifyingTimes.q3}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const GridSkeleton = () => (
  <div className="space-y-3 max-w-5xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] rounded-2xl overflow-hidden relative animate-pulse"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 12px)`,
            }}
          />
          <div className="relative flex items-center gap-3 p-3">
            <div className="w-11 h-11 rounded-xl bg-white/5" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded bg-white/5 self-end -mb-3" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 w-28 rounded bg-white/5" />
                <div className="h-3 w-20 rounded bg-white/5" />
              </div>
            </div>
            <div className="hidden sm:block w-16 h-3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyGrid = ({ raceName }: { raceName: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="relative mb-8">
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Flag className="w-12 h-12 text-white/15" />
      </div>
      <div
        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Minimize2 className="w-5 h-5 text-white/15" />
      </div>
    </div>
    <h3
      className="text-xl font-bold text-white/50 mb-3 tracking-wide"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      STARTING GRID NOT YET PUBLISHED
    </h3>
    <p className="text-sm text-white/30 max-w-xs leading-relaxed" style={{ fontFamily: "var(--font-team)" }}>
      The starting grid for <span className="text-white/50">{raceName}</span> has not been published yet. Check back after qualifying.
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
    <div className="space-y-8">
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
            <div className="space-y-3 pt-0 lg:pt-8">
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
              <div key={`pair-${i}`} className="space-y-2">
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
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
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
