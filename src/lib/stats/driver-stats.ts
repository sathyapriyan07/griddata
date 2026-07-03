import type { RaceResult, SprintResult } from "@/types/database"

export interface DriverCareerStats {
  totalRaces: number
  wins: number
  podiums: number
  poles: number
  fastestLaps: number
  championships: number
  totalPoints: number
  avgFinishingPosition: number | null
  winRate: number
  podiumRate: number
  poleConversionRate: number | null
  winFromPoleRate: number | null
  avgGridPosition: number | null
  positionsGained: number
  dnfCount: number
  pointsFinishes: number
  seasonsActive: number[]
  totalSprints: number
  sprintWins: number
  sprintPodiums: number
  sprintPoints: number
}

export interface SprintStats {
  totalSprints: number
  wins: number
  podiums: number
  points: number
  avgFinishingPosition: number | null
  winRate: number
  podiumRate: number
}

export interface DriverSeasonStats {
  season: number
  team: string
  races: number
  wins: number
  podiums: number
  points: number
  position: number | null
  avgFinishingPosition: number | null
  winRate: number
  podiumRate: number
  teammateQualiComparison: { won: number; lost: number }
  teammateRaceComparison: { won: number; lost: number }
  sprints: number
  sprintWins: number
  sprintPodiums: number
  sprintPoints: number
}

export function computeDriverCareerStats(
  results: RaceResult[],
  sprints: SprintResult[] = []
): DriverCareerStats {
  if (results.length === 0) {
    return {
      totalRaces: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0,
      championships: 0, totalPoints: 0, avgFinishingPosition: null,
      winRate: 0, podiumRate: 0, poleConversionRate: null,
      winFromPoleRate: null, avgGridPosition: null, positionsGained: 0,
      dnfCount: 0, pointsFinishes: 0, seasonsActive: [],
      totalSprints: 0, sprintWins: 0, sprintPodiums: 0, sprintPoints: 0,
    }
  }

  const finished = results.filter((r) => r.position !== null)
  const dnfCount = results.filter((r) => r.status && r.status !== "Finished").length
  const pointsFinishes = results.filter((r) => r.points > 0).length

  const finishingPositions = finished.map((r) => r.position!).sort((a, b) => a - b)
  const gridPositions = results.filter((r) => r.grid !== null).map((r) => r.grid!)
  const points = results.reduce((sum, r) => sum + r.points, 0)

  const wins = results.filter((r) => r.position === 1).length
  const podiums = results.filter((r) => r.position !== null && r.position <= 3).length
  const positionsGained = results
    .filter((r) => r.grid !== null && r.position !== null)
    .reduce((sum, r) => sum + Math.max(0, r.grid! - r.position!), 0)

  const avgFinish =
    finishingPositions.length > 0
      ? finishingPositions.reduce((a, b) => a + b, 0) / finishingPositions.length
      : null

  const avgGrid =
    gridPositions.length > 0
      ? gridPositions.reduce((a, b) => a + b, 0) / gridPositions.length
      : null

  const sprintWins = sprints.filter((s) => s.position === 1).length
  const sprintPodiums = sprints.filter((s) => s.position !== null && s.position <= 3).length
  const sprintPoints = sprints.reduce((sum, s) => sum + s.points, 0)

  return {
    totalRaces: results.length,
    wins, podiums,
    poles: 0, fastestLaps: 0, championships: 0,
    totalPoints: points,
    avgFinishingPosition: avgFinish,
    winRate: results.length > 0 ? wins / results.length : 0,
    podiumRate: results.length > 0 ? podiums / results.length : 0,
    poleConversionRate: null, winFromPoleRate: null,
    avgGridPosition: avgGrid, positionsGained,
    dnfCount, pointsFinishes, seasonsActive: [],
    totalSprints: sprints.length, sprintWins, sprintPodiums, sprintPoints,
  }
}

export function computeSprintStats(sprints: SprintResult[]): SprintStats {
  const finished = sprints.filter((s) => s.position !== null)
  const wins = sprints.filter((s) => s.position === 1).length
  const podiums = sprints.filter((s) => s.position !== null && s.position <= 3).length
  const points = sprints.reduce((sum, s) => sum + s.points, 0)
  const avgFinish =
    finished.length > 0
      ? finished.reduce((a, b) => a + b.position!, 0) / finished.length
      : null

  return {
    totalSprints: sprints.length,
    wins, podiums, points,
    avgFinishingPosition: avgFinish,
    winRate: sprints.length > 0 ? wins / sprints.length : 0,
    podiumRate: sprints.length > 0 ? podiums / sprints.length : 0,
  }
}

export function computeDriverSeasonStats(
  results: RaceResult[],
  season: number
): DriverSeasonStats {
  const seasonResults = results.filter(
    (r) => r.race_id && season
  )

  const wins = seasonResults.filter((r) => r.position === 1).length
  const podiums = seasonResults.filter((r) => r.position !== null && r.position <= 3).length
  const points = seasonResults.reduce((sum, r) => sum + r.points, 0)

  const finished = seasonResults.filter((r) => r.position !== null)
  const avgFinish =
    finished.length > 0
      ? finished.reduce((a, b) => a + b.position!, 0) / finished.length
      : null

  return {
    season,
    team: "",
    races: seasonResults.length,
    wins,
    podiums,
    points,
    position: null,
    avgFinishingPosition: avgFinish,
    winRate: seasonResults.length > 0 ? wins / seasonResults.length : 0,
    podiumRate: seasonResults.length > 0 ? podiums / seasonResults.length : 0,
    teammateQualiComparison: { won: 0, lost: 0 },
    teammateRaceComparison: { won: 0, lost: 0 },
  }
}
