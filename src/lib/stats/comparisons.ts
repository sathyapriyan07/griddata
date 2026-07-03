import type { RaceResult, QualifyingResult } from "@/types/database"

export interface TeammateComparison {
  season: number
  driver1Id: string
  driver2Id: string
  constructorId: string
  racesTogether: number
  qualiHeadToHead: { driver1Wins: number; driver2Wins: number }
  raceHeadToHead: { driver1Wins: number; driver2Wins: number }
  driver1AvgFinish: number | null
  driver2AvgFinish: number | null
  driver1Points: number
  driver2Points: number
}

export interface RivalryStats {
  driver1Wins: number
  driver2Wins: number
  driver1Podiums: number
  driver2Podiums: number
  driver1AvgFinish: number | null
  driver2AvgFinish: number | null
  racesTogether: number
  headToHeadRace: { driver1Wins: number; driver2Wins: number }
  headToHeadQuali: { driver1Wins: number; driver2Wins: number }
}

export function compareDrivers(
  driver1Results: RaceResult[],
  driver2Results: RaceResult[],
  driver1Quali: QualifyingResult[],
  driver2Quali: QualifyingResult[]
): RivalryStats {
  const driver1Wins = driver1Results.filter((r) => r.position === 1).length
  const driver2Wins = driver2Results.filter((r) => r.position === 1).length
  const driver1Podiums = driver1Results.filter((r) => r.position !== null && r.position <= 3).length
  const driver2Podiums = driver2Results.filter((r) => r.position !== null && r.position <= 3).length

  const d1Finished = driver1Results.filter((r) => r.position !== null)
  const d2Finished = driver2Results.filter((r) => r.position !== null)

  const d1Avg =
    d1Finished.length > 0
      ? d1Finished.reduce((a, b) => a + b.position!, 0) / d1Finished.length
      : null
  const d2Avg =
    d2Finished.length > 0
      ? d2Finished.reduce((a, b) => a + b.position!, 0) / d2Finished.length
      : null

  const raceIds1 = new Set(driver1Results.map((r) => r.race_id))
  const raceIds2 = new Set(driver2Results.map((r) => r.race_id))
  const commonRaces = [...raceIds1].filter((id) => raceIds2.has(id))

  let raceH2H: { driver1Wins: number; driver2Wins: number } = {
    driver1Wins: 0,
    driver2Wins: 0,
  }
  let qualiH2H: { driver1Wins: number; driver2Wins: number } = {
    driver1Wins: 0,
    driver2Wins: 0,
  }

  for (const raceId of commonRaces) {
    const r1 = driver1Results.find((r) => r.race_id === raceId)
    const r2 = driver2Results.find((r) => r.race_id === raceId)
    if (r1?.position && r2?.position) {
      if (r1.position < r2.position) raceH2H.driver1Wins++
      else if (r2.position < r1.position) raceH2H.driver2Wins++
    }

    const q1 = driver1Quali.find((q) => q.race_id === raceId)
    const q2 = driver2Quali.find((q) => q.race_id === raceId)
    if (q1?.position && q2?.position) {
      if (q1.position < q2.position) qualiH2H.driver1Wins++
      else if (q2.position < q1.position) qualiH2H.driver2Wins++
    }
  }

  return {
    driver1Wins,
    driver2Wins,
    driver1Podiums,
    driver2Podiums,
    driver1AvgFinish: d1Avg,
    driver2AvgFinish: d2Avg,
    racesTogether: commonRaces.length,
    headToHeadRace: raceH2H,
    headToHeadQuali: qualiH2H,
  }
}

export function getTeammateComparisons(
  results: RaceResult[],
  qualifying: QualifyingResult[],
  driverId: string,
  constructorId: string,
  season: number
): TeammateComparison | null {
  const teammateResults = results.filter(
    (r) => r.constructor_id === constructorId && r.driver_id !== driverId
  )

  if (teammateResults.length === 0) return null

  const teammateId = teammateResults[0].driver_id

  const driverResults = results.filter((r) => r.driver_id === driverId)
  const teammateRaceResults = results.filter((r) => r.driver_id === teammateId)

  const raceIds1 = new Set(driverResults.map((r) => r.race_id))
  const raceIds2 = new Set(teammateRaceResults.map((r) => r.race_id))
  const commonRaces = [...raceIds1].filter((id) => raceIds2.has(id))

  let raceH2H: { driver1Wins: number; driver2Wins: number } = {
    driver1Wins: 0,
    driver2Wins: 0,
  }
  let qualiH2H: { driver1Wins: number; driver2Wins: number } = {
    driver1Wins: 0,
    driver2Wins: 0,
  }

  for (const raceId of commonRaces) {
    const r1 = driverResults.find((r) => r.race_id === raceId)
    const r2 = teammateRaceResults.find((r) => r.race_id === raceId)
    if (r1?.position && r2?.position) {
      if (r1.position < r2.position) raceH2H.driver1Wins++
      else if (r2.position < r1.position) raceH2H.driver2Wins++
    }

    const q1 = qualifying.find((q) => q.race_id === raceId && q.driver_id === driverId)
    const q2 = qualifying.find((q) => q.race_id === raceId && q.driver_id === teammateId)
    if (q1?.position && q2?.position) {
      if (q1.position < q2.position) qualiH2H.driver1Wins++
      else if (q2.position < q1.position) qualiH2H.driver2Wins++
    }
  }

  const d1Finished = driverResults.filter((r) => r.position !== null)
  const d2Finished = teammateRaceResults.filter((r) => r.position !== null)

  return {
    season,
    driver1Id: driverId,
    driver2Id: teammateId,
    constructorId,
    racesTogether: commonRaces.length,
    qualiHeadToHead: qualiH2H,
    raceHeadToHead: raceH2H,
    driver1AvgFinish:
      d1Finished.length > 0
        ? d1Finished.reduce((a, b) => a + b.position!, 0) / d1Finished.length
        : null,
    driver2AvgFinish:
      d2Finished.length > 0
        ? d2Finished.reduce((a, b) => a + b.position!, 0) / d2Finished.length
        : null,
    driver1Points: driverResults.reduce((s, r) => s + r.points, 0),
    driver2Points: teammateRaceResults.reduce((s, r) => s + r.points, 0),
  }
}
