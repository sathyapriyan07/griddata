import { supabase } from "./supabase"

export interface SearchResult {
  id: string
  type: "driver" | "constructor" | "circuit" | "race" | "season"
  label: string
  description: string
  href: string
  image?: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  const searchTerm = query.trim()
  const results: SearchResult[] = []

  const [driversRes, constructorsRes, circuitsRes, racesRes] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, driver_id, given_name, family_name, nationality, photo_url")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
    supabase
      .from("constructors")
      .select("id, constructor_id, name, nationality, logo_url")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
    supabase
      .from("circuits")
      .select("id, circuit_id, name, location, country")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
    supabase
      .from("races")
      .select("id, name, season_year, round")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
  ])

  const [driverWpRes, constructorWpRes, circuitWpRes] = await Promise.all([
    supabase
      .from("driver_wikipedia")
      .select("entity_id, short_description")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
    supabase
      .from("constructor_wikipedia")
      .select("entity_id, short_description")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
    supabase
      .from("circuit_wikipedia")
      .select("entity_id, short_description")
      .textSearch("search_vector", searchTerm, { type: "websearch" })
      .limit(5),
  ])

  const driverWpMap = new Map((driverWpRes.data ?? []).map((r) => [r.entity_id, r.short_description]))
  const constructorWpMap = new Map((constructorWpRes.data ?? []).map((r) => [r.entity_id, r.short_description]))
  const circuitWpMap = new Map((circuitWpRes.data ?? []).map((r) => [r.entity_id, r.short_description]))

  if (driversRes.data) {
    for (const d of driversRes.data) {
      results.push({
        id: d.id,
        type: "driver",
        label: `${d.given_name} ${d.family_name}`,
        description: driverWpMap.get(d.id) || d.nationality || "Driver",
        href: `/drivers/${d.driver_id}`,
        image: d.photo_url || undefined,
      })
    }
  }

  if (constructorsRes.data) {
    for (const c of constructorsRes.data) {
      results.push({
        id: c.id,
        type: "constructor",
        label: c.name,
        description: constructorWpMap.get(c.id) || c.nationality || "Constructor",
        href: `/constructors/${c.constructor_id}`,
        image: c.logo_url || undefined,
      })
    }
  }

  if (circuitsRes.data) {
    for (const c of circuitsRes.data) {
      results.push({
        id: c.id,
        type: "circuit",
        label: c.name,
        description: circuitWpMap.get(c.id) || `${c.location}, ${c.country}`,
        href: `/circuits/${c.circuit_id}`,
      })
    }
  }

  if (racesRes.data) {
    for (const r of racesRes.data) {
      results.push({
        id: r.id,
        type: "race",
        label: r.name,
        description: `${r.season_year} Round ${r.round}`,
        href: `/races/${r.id}`,
      })
    }
  }

  return results
}
