import type { RaceResult, ConstructorStanding } from "@/types/database"

export interface ConstructorStats {
  totalRaces: number
  wins: number
  podiums: number
  poles: number
  championships: number
  totalPoints: number
  winRate: number
  podiumRate: number
  bestSeason: { year: number; points: number } | null
  mostWinsSeason: { year: number; wins: number } | null
}

export interface ConstructorSeasonStats {
  season: number
  points: number
  position: number | null
  wins: number
  podiums: number
  driverPointsContribution: Array<{ driverId: string; points: number; percentage: number }>
}

export function computeConstructorStats(
  results: RaceResult[],
  standings: ConstructorStanding[]
): ConstructorStats {
  if (results.length === 0) {
    return {
      totalRaces: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
      championships: 0,
      totalPoints: 0,
      winRate: 0,
      podiumRate: 0,
      bestSeason: null,
      mostWinsSeason: null,
    }
  }

  const wins = results.filter((r) => r.position === 1).length
  const podiums = results.filter((r) => r.position !== null && r.position <= 3).length
  const totalPoints = results.reduce((sum, r) => sum + r.points, 0)

  const seasonStats = standings.reduce(
    (acc, s) => {
      if (!acc[s.season_year] || s.points > acc[s.season_year].points) {
        acc[s.season_year] = { year: s.season_year, points: s.points, wins: s.wins }
      }
      return acc
    },
    {} as Record<number, { year: number; points: number; wins: number }>
  )

  const seasons = Object.values(seasonStats)
  const bestSeason = seasons.length > 0
    ? seasons.reduce((best, s) => (s.points > best.points ? s : best))
    : null
  const mostWinsSeason = seasons.length > 0
    ? seasons.reduce((best, s) => (s.wins > best.wins ? s : best))
    : null

  return {
    totalRaces: results.length,
    wins,
    podiums,
    poles: 0,
    championships: standings.filter((s) => s.position === 1).length,
    totalPoints,
    winRate: results.length > 0 ? wins / results.length : 0,
    podiumRate: results.length > 0 ? podiums / results.length : 0,
    bestSeason,
    mostWinsSeason,
  }
}

export function computeConstructorSeasonStats(
  results: RaceResult[],
  season: number
): ConstructorSeasonStats {
  const seasonResults = results

  const wins = seasonResults.filter((r) => r.position === 1).length
  const podiums = seasonResults.filter((r) => r.position !== null && r.position <= 3).length
  const points = seasonResults.reduce((sum, r) => sum + r.points, 0)

  const driverPoints: Record<string, number> = {}
  seasonResults.forEach((r) => {
    driverPoints[r.driver_id] = (driverPoints[r.driver_id] || 0) + r.points
  })

  const driverPointsContribution = Object.entries(driverPoints).map(
    ([driverId, pts]) => ({
      driverId,
      points: pts,
      percentage: points > 0 ? pts / points : 0,
    })
  )

  return {
    season,
    points,
    position: null,
    wins,
    podiums,
    driverPointsContribution,
  }
}
