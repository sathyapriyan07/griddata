import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "react-router-dom"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { getConstructorColorsFromRecord } from "@/lib/constructorColors"
import type { RaceResult, PitStop, TireStint } from "@/types/database"

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

interface RaceClassificationProps {
  results: ResultWithJoins[]
  pitStops: (PitStop & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
  tireStints: (TireStint & { driver: { code: string | null; given_name: string; family_name: string; driver_id: string; nationality: string | null; photo_url: string | null } })[]
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Finished: { bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  "": { bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  DNF: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  DNS: { bg: "rgba(156,163,175,0.12)", text: "#9ca3af" },
  DSQ: { bg: "rgba(255,255,255,0.06)", text: "#fca5a5" },
  Collision: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Engine: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Hydraulics: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Gearbox: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Suspension: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Brakes: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Electrical: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Accident: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Spun: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
  Lapped: { bg: "rgba(251,146,60,0.12)", text: "#fb923c" },
  "+1 Lap": { bg: "rgba(251,146,60,0.12)", text: "#fb923c" },
}

function getStatusStyle(status: string | null) {
  if (!status) return statusColors.Finished
  return statusColors[status] || statusColors.DNF
}

const tyreColors: Record<string, { bg: string; text: string }> = {
  soft: { bg: "rgba(248,113,113,0.18)", text: "#fca5a5" },
  medium: { bg: "rgba(250,204,21,0.18)", text: "#fde047" },
  hard: { bg: "rgba(255,255,255,0.08)", text: "#d1d5db" },
  intermediate: { bg: "rgba(74,222,128,0.18)", text: "#86efac" },
  wet: { bg: "rgba(96,165,250,0.18)", text: "#93c5fd" },
}

function getTyreStyle(compound: string | null) {
  if (!compound) return null
  return tyreColors[compound.toLowerCase()] || null
}

function formatTime(totalTime: string | null): string {
  if (!totalTime) return "\u2014"
  const timeStr = totalTime.trim()
  if (/^\d+$/.test(timeStr)) {
    const ms = parseInt(timeStr, 10)
    if (ms > 60000) {
      const minutes = Math.floor(ms / 60000)
      const seconds = ((ms % 60000) / 1000).toFixed(3)
      return `${minutes}:${seconds.padStart(6, "0")}`
    }
    return `${(ms / 1000).toFixed(3)}s`
  }
  if (/^\+?[\d.]+$/.test(timeStr)) {
    return `+${parseFloat(timeStr).toFixed(3)}s`
  }
  return timeStr
}

function computeGap(result: ResultWithJoins, leaderTime: string | null): string {
  if (!result.time) return "\u2014"
  if (result.position === 1) return formatTime(result.time)
  if (leaderTime && /^\d+$/.test(result.time) && /^\d+$/.test(leaderTime)) {
    const diff = parseInt(result.time, 10) - parseInt(leaderTime, 10)
    if (diff > 0) return `+${(diff / 1000).toFixed(3)}s`
  }
  return formatTime(result.time)
}

function getPitStopCount(driverId: string, pitStops: RaceClassificationProps["pitStops"]): number {
  return pitStops.filter((ps) => ps.driver.driver_id === driverId).length
}

function getTyreCompound(driverId: string, tireStints: RaceClassificationProps["tireStints"]): string | null {
  const driverStints = tireStints.filter((ts) => ts.driver.driver_id === driverId)
  if (driverStints.length === 0) return null
  return driverStints[driverStints.length - 1].compound || null
}

function ClassificationRow({
  result,
  index,
  pitStops,
  tireStints,
  leaderTime,
  isFastestLap,
}: {
  result: ResultWithJoins
  index: number
  pitStops: RaceClassificationProps["pitStops"]
  tireStints: RaceClassificationProps["tireStints"]
  leaderTime: string | null
  isFastestLap: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const c = getConstructorColorsFromRecord(result.constructor)
  const isWinner = result.position === 1
  const pitCount = getPitStopCount(result.driver.driver_id, pitStops)
  const tyreCompound = getTyreCompound(result.driver.driver_id, tireStints)
  const tyreStyle = tyreCompound ? getTyreStyle(tyreCompound) : null
  const statusStyle = getStatusStyle(result.status)
  const gap = computeGap(result, leaderTime)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.035, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <motion.div
        layout
        onClick={() => setExpanded(!expanded)}
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isWinner
            ? "ring-[1.5px] ring-yellow-500/40 shadow-lg shadow-yellow-500/5"
            : "hover:shadow-lg hover:shadow-black/15"
        }`}
        style={{
          borderRadius: "18px",
          background: isWinner
            ? "linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isWinner
            ? "1px solid rgba(234,179,8,0.2)"
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="absolute left-0 top-1 bottom-1 rounded-r-full"
          style={{
            width: "5px",
            background: `linear-gradient(180deg, ${c.primary}, ${c.secondary})`,
            boxShadow: `0 0 12px ${c.primary}40`,
          }}
        />

        <div className="relative pl-4 pr-4 py-2.5 md:py-3">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="flex items-center justify-center w-7 md:w-8 flex-shrink-0">
              <span
                className={`font-bold text-center ${isWinner ? "text-yellow-400" : "text-white/60"}`}
                style={{ fontSize: "0.85rem", fontFamily: "var(--font-heading)" }}
              >
                {result.position ?? result.position_text ?? "\u2014"}
              </span>
            </div>

            <div className="flex-shrink-0 relative">
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: "40px",
                  height: "40px",
                  border: isWinner ? "2px solid rgba(234,179,8,0.5)" : "2px solid rgba(255,255,255,0.2)",
                  boxShadow: isWinner
                    ? "0 0 20px rgba(234,179,8,0.15)"
                    : "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {result.driver.photo_url ? (
                  <img
                    src={result.driver.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-bold">
                      {result.driver.family_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {isFastestLap && (
                <div
                  className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                    boxShadow: "0 0 10px rgba(168,85,247,0.5)",
                  }}
                >
                  <span className="text-[8px] leading-none">⚡</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {result.driver.nationality && (
                  <img
                    src={getFlagUrl(result.driver.nationality) ?? ""}
                    alt=""
                    className="w-[18px] h-[12px] object-cover rounded-sm flex-shrink-0"
                  />
                )}
                <Link
                  to={`/drivers/${result.driver.driver_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`font-bold hover:underline truncate transition-colors ${
                    isWinner ? "text-yellow-300" : "text-white"
                  }`}
                  style={{ fontSize: "0.9rem", fontFamily: "var(--font-heading)" }}
                >
                  {result.driver.family_name.toUpperCase()}
                </Link>
                {isWinner && (
                  <span className="text-yellow-400/70 flex-shrink-0" style={{ fontSize: "0.75rem" }}>🏆</span>
                )}
              </div>
              <Link
                to={`/constructors/${result.constructor.constructor_id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-white/45 hover:text-white/70 hover:underline mt-0.5 transition-colors"
                style={{ fontSize: "0.65rem", fontFamily: "var(--font-team)" }}
              >
                {result.constructor.logo_url && (
                  <img
                    src={result.constructor.logo_url}
                    alt=""
                    className="object-contain"
                    style={{ height: "10px", width: "auto" }}
                  />
                )}
                <span className="truncate">{result.constructor.name}</span>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
              {tyreCompound && tyreStyle && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: tyreStyle.bg,
                    color: tyreStyle.text,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {tyreCompound === "intermediate" ? "Inter" : tyreCompound}
                </span>
              )}
              {pitCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-white/35 text-[11px]"
                >
                  <span>🛞</span>
                  ×{pitCount}
                </span>
              )}
              {isFastestLap && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: "rgba(168,85,247,0.12)",
                    color: "#c084fc",
                    border: "1px solid rgba(168,85,247,0.15)",
                  }}
                >
                  ⚡ FL
                </span>
              )}
            </div>

            <div className="text-right min-w-[52px] flex-shrink-0">
              <span
                className={`block font-bold leading-none ${isWinner ? "text-yellow-400" : "text-white"}`}
                style={{ fontSize: "0.9rem", fontFamily: "var(--font-heading)" }}
              >
                {result.points}
              </span>
              <span
                className="block text-white/35 uppercase tracking-wider leading-none mt-0.5"
                style={{ fontSize: "0.5rem" }}
              >
                pts
              </span>
            </div>

            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0 text-white/20"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </div>

          <div className="flex items-center justify-between mt-1.5 md:hidden">
            <div className="flex items-center gap-2">
              {tyreCompound && tyreStyle && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: tyreStyle.bg, color: tyreStyle.text }}
                >
                  {tyreCompound === "intermediate" ? "Inter" : tyreCompound}
                </span>
              )}
              {pitCount > 0 && (
                <span className="inline-flex items-center gap-1 text-white/35 text-[10px]">
                  <span>🛞</span>×{pitCount}
                </span>
              )}
              {isFastestLap && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                  style={{
                    backgroundColor: "rgba(168,85,247,0.12)",
                    color: "#c084fc",
                  }}
                >
                  ⚡ FL
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
              >
                {result.status || "Finished"}
              </span>
              <span className="font-mono text-white/50 text-[11px]">{gap}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between mt-1">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
              >
                {result.status || "Finished"}
              </span>
              {result.laps != null && (
                <span className="text-white/35 text-[11px] font-mono">
                  {result.laps} laps
                </span>
              )}
            </div>
            <span className="font-mono text-white/50 text-[11px]">{gap}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            style={{ marginTop: "-2px" }}
          >
            <div
              className="rounded-b-2xl px-4 py-4 md:py-5"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderTop: "none",
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {result.fastest_lap_time && (
                  <StatDetail
                    label="Fastest Lap"
                    value={
                      <span className="font-mono flex items-center gap-1">
                        {isFastestLap && <span style={{ color: "#a855f7" }}>⚡</span>}
                        {result.fastest_lap_time}
                      </span>
                    }
                  />
                )}
                <StatDetail
                  label="Grid"
                  value={`P${result.grid ?? "\u2014"}`}
                />
                <StatDetail
                  label="Laps Completed"
                  value={`${result.laps ?? "\u2014"}`}
                />
                {result.status && result.status !== "Finished" && (
                  <StatDetail
                    label="Status"
                    value={
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {result.status}
                      </span>
                    }
                  />
                )}
                {result.time && (
                  <StatDetail
                    label="Race Time"
                    value={formatTime(result.time)}
                    mono
                  />
                )}
                <StatDetail
                  label="Pit Stops"
                  value={`${pitCount}`}
                />
                <StatDetail
                  label="Starting Pos"
                  value={`P${result.grid ?? "\u2014"}`}
                />
                <StatDetail
                  label="Pos. Change"
                  value={
                    result.position != null && result.grid != null
                      ? result.position < result.grid
                        ? `+${result.grid - result.position}`
                        : result.position > result.grid
                          ? `${result.grid - result.position}`
                          : "\u2014"
                      : "\u2014"
                  }
                  accent={result.position != null && result.grid != null && result.position < result.grid ? "emerald" : undefined}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StatDetail({
  label,
  value,
  mono,
  accent,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  accent?: string
}) {
  return (
    <div>
      <span
        className="block text-white/35 text-[10px] uppercase tracking-[0.1em] mb-1"
        style={{ fontFamily: "var(--font-team)" }}
      >
        {label}
      </span>
      <span
        className={`block text-sm ${
          mono ? "font-mono" : "font-medium"
        } ${accent === "emerald" ? "text-emerald-400" : "text-white/85"}`}
        style={{ fontFamily: accent ? undefined : "var(--font-heading)" }}
      >
        {value}
      </span>
    </div>
  )
}

export default function RaceClassification({
  results,
  pitStops,
  tireStints,
}: RaceClassificationProps) {
  const leaderTime = useMemo(() => {
    const leader = results.find((r) => r.position === 1)
    return leader?.time ?? null
  }, [results])

  const fastestLapDriverId = useMemo(() => {
    const fl = results.find((r) => r.fastest_lap_rank === 1)
    return fl?.driver.driver_id ?? null
  }, [results])

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
  }, [results])

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/35 text-sm" style={{ fontFamily: "var(--font-team)" }}>
          No race classification data available yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-2xl mx-auto">
      {sorted.map((result, index) => (
        <ClassificationRow
          key={result.id}
          result={result}
          index={index}
          pitStops={pitStops}
          tireStints={tireStints}
          leaderTime={leaderTime}
          isFastestLap={result.driver.driver_id === fastestLapDriverId}
        />
      ))}
    </div>
  )
}
