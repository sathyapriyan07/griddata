import { supabase } from "@/lib/supabase"
import type {
  WikipediaSummary, WikipediaImage, WikipediaSection,
  WikipediaInfobox, WikipediaCategory, WikipediaCoordinates,
  WikipediaRevision, WikipediaPage,
} from "@/types/wikipedia"

const WIKIPEDIA_REST = "https://en.wikipedia.org/api/rest_v1"
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

const FETCH_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 2000
const CONCURRENCY_LIMIT = 2

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.status === 429) {
        const waitMs = RETRY_DELAY * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }

      if (response.status === 404) return response
      if (!response.ok && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)))
        continue
      }

      return response
    } catch {
      if (attempt >= retries - 1) throw new Error(`Failed to fetch ${url} after ${retries} retries`)
      await new Promise((r) => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)))
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`)
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetchWithRetry(url)
    if (response.status === 404) return null
    return response.json() as Promise<T>
  } catch {
    return null
  }
}

export async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  const encoded = encodeURIComponent(title)
  const data = await fetchJson<WikipediaSummary & { type?: string }>(
    `${WIKIPEDIA_REST}/page/summary/${encoded}`
  )
  if (!data || data.type === "disambiguation" || data.type === "missing") return null
  return data as WikipediaSummary
}

export async function fetchWikipediaParse(title: string): Promise<{
  title: string; pageid: number; revid: number; displaytitle: string
  text: string; sections: WikipediaSection[]
  images: { ns: number; title: string }[]
  categories: { ns: number; title: string }[]
} | null> {
  const encoded = encodeURIComponent(title)
  const url = `${WIKIPEDIA_API}?action=parse&page=${encoded}&format=json&prop=text|sections|images|categories|revid|displaytitle&redirects=1&origin=*`
  const data = await fetchJson<{
    parse?: {
      title: string; pageid: number; revid: number; displaytitle: string
      text: { "*": string }; sections?: WikipediaSection[]
      images?: { ns: number; title: string }[]
      categories?: { ns: number; title: string }[]
    }
    error?: { code: string; info: string }
  }>(url)
  if (!data || data.error || !data.parse) return null
  return {
    title: data.parse.title,
    pageid: data.parse.pageid,
    revid: data.parse.revid,
    displaytitle: data.parse.displaytitle,
    text: data.parse.text["*"],
    sections: data.parse.sections ?? [],
    images: data.parse.images?.filter((i) => i.ns === 6) ?? [],
    categories: data.parse.categories ?? [],
  }
}

export async function fetchWikipediaInfobox(title: string): Promise<WikipediaInfobox | null> {
  const parse = await fetchWikipediaParse(title)
  if (!parse?.text) return null

  const infoboxMatch = parse.text.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table\s*>/i)
  if (!infoboxMatch) return null

  const infobox: WikipediaInfobox = {}
  const rowRegex = /<tr[^>]*>(?:<th[^>]*>(.*?)<\/th>)?\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRegex.exec(infoboxMatch[1])) !== null) {
    const key = rowMatch[1]?.replace(/<[^>]+>/g, "").trim()
    const value = rowMatch[2]?.replace(/<[^>]+>/g, "").trim()
    if (key && value) infobox[key] = value
  }
  return infobox
}

export async function fetchWikipediaSections(title: string): Promise<WikipediaSection[]> {
  const parse = await fetchWikipediaParse(title)
  return parse?.sections ?? []
}

export async function fetchWikipediaImages(title: string): Promise<WikipediaImage[]> {
  const parse = await fetchWikipediaParse(title)
  if (!parse?.images?.length) return []

  const results: WikipediaImage[] = []
  for (let i = 0; i < parse.images.length; i += 50) {
    const chunk = parse.images.slice(i, i + 50)
    const titles = chunk.map((t) => t.title)
    const url = `${WIKIPEDIA_API}?action=query&titles=${encodeURIComponent(titles.join("|"))}&prop=imageinfo&iiprop=url|extmetadata|dimensions|mime&format=json&origin=*`
    const data = await fetchJson<{
      query?: { pages?: Record<string, {
        title: string
        imageinfo?: { url: string; width: number; height: number; extmetadata?: { ImageDescription?: { value: string }; MIME?: { value: string } } }[]
      }> }
    }>(url)

    if (data?.query?.pages) {
      for (const page of Object.values(data.query.pages)) {
        if (page.imageinfo?.[0]) {
          const info = page.imageinfo[0]
          results.push({
            title: page.title,
            url: info.url,
            width: info.width || 0,
            height: info.height || 0,
            description: info.extmetadata?.ImageDescription?.value ?? null,
            mime: info.extmetadata?.MIME?.value ?? null,
          })
        }
      }
    }
  }

  return results
}

export async function fetchWikipediaCategories(title: string): Promise<WikipediaCategory[]> {
  const url = `${WIKIPEDIA_API}?action=query&titles=${encodeURIComponent(title)}&prop=categories&cllimit=500&format=json&origin=*`
  const data = await fetchJson<{ query?: { pages?: Record<string, { categories?: { title: string }[] }> } }>(url)
  if (!data?.query?.pages) return []
  const page = Object.values(data.query.pages)[0]
  if (!page?.categories) return []
  return page.categories.map((c) => ({ title: c.title, hidden: false }))
}

export async function fetchWikipediaRevision(title: string): Promise<WikipediaRevision | null> {
  const url = `${WIKIPEDIA_API}?action=query&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=ids|timestamp|user&format=json&origin=*&rvlimit=1`
  const data = await fetchJson<{ query?: { pages?: Record<string, { pageid: number; revisions?: { revid: number; parentid: number; timestamp: string; user: string }[] }> } }>(url)
  if (!data?.query?.pages) return null
  const page = Object.values(data.query.pages)[0]
  if (!page?.revisions?.[0]) return null
  return {
    pageid: page.pageid,
    revid: page.revisions[0].revid,
    parentid: page.revisions[0].parentid,
    timestamp: page.revisions[0].timestamp,
    user: page.revisions[0].user,
  }
}

export async function fetchWikipediaCoordinates(title: string): Promise<WikipediaCoordinates | null> {
  const url = `${WIKIPEDIA_API}?action=query&titles=${encodeURIComponent(title)}&prop=coordinates&format=json&origin=*`
  const data = await fetchJson<{ query?: { pages?: Record<string, { coordinates?: { lat: number; lon: number }[] }> } }>(url)
  if (!data?.query?.pages) return null
  const page = Object.values(data.query.pages)[0]
  if (!page?.coordinates?.[0]) return null
  return { lat: page.coordinates[0].lat, lon: page.coordinates[0].lon }
}

export async function fetchWikipediaPage(title: string): Promise<WikipediaPage | null> {
  const summary = await fetchWikipediaSummary(title)
  if (!summary) return null

  const parse = await fetchWikipediaParse(title)

  if (!parse) {
    return {
      pageid: summary.pageid,
      title: summary.title,
      display_title: summary.display_title,
      summary,
      infobox: null,
      sections: [],
      content: null,
      images: [],
      categories: [],
      coordinates: null,
      revision: null,
      page_url: summary.content_urls?.desktop?.page ?? buildPageUrl(summary.title),
      extract: summary.extract ?? null,
      short_description: summary.description ?? null,
    }
  }

  const [images, categories, coordinates, revision] = await Promise.all([
    fetchWikipediaImages(title),
    fetchWikipediaCategories(title),
    fetchWikipediaCoordinates(title),
    fetchWikipediaRevision(title),
  ])

  const infobox = await fetchWikipediaInfobox(title)

  return {
    pageid: parse.pageid,
    title: parse.title,
    display_title: parse.displaytitle,
    summary,
    infobox,
    sections: parse.sections,
    content: parse.text,
    images,
    categories,
    coordinates,
    revision,
    page_url: summary.content_urls?.desktop?.page ?? buildPageUrl(parse.title),
    extract: summary.extract ?? null,
    short_description: summary.description ?? null,
  }
}

function buildPageUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
}

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = CONCURRENCY_LIMIT,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

async function getExistingRevision(
  table: string,
  entityId: string | number,
): Promise<number | null> {
  const { data } = await supabase
    .from(table)
    .select("revision_id")
    .eq("entity_id" as never, entityId as never)
    .maybeSingle()
  if (data && "revision_id" in (data as Record<string, unknown>)) {
    return (data as { revision_id: number | null }).revision_id
  }
  return null
}

function makeRecord(
  page: WikipediaPage | null,
  entityId: string | number,
  title: string,
  pageUrl: string,
  meta?: Record<string, unknown>,
): Record<string, unknown> {
  if (!page) {
    return {
      entity_id: entityId,
      title,
      summary: null, content: null, sections: null, infobox: null, images: null,
      references: null, categories: null, coordinates: null,
      revision_id: null, last_updated: null,
      page_url: pageUrl, short_description: null,
      metadata: meta ?? null,
    }
  }

  return {
    entity_id: entityId,
    title: page.title,
    summary: page.extract?.substring(0, 10000) ?? null,
    content: null,
    sections: page.sections.length > 0 ? page.sections : null,
    infobox: page.infobox as Record<string, unknown> | null,
    images: page.images.length > 0 ? page.images : null,
    references: null,
    categories: page.categories.length > 0 ? page.categories : null,
    coordinates: page.coordinates as Record<string, unknown> | null,
    revision_id: page.revision?.revid ?? null,
    last_updated: page.revision?.timestamp ?? null,
    page_url: page.page_url,
    short_description: page.short_description,
    metadata: meta ?? null,
  }
}

async function upsertRecord(table: string, record: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase.from(table).upsert(record as never, {
    onConflict: "entity_id",
    ignoreDuplicates: false,
  })
  return !error
}

async function tryFetchPage(titles: string[]): Promise<WikipediaPage | null> {
  for (const t of titles) {
    const page = await fetchWikipediaPage(t)
    if (page) return page
  }
  return null
}

export async function importDriverWikipedia(
  driverId?: string,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let query = supabase.from("drivers").select("id, driver_id, given_name, family_name, nationality")
  if (driverId) query = query.eq("driver_id", driverId)
  const { data: drivers } = await query
  if (!drivers?.length) return { imported: 0, skipped: 0, errors: 0 }

  const list = drivers as { id: string; driver_id: string; given_name: string; family_name: string; nationality: string | null }[]
  let imported = 0, skipped = 0, errors = 0

  const pages = await processBatch(list, (d) =>
    tryFetchPage([`${d.given_name} ${d.family_name}`, `${d.given_name}_${d.family_name}`])
  )

  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    try {
      const existingRev = await getExistingRevision("driver_wikipedia", d.id)
      const page = pages[i]
      if (page && existingRev && page.revision && page.revision.revid <= existingRev) {
        skipped++; continue
      }
      const ok = await upsertRecord("driver_wikipedia", makeRecord(
        page, d.id, `${d.given_name} ${d.family_name}`, buildPageUrl(`${d.given_name} ${d.family_name}`)
      ))
      if (ok) imported++; else errors++
    } catch { errors++ }
  }
  return { imported, skipped, errors }
}

export async function importConstructorWikipedia(
  constructorId?: string,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let query = supabase.from("constructors").select("id, constructor_id, name, full_name")
  if (constructorId) query = query.eq("constructor_id", constructorId)
  const { data: constructors } = await query
  if (!constructors?.length) return { imported: 0, skipped: 0, errors: 0 }

  const list = constructors as { id: string; constructor_id: string; name: string; full_name: string | null }[]
  let imported = 0, skipped = 0, errors = 0

  const pages = await processBatch(list, (c) =>
    tryFetchPage([c.full_name, c.name, `${c.name} Formula One team`].filter(Boolean) as string[])
  )

  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    try {
      const existingRev = await getExistingRevision("constructor_wikipedia", c.id)
      const page = pages[i]
      if (page && existingRev && page.revision && page.revision.revid <= existingRev) {
        skipped++; continue
      }
      const ok = await upsertRecord("constructor_wikipedia", makeRecord(
        page, c.id, c.name, buildPageUrl(c.full_name ?? c.name)
      ))
      if (ok) imported++; else errors++
    } catch { errors++ }
  }
  return { imported, skipped, errors }
}

export async function importCircuitWikipedia(
  circuitId?: string,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let query = supabase.from("circuits").select("id, circuit_id, name, country")
  if (circuitId) query = query.eq("circuit_id", circuitId)
  const { data: circuits } = await query
  if (!circuits?.length) return { imported: 0, skipped: 0, errors: 0 }

  const list = circuits as { id: string; circuit_id: string; name: string; country: string | null }[]
  let imported = 0, skipped = 0, errors = 0

  const pages = await processBatch(list, (c) =>
    tryFetchPage([`${c.name}${c.country ? ` (${c.country})` : ""}`, c.name, `${c.name}_Grand_Prix`])
  )

  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    try {
      const existingRev = await getExistingRevision("circuit_wikipedia", c.id)
      const page = pages[i]
      if (page && existingRev && page.revision && page.revision.revid <= existingRev) {
        skipped++; continue
      }
      const ok = await upsertRecord("circuit_wikipedia", makeRecord(
        page, c.id, c.name, buildPageUrl(c.name)
      ))
      if (ok) imported++; else errors++
    } catch { errors++ }
  }
  return { imported, skipped, errors }
}

export async function importRaceWikipedia(
  season?: number,
  round?: number,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let query = supabase
    .from("races")
    .select("id, name, season_year, round, circuits!inner(name, country)")
  if (season && round) query = query.eq("season_year", season).eq("round", round)
  else if (season) query = query.eq("season_year", season)

  const { data: races } = await query
  if (!races?.length) return { imported: 0, skipped: 0, errors: 0 }

  const list = races as unknown as { id: string; name: string; season_year: number; round: number; circuits: { name: string; country: string | null } }[]
  let imported = 0, skipped = 0, errors = 0

  const pages = await processBatch(list, (r) =>
    tryFetchPage([`${r.season_year}_${r.name}`, `${r.name}_${r.season_year}`, r.name])
  )

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    try {
      const existingRev = await getExistingRevision("race_wikipedia", r.id)
      const page = pages[i]
      if (page && existingRev && page.revision && page.revision.revid <= existingRev) {
        skipped++; continue
      }
      const ok = await upsertRecord("race_wikipedia", makeRecord(
        page, r.id, `${r.season_year} ${r.name}`, buildPageUrl(`${r.season_year}_${r.name}`),
        { season_year: r.season_year, round: r.round }
      ))
      if (ok) imported++; else errors++
    } catch { errors++ }
  }
  return { imported, skipped, errors }
}

export async function importSeasonWikipedia(
  seasonYear?: number,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let query = supabase.from("seasons").select("year")
  if (seasonYear) query = query.eq("year", seasonYear)
  const { data: seasons } = await query
  if (!seasons?.length) return { imported: 0, skipped: 0, errors: 0 }

  const list = seasons as { year: number }[]
  let imported = 0, skipped = 0, errors = 0

  const pages = await processBatch(list, (s) =>
    tryFetchPage([`${s.year}_Formula_One_World_Championship`, `${s.year}_Formula_One_season`])
  )

  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    try {
      const existingRev = await getExistingRevision("season_wikipedia", s.year)
      const page = pages[i]
      if (page && existingRev && page.revision && page.revision.revid <= existingRev) {
        skipped++; continue
      }
      const ok = await upsertRecord("season_wikipedia", makeRecord(
        page, s.year, `${s.year} Formula One World Championship`,
        buildPageUrl(`${s.year}_Formula_One_World_Championship`)
      ))
      if (ok) imported++; else errors++
    } catch { errors++ }
  }
  return { imported, skipped, errors }
}

export async function syncWikipediaHistorical(): Promise<{
  drivers: { imported: number; skipped: number; errors: number }
  constructors: { imported: number; skipped: number; errors: number }
  circuits: { imported: number; skipped: number; errors: number }
  seasons: { imported: number; skipped: number; errors: number }
}> {
  const [drivers, constructors, circuits, seasons] = await Promise.all([
    importDriverWikipedia(),
    importConstructorWikipedia(),
    importCircuitWikipedia(),
    importSeasonWikipedia(),
  ])
  return { drivers, constructors, circuits, seasons }
}

export async function syncWikipediaSeason(season: number): Promise<{
  races: { imported: number; skipped: number; errors: number }
  season: { imported: number; skipped: number; errors: number }
}> {
  const [races, seasonResult] = await Promise.all([
    importRaceWikipedia(season),
    importSeasonWikipedia(season),
  ])
  return { races, season: seasonResult }
}

export async function syncWikipediaDriver(driverId: string): Promise<{
  imported: number; skipped: number; errors: number
}> {
  return importDriverWikipedia(driverId)
}

export async function syncWikipediaConstructor(constructorId: string): Promise<{
  imported: number; skipped: number; errors: number
}> {
  return importConstructorWikipedia(constructorId)
}

export async function syncWikipediaCircuit(circuitId: string): Promise<{
  imported: number; skipped: number; errors: number
}> {
  return importCircuitWikipedia(circuitId)
}

export async function syncWikipediaRace(season: number, round: number): Promise<{
  imported: number; skipped: number; errors: number
}> {
  return importRaceWikipedia(season, round)
}
