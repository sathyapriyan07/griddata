import type { RaceResult } from "@/types/database"

export interface Milestone {
  type: string
  description: string
  achievedAt: string | null
  round: number | null
  raceName: string | null
  seasonYear: number | null
}

export interface Streak {
  type: "wins" | "podiums" | "points"
  length: number
  start: string | null
  end: string | null
  active: boolean
}

export function detectMilestones(results: (RaceResult & { races?: { season_year?: number; round?: number; name?: string } })[]): Milestone[] {
  const milestones: Milestone[] = []
  const sorted = [...results].sort((a, b) => {
    const aYear = a.races?.season_year ?? 0
    const bYear = b.races?.season_year ?? 0
    if (aYear !== bYear) return aYear - bYear
    return (a.races?.round ?? 0) - (b.races?.round ?? 0)
  })

  let winCount = 0
  let podiumCount = 0
  let raceCount = 0

  const milestoneNumbers = [1, 10, 25, 50, 100, 150, 200, 250, 300]

  for (const result of sorted) {
    raceCount++
    const raceName = result.races?.name ?? null
    const seasonYear = result.races?.season_year ?? null
    const round = result.races?.round ?? null
    if (result.position === 1) {
      winCount++
      if (milestoneNumbers.includes(winCount)) {
        milestones.push({
          type: "wins",
          description: `${winCount}${getOrdinal(winCount)} career win`,
          achievedAt: null,
          round,
          raceName,
          seasonYear,
        })
      }
    }
    if (result.position !== null && result.position <= 3) {
      podiumCount++
      if (milestoneNumbers.includes(podiumCount)) {
        milestones.push({
          type: "podiums",
          description: `${podiumCount}${getOrdinal(podiumCount)} career podium`,
          achievedAt: null,
          round,
          raceName,
          seasonYear,
        })
      }
    }
    if (milestoneNumbers.includes(raceCount)) {
      milestones.push({
        type: "races",
        description: `${raceCount}${getOrdinal(raceCount)} career race`,
        achievedAt: null,
        round,
        raceName,
        seasonYear,
      })
    }
  }

  return milestones
}

export function getStreaks(
  results: (RaceResult & { races?: { season_year?: number; round?: number; name?: string } })[],
  type: "wins" | "podiums" | "points"
): Streak[] {
  const sorted = [...results].sort((a, b) => {
    const aYear = a.races?.season_year ?? 0
    const bYear = b.races?.season_year ?? 0
    if (aYear !== bYear) return aYear - bYear
    return (a.races?.round ?? 0) - (b.races?.round ?? 0)
  })
  const streaks: Streak[] = []
  let currentStreak = 0
  let currentStart: string | null = null

  for (const result of sorted) {
    let qualifies = false
    if (type === "wins") qualifies = result.position === 1
    else if (type === "podiums")
      qualifies = result.position !== null && result.position <= 3
    else if (type === "points") qualifies = result.points > 0

    if (qualifies) {
      if (currentStreak === 0) currentStart = null
      currentStreak++
    } else {
      if (currentStreak > 0) {
        streaks.push({
          type,
          length: currentStreak,
          start: currentStart,
          end: null,
          active: false,
        })
      }
      currentStreak = 0
      currentStart = null
    }
  }

  if (currentStreak > 0) {
    streaks.push({
      type,
      length: currentStreak,
      start: currentStart,
      end: null,
      active: true,
    })
  }

  return streaks.sort((a, b) => b.length - a.length)
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
