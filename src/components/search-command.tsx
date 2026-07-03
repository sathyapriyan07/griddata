import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { globalSearch, type SearchResult } from "@/lib/search"

interface SearchCommandProps {
  className?: string
}

export function SearchCommand({ className }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await globalSearch(q)
      setResults(res)
      setSelectedIndex(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery("")
    navigate(result.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const typeIcons: Record<string, string> = {
    driver: "🏎️",
    constructor: "🏭",
    circuit: "🏁",
    race: "🏆",
    season: "📅",
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-lg border bg-background shadow-2xl">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search drivers, teams, circuits, races..."
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results found.
          </div>
        )}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-2.5 text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-base">
                  {typeIcons[result.type] || "•"}
                </span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{result.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {result.description}
                  </div>
                </div>
                <span className="text-xs capitalize text-muted-foreground">
                  {result.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
