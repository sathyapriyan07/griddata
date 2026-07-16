export interface WikipediaSummary {
  title: string
  display_title: string
  short_description: string | null
  extract: string
  extract_html: string | null
  thumbnail: { source: string; width: number; height: number } | null
  originalimage: { source: string; width: number; height: number } | null
  lang: string
  dir: string
  pageid: number
  revision: string
  tid: string
  timestamp: string
  description: string | null
  content_urls: {
    desktop: { page: string; revisions: string; edit: string }
    mobile: { page: string; revisions: string; edit: string }
  } | null
}

export interface WikipediaImage {
  title: string
  url: string
  width: number
  height: number
  description: string | null
  mime: string | null
}

export interface WikipediaSection {
  id: number
  toclevel: number
  level: string
  line: string
  number: string
  index: string
  fromtitle: string
  byteoffset: number | null
  anchor: string
}

export interface WikipediaInfobox {
  [key: string]: string | string[] | { value: string; caption?: string } | undefined
}

export interface WikipediaCategory {
  title: string
  hidden: boolean
}

export interface WikipediaCoordinates {
  lat: number
  lon: number
}

export interface WikipediaRevision {
  pageid: number
  revid: number
  parentid: number
  timestamp: string
  user: string
}

export interface WikipediaPage {
  pageid: number
  title: string
  display_title: string
  summary: WikipediaSummary | null
  infobox: WikipediaInfobox | null
  sections: WikipediaSection[]
  content: string | null
  images: WikipediaImage[]
  categories: WikipediaCategory[]
  coordinates: WikipediaCoordinates | null
  revision: WikipediaRevision | null
  page_url: string
  extract: string | null
  short_description: string | null
}

export interface WikipediaEntity {
  id: string
  entity_id: string
  title: string
  summary: string | null
  content: Record<string, string> | null
  sections: WikipediaSection[] | null
  infobox: WikipediaInfobox | null
  images: WikipediaImage[] | null
  references: string[] | null
  categories: WikipediaCategory[] | null
  coordinates: WikipediaCoordinates | null
  revision_id: number | null
  last_updated: string | null
  page_url: string | null
  short_description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
