import { useMemo } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { getConstructorColorsFromRecord } from "@/lib/constructorColors"
import RacePodium from "@/components/race-podium"
import RaceClassification from "@/components/race-classification"
import type {
  Race,
  RaceResult,
  Circuit,
  PitStop,
  Weather,
  TireStint,
} from "@/types/database"

type ResultWithJoins = RaceResult & {
  driver: {
    id: string
    code: string | null
    given_name: string
    family_name: string
    driver_id: string
    nationality: string | null
    photo_url: string | null
  }
  constructor: {
    id: string
    name: string
    constructor_id: string
    logo_url: string | null
    nationality: string | null
    color_primary: string | null
    color_secondary: string | null
    color_accent: string | null
  }
}

interface RaceResultsProps {
  results: ResultWithJoins[]
  race: Race | null
  circuit: Circuit | null
  pitStops: (PitStop & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
  tireStints: (TireStint & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
  weatherData: Weather[]
  podiumCardImageMap: Map<string, string>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 } as const,
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export default function RaceResults({
  results,
  race,
  circuit,
  pitStops,
  tireStints,
  weatherData,
  podiumCardImageMap,
}: RaceResultsProps) {
  const podium = useMemo(
    () =>
      results
        .filter((r) => r.position != null && r.position >= 1 && r.position <= 3)
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    [results]
  )

  const fastestLap = useMemo(
    () => results.find((r) => r.fastest_lap_rank === 1) ?? null,
    [results]
  )

  const dnfResults = useMemo(
    () =>
      results.filter(
        (r) => r.status && r.status !== "Finished"
      ),
    [results]
  )

  const finishedResults = useMemo(
    () => results.filter((r) => !r.status || r.status === "Finished"),
    [results]
  )

  const firstWeather = weatherData?.[0] ?? null

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-base" style={{ fontFamily: "var(--font-team)" }}>
          No race results available yet.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 max-w-3xl mx-auto"
    >
      {podium.length > 0 && (
        <motion.div variants={itemVariants}>
          <RacePodium podium={podium} podiumCardImageMap={podiumCardImageMap} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-white/25 text-[11px] uppercase tracking-[0.18em] font-medium" style={{ fontFamily: "var(--font-team)" }}>
            Classification
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <RaceClassification
          results={results}
          pitStops={pitStops}
          tireStints={tireStints}
        />
      </motion.div>

      {fastestLap && (
        <motion.div variants={itemVariants}>
          <div
            className="relative overflow-hidden rounded-2xl p-5 md:p-6 group"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.06) 100%)",
              border: "1px solid rgba(168,85,247,0.12)",
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.08]"
              style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }}
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(168,85,247,0.05) 8px, rgba(168,85,247,0.05) 16px)`,
              }}
            />
            <div className="flex items-center gap-4 md:gap-5 relative">
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(88,28,135,0.18))",
                  border: "1px solid rgba(168,85,247,0.18)",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>⚡</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-[0.14em] text-purple-300/50 font-medium" style={{ fontFamily: "var(--font-team)" }}>
                  Fastest Lap
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Link
                    to={`/drivers/${fastestLap.driver.driver_id}`}
                    className="font-bold text-white hover:text-purple-200 hover:underline transition-colors"
                    style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem" }}
                  >
                    {fastestLap.driver.family_name.toUpperCase()}
                  </Link>
                  <span className="text-white/25 text-sm">·</span>
                  <Link
                    to={`/constructors/${fastestLap.constructor.constructor_id}`}
                    className="text-white/45 hover:text-white/70 hover:underline text-sm transition-colors"
                    style={{ fontFamily: "var(--font-team)" }}
                  >
                    {fastestLap.constructor.name}
                  </Link>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-white font-mono font-bold" style={{ fontSize: "1.15rem" }}>
                  {fastestLap.fastest_lap_time ?? "\u2014"}
                </div>
                <span className="text-purple-300/35 text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--font-team)" }}>
                  Lap {fastestLap.laps ?? "\u2014"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {dnfResults.length > 0 && dnfResults.length < results.length && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-white/25 text-[11px] uppercase tracking-[0.18em] font-medium" style={{ fontFamily: "var(--font-team)" }}>
              Retirements
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="space-y-2.5">
            {dnfResults.map((r) => {
              const c = getConstructorColorsFromRecord(r.constructor)
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="relative overflow-hidden rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(0,0,0,0.15))",
                      border: "1px solid rgba(239,68,68,0.08)",
                    }}
                  >
                    <div
                      className="absolute left-0 top-1 bottom-1 rounded-r-full"
                      style={{
                        width: "4px",
                        backgroundColor: c.primary,
                        boxShadow: `0 0 8px ${c.primary}30`,
                      }}
                    />
                    <div className="relative pl-4 pr-4 py-2.5 flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 flex-shrink-0">
                        <span
                          className="font-bold text-xs tracking-wider"
                          style={{ color: "rgba(248,113,113,0.5)" }}
                        >
                          DNF
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        <div
                          className="w-8 h-8 rounded-full overflow-hidden"
                          style={{ border: "2px solid rgba(255,255,255,0.1)" }}
                        >
                          {r.driver.photo_url ? (
                            <img src={r.driver.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              <span className="text-white/25 text-[10px] font-bold">{r.driver.family_name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/drivers/${r.driver.driver_id}`}
                          className="font-semibold text-white/75 hover:text-white hover:underline text-sm transition-colors"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {r.driver.family_name.toUpperCase()}
                        </Link>
                        <div className="text-white/35 text-xs" style={{ fontFamily: "var(--font-team)" }}>
                          {r.constructor.name}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: "rgba(239,68,68,0.1)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.1)",
                          }}
                        >
                          {r.status}
                        </span>
                        {r.laps != null && (
                          <div className="text-white/25 text-[10px] mt-0.5 font-mono">Lap {r.laps}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-white/25 text-[11px] uppercase tracking-[0.18em] font-medium" style={{ fontFamily: "var(--font-team)" }}>
            Race Statistics
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
            {race && (
              <>
                <StatItem label="Race Winner" value={podium[0] ? `${podium[0].driver.family_name}` : "\u2014"} />
                <StatItem label="Winning Team" value={podium[0]?.constructor.name ?? "\u2014"} />
                <StatItem label="Winning Time" value={podium[0]?.time ?? "\u2014"} />
              </>
            )}
            {race?.laps != null && <StatItem label="Total Laps" value={`${race.laps}`} />}
            {fastestLap && (
              <>
                <StatItem label="Fastest Lap" value={fastestLap.fastest_lap_time ?? "\u2014"} />
                <StatItem label="Fastest Driver" value={`${fastestLap.driver.family_name}`} />
              </>
            )}
            <StatItem label="Total Drivers" value={`${results.length}`} />
            <StatItem label="Finished" value={`${finishedResults.length}`} />
            <StatItem label="DNF" value={`${dnfResults.length}`} />
            {firstWeather?.air_temp != null && (
              <StatItem label="Air Temp" value={`${firstWeather.air_temp}\u00b0C`} />
            )}
            {firstWeather?.track_temp != null && (
              <StatItem label="Track Temp" value={`${firstWeather.track_temp}\u00b0C`} />
            )}
            {circuit && <StatItem label="Circuit" value={circuit.name} />}
            {circuit?.length_km != null && (
              <StatItem label="Distance" value={`${circuit.length_km.toFixed(3)} km`} />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-white/30 text-[10px] uppercase tracking-[0.12em] mb-1.5" style={{ fontFamily: "var(--font-team)" }}>
        {label}
      </span>
      <span className="block text-white/85 text-sm font-medium" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </span>
    </div>
  )
}
