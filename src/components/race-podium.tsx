import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { getFlagUrl } from "@/lib/nationalityFlags"
import { getConstructorColorsFromRecord } from "@/lib/constructorColors"
import type { RaceResult } from "@/types/database"

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

interface RacePodiumProps {
  podium: ResultWithJoins[]
  podiumCardImageMap: Map<string, string>
}

function formatGap(result: ResultWithJoins, winnerTime?: string | null): string {
  if (result.position === 1) {
    return result.time || "\u2014"
  }
  if (result.time && winnerTime && result.time !== winnerTime) {
    const gapMatch = result.time.match(/^\+?([\d.]+)/)
    if (gapMatch) return `+${gapMatch[1]}s`
    return result.time
  }
  if (result.time) return result.time
  return "\u2014"
}

function PodiumCard({
  result,
  cardImage,
  isWinner,
  delay,
}: {
  result: ResultWithJoins
  cardImage?: string
  isWinner?: boolean
  delay: number
}) {
  const c = getConstructorColorsFromRecord(result.constructor)
  const driverNumber = result.driver.code?.replace(/\D/g, "") || result.driver.code || ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden group ${isWinner ? "flex-[1.4]" : "flex-1"} max-md:flex-none max-md:w-full`}
      style={{ borderRadius: "24px" }}
    >
      <div
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02]"
        style={{ background: `linear-gradient(180deg, ${c.primary} 0%, ${c.secondary} 100%)` }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.05) 6px, rgba(255,255,255,0.05) 12px),
            repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,0.03) 6px, rgba(255,255,255,0.03) 12px)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse 100% 60% at 50% 0%, ${c.accent}, transparent 70%)`,
        }}
      />

      {driverNumber && (
        <div
          className="absolute top-0 right-2 font-bold leading-none select-none pointer-events-none"
          style={{
            fontSize: isWinner ? "clamp(6rem, 18vw, 10rem)" : "clamp(4rem, 12vw, 6rem)",
            color: c.accent,
            opacity: 0.06,
            fontFamily: "var(--font-heading)",
            lineHeight: 0.85,
          }}
        >
          {driverNumber}
        </div>
      )}

      <div className="absolute top-3 left-3 z-20">
        <div
          className="inline-flex items-center justify-center rounded-full font-bold backdrop-blur-md"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: isWinner ? "0.8rem" : "0.65rem",
            padding: isWinner ? "5px 16px" : "4px 12px",
            letterSpacing: "0.08em",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          P{result.position}
        </div>
      </div>

      {cardImage && (
        <div className="flex justify-center pt-6 md:pt-8">
          <img
            src={cardImage}
            alt=""
            className="object-contain drop-shadow-2xl select-none pointer-events-none"
            style={{
              height: isWinner ? "clamp(120px, 30vw, 220px)" : "clamp(90px, 22vw, 160px)",
              maskImage: "linear-gradient(to bottom, black 50%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 95%)",
            }}
            loading="lazy"
          />
        </div>
      )}

      {!cardImage && result.driver.photo_url && (
        <div className="flex justify-center pt-6 md:pt-8">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${c.accent}40, transparent 70%)`,
                transform: "scale(1.4)",
              }}
            />
            <img
              src={result.driver.photo_url}
              alt=""
              className="object-cover rounded-full relative"
              style={{
                width: isWinner ? "clamp(80px, 20vw, 140px)" : "clamp(60px, 15vw, 110px)",
                height: isWinner ? "clamp(80px, 20vw, 140px)" : "clamp(60px, 15vw, 110px)",
                border: "3px solid rgba(255,255,255,0.25)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
              }}
            />
          </div>
        </div>
      )}

      <div className="relative z-10 p-4 md:p-5 pt-2 md:pt-3">
        <Link
          to={`/drivers/${result.driver.driver_id}`}
          className="block font-bold text-white hover:underline leading-tight transition-opacity duration-200 hover:opacity-90"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: isWinner ? "clamp(1.2rem, 3.5vw, 1.8rem)" : "clamp(0.9rem, 2.5vw, 1.25rem)",
          }}
        >
          {result.driver.family_name.toUpperCase()}
        </Link>

        <div
          className="flex items-center gap-1.5 mt-1"
          style={{ fontSize: isWinner ? "0.8rem" : "0.7rem" }}
        >
          {result.driver.nationality && (
            <img
              src={getFlagUrl(result.driver.nationality) ?? ""}
              alt=""
              className="w-4 h-3 object-cover rounded-sm"
            />
          )}
          <Link
            to={`/constructors/${result.constructor.constructor_id}`}
            className="text-white/60 hover:text-white/85 hover:underline inline-flex items-center gap-1.5 transition-colors"
            style={{ fontFamily: "var(--font-team)" }}
          >
            {result.constructor.logo_url && (
              <img
                src={result.constructor.logo_url}
                alt=""
                className="object-contain"
                style={{ height: isWinner ? "14px" : "11px" }}
              />
            )}
            <span className="truncate">{result.constructor.name}</span>
          </Link>
        </div>

        <div
          className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <span
              className="block text-white/40 text-[10px] uppercase tracking-[0.12em] mb-0.5"
              style={{ fontFamily: "var(--font-team)" }}
            >
              {result.position === 1 ? "Time" : "Gap"}
            </span>
            <span
              className="font-mono text-white/85 font-medium tracking-tight"
              style={{ fontSize: isWinner ? "0.85rem" : "0.7rem" }}
            >
              {result.position === 1 ? result.time || "\u2014" : formatGap(result)}
            </span>
          </div>
          <div className="text-right">
            <span
              className="block text-white/40 text-[10px] uppercase tracking-[0.12em] mb-0.5"
              style={{ fontFamily: "var(--font-team)" }}
            >
              Points
            </span>
            <span
              className="font-bold text-white block leading-none"
              style={{ fontSize: isWinner ? "1.35rem" : "1.05rem" }}
            >
              {result.points}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function RacePodium({ podium, podiumCardImageMap }: RacePodiumProps) {
  if (podium.length === 0) return null

  const p1 = podium.find((r) => r.position === 1)
  const p2 = podium.find((r) => r.position === 2)
  const p3 = podium.find((r) => r.position === 3)

  return (
    <div className="flex flex-col md:flex-row items-end justify-center gap-3 md:gap-3 max-w-2xl mx-auto">
      {p2 && (
        <PodiumCard result={p2} cardImage={podiumCardImageMap.get(p2.driver.driver_id)} delay={0.15} />
      )}
      {p1 && (
        <PodiumCard
          result={p1}
          cardImage={podiumCardImageMap.get(p1.driver.driver_id)}
          isWinner
          delay={0}
        />
      )}
      {p3 && (
        <PodiumCard result={p3} cardImage={podiumCardImageMap.get(p3.driver.driver_id)} delay={0.3} />
      )}
    </div>
  )
}
