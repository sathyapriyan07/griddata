import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import {
  importSeasons, importCircuits, importConstructors, importDrivers,
  importRaces,
  importFullSeason, importSeasonResults,
  importAllQualifying, importAllSprintResults, importAllPitStops,
  importDriverStandings, importConstructorStandings, importPerRoundStandings,
  importDriverConstructorHistory, importDriverConstructorHistoryAll,
  importRaceResults,
  importQualifyingResults,
  importSprintResults,
  importPitStops,
} from "@/lib/import/jolpica"
import { syncOpenF1Season } from "@/lib/import/openf1"
import { getConstructorColors } from "@/lib/constructorColors"
import { getFlagUrl } from "@/lib/nationalityFlags"
import {
  syncWikipediaHistorical, syncWikipediaSeason,
  syncWikipediaDriver, syncWikipediaConstructor, syncWikipediaCircuit, syncWikipediaRace,
  importDriverWikipedia, importConstructorWikipedia, importCircuitWikipedia,
  importRaceWikipedia, importSeasonWikipedia,
} from "@/lib/import/wikipedia"
import { useAuth, getProfile } from "@/stores/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SyncJob, Profile, CircuitImage } from "@/types/database"
import { Shield, Database, Cloud, Book } from "lucide-react"

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

async function logSyncJob(source: string, entityType: string, status: string, log?: string) {
  try {
    await supabase.from("sync_jobs").insert({
      source: source as SyncJob["source"],
      entity_type: entityType,
      status: status as SyncJob["status"],
      started_at: status === "running" ? new Date().toISOString() : null,
      finished_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
      log: log || null,
    })
  } catch {
    // sync_jobs table might not exist yet
  }
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl)
    const parts = url.pathname.split("/")
    const bucketIndex = parts.indexOf(bucket)
    if (bucketIndex === -1 || bucketIndex >= parts.length - 1) return null
    return parts.slice(bucketIndex + 1).join("/")
  } catch {
    return null
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>
    if (obj.message) return String(obj.message)
    if (obj.error) return typeof obj.error === "string" ? obj.error : JSON.stringify(obj.error)
    if (obj.code) return `Error ${obj.code}: ${obj.message || obj.details || ""}`
    return JSON.stringify(err)
  }
  return String(err)
}

function getSearchColumns(entityType: string) {
  if (entityType === "drivers") return ["driver_id", "given_name", "family_name"]
  if (entityType === "constructors") return ["constructor_id", "name", "full_name"]
  if (entityType === "circuits") return ["circuit_id", "name", "country"]
  if (entityType === "races") return ["name"]
  return ["id"]
}

function SeasonImportForm({
  importing,
  runImport,
}: {
  importing: boolean
  runImport: (name: string, fn: () => Promise<unknown>, entityType: string) => Promise<void>
}) {
  const [season, setSeason] = useState(new Date().getFullYear().toString())

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          min={1950}
          max={new Date().getFullYear() + 1}
          className="w-24 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Races ${season}`, () => importRaces(Number(season)), `races_${season}`)
          }
        >
          Import Races
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Per-Round Standings ${season}`, () => importPerRoundStandings(Number(season)), `prs_${season}`)
          }
        >
          Per-Round Standings
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Qualifying ${season}`, () => importAllQualifying(Number(season)), `quali_${season}`)
          }
        >
          All Qualifying
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Sprint Races ${season}`, () => importAllSprintResults(Number(season)), `sprint_${season}`)
          }
        >
          All Sprint Races
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Pit Stops ${season}`, () => importAllPitStops(Number(season)), `pitstops_${season}`)
          }
        >
          All Pit Stops
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Results ${season}`, () => importSeasonResults(Number(season)), `results_${season}`)
          }
        >
          All Race Results
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Driver Standings ${season}`, () => importDriverStandings(Number(season)), `ds_${season}`)
          }
        >
          Driver Standings
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Constructor Standings ${season}`, () => importConstructorStandings(Number(season)), `cs_${season}`)
          }
        >
          Constructor Standings
        </Button>
      </div>

        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Driver-Team Links ${season}`, () => importDriverConstructorHistory(Number(season)), `dch_${season}`)
          }
        >
          Driver-Team Links
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={importing || !season}
          onClick={() =>
            runImport(`Full Season ${season}`, () => importFullSeason(Number(season)), `full_${season}`)
          }
        >
          Full Season Import (all data types)
        </Button>
    </div>
  )
}

function RaceImportForm({
  importing,
  runImport,
}: {
  importing: boolean
  runImport: (name: string, fn: () => Promise<unknown>, entityType: string) => Promise<void>
}) {
  const [season, setSeason] = useState(new Date().getFullYear().toString())
  const [round, setRound] = useState("1")

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          min={1950}
          max={new Date().getFullYear() + 1}
          className="w-24 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
          placeholder="Season"
        />
        <input
          type="number"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          min={1}
          max={30}
          className="w-20 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
          placeholder="Round"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season || !round}
          onClick={() =>
            runImport(`Race Results R${round} ${season}`, () => importRaceResults(Number(season), Number(round)), `race_results_${season}_r${round}`)
          }
        >
          Race Results
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season || !round}
          onClick={() =>
            runImport(`Qualifying R${round} ${season}`, () => importQualifyingResults(Number(season), Number(round)), `quali_${season}_r${round}`)
          }
        >
          Qualifying
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season || !round}
          onClick={() =>
            runImport(`Sprint R${round} ${season}`, () => importSprintResults(Number(season), Number(round)), `sprint_${season}_r${round}`)
          }
        >
          Sprint
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season || !round}
          onClick={() =>
            runImport(`Pit Stops R${round} ${season}`, () => importPitStops(Number(season), Number(round)), `pitstops_${season}_r${round}`)
          }
        >
          Pit Stops
        </Button>
      </div>
    </div>
  )
}

function CrudTable({
  entityType,
  columns,
}: {
  entityType: string
  columns: { key: string; label: string }[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, string>>({})
  const [searchText, setSearchText] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const debounceRef = useRef<number | null>(null)
  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: [`crud-${entityType}`, searchText],
    queryFn: async () => {
      const q = supabase.from(entityType).select("*")
      if (searchText && searchText.trim().length > 0) {
        const cols = getSearchColumns(entityType)
        const term = `%${searchText.replace(/%/g, '\\%')}%`
        const orClause = cols.map((c) => `${c}.ilike.${term}`).join(',')
        const { data } = await q.or(orClause).order("created_at", { ascending: false }).limit(200)
        return data ?? []
      }
      const { data } = await q.order("created_at", { ascending: false }).limit(50)
      return data ?? []
    },
  })

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setSearchText(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  const startEdit = (row: Record<string, unknown>) => {
    setEditingId(row.id as string)
    const initial: Record<string, string> = {}
    columns.forEach((col) => {
      initial[col.key] = row[col.key] != null ? String(row[col.key]) : ""
    })
    setEdits(initial)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const { error } = await supabase.from(entityType).update(edits).eq("id", editingId)
    if (!error) {
      setEditingId(null)
      setEdits({})
      refetch()
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEdits({})
  }

  const addNew = async () => {
    const { error } = await supabase.from(entityType).insert(newRow)
    if (!error) {
      setShowAdd(false)
      setNewRow({})
      refetch()
    }
  }

  if (isLoading) return <p className="text-sm text-text-secondary">Loading...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-64"
        />
        {!showAdd ? (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            + Add New
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setNewRow({}) }}>
            Cancel Add
          </Button>
        )}
      </div>
      {showAdd && (
        <div className="flex flex-wrap gap-2 items-end rounded-xl border border-default bg-secondary/50 p-3">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary">{col.label}</label>
              <input
                className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-32"
                placeholder={col.label}
                value={newRow[col.key] ?? ""}
                onChange={(e) => setNewRow({ ...newRow, [col.key]: e.target.value })}
              />
            </div>
          ))}
          <Button variant="default" size="sm" onClick={addNew}>Save</Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((row) => (
              <TableRow key={(row as Record<string, unknown>).id as string}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {editingId === (row as Record<string, unknown>).id ? (
                      <input
                        className="w-full rounded-xl border border-default bg-secondary px-3 py-1.5 text-sm text-text-primary"
                        value={edits[col.key] ?? ""}
                        onChange={(e) => setEdits({ ...edits, [col.key]: e.target.value })}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-tertiary px-1 rounded text-text-primary"
                        onDoubleClick={() => startEdit(row as Record<string, unknown>)}
                        title="Double-click to edit"
                      >
                        {(row as Record<string, unknown>)[col.key] != null ? String((row as Record<string, unknown>)[col.key]).substring(0, 40) : "—"}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {editingId === (row as Record<string, unknown>).id ? (
                    <div className="flex gap-1">
                      <Button variant="default" size="sm" onClick={saveEdit}>Save</Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(row as Record<string, unknown>)}>Edit</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this record? This cannot be undone.")) {
                            supabase.from(entityType).delete().eq("id", (row as Record<string, unknown>).id as string).then(() => refetch())
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!rows || rows.length === 0) && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-text-secondary">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function WikipediaImportForm({
  importing,
  runWikipediaImport,
}: {
  importing: boolean
  runWikipediaImport: (name: string, fn: () => Promise<unknown>, entityType: string) => Promise<void>
}) {
  const [season, setSeason] = useState(new Date().getFullYear().toString())

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => runWikipediaImport("All Historical", syncWikipediaHistorical, "wp_all")}
        >
          Import All Historical
        </Button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          min={1950}
          max={new Date().getFullYear() + 1}
          className="w-24 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() => runWikipediaImport(`Season ${season}`, () => syncWikipediaSeason(Number(season)), `wp_season_${season}`)}
        >
          Import Season
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => runWikipediaImport("Drivers Wikipedia", importDriverWikipedia, "wp_drivers")}
        >
          Import Drivers
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => runWikipediaImport("Constructors Wikipedia", importConstructorWikipedia, "wp_constructors")}
        >
          Import Constructors
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => runWikipediaImport("Circuits Wikipedia", importCircuitWikipedia, "wp_circuits")}
        >
          Import Circuits
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing || !season}
          onClick={() => runWikipediaImport(`Races ${season} Wikipedia`, () => importRaceWikipedia(Number(season)), `wp_races_${season}`)}
        >
          Import Races
        </Button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tables: string[] } | null>(null)
  const [openf1Season, setOpenf1Season] = useState(new Date().getFullYear().toString())
  const { user } = useAuth()
  const [integrityResults, setIntegrityResults] = useState<string[] | null>(null)
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [adminRoleUserId, setAdminRoleUserId] = useState("")
  const [adminRoleStatus, setAdminRoleStatus] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [uploadType, setUploadType] = useState<"driver" | "constructor" | "circuit">("driver")
  const [uploadEntityId, setUploadEntityId] = useState("")
  const [uploadSearch, setUploadSearch] = useState("")
  const [searchAll, setSearchAll] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: driversList } = useQuery({
    queryKey: ["all-drivers-upload"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, driver_id, given_name, family_name").order("family_name")
      return (data ?? []) as { id: string; driver_id: string; given_name: string; family_name: string }[]
    },
    enabled: uploadType === "driver" || searchAll,
  })

  const { data: constructorsList } = useQuery({
    queryKey: ["all-constructors-upload"],
    queryFn: async () => {
      const { data } = await supabase.from("constructors").select("id, constructor_id, name").order("name")
      return (data ?? []) as { id: string; constructor_id: string; name: string }[]
    },
    enabled: uploadType === "constructor" || searchAll,
  })

  const { data: circuitsList } = useQuery({
    queryKey: ["all-circuits-upload"],
    queryFn: async () => {
      const { data } = await supabase.from("circuits").select("id, circuit_id, name, country").order("name")
      return (data ?? []) as { id: string; circuit_id: string; name: string; country: string | null }[]
    },
    enabled: uploadType === "circuit" || searchAll,
  })

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await getProfile(user.id)
      return data as Profile | null
    },
    enabled: !!user?.id,
  })

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").limit(50)
    if (data) setProfiles(data as Profile[])
  }

  const setAdminRole = async (targetUserId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", targetUserId)
    if (error) {
      setAdminRoleStatus(`Error: ${error.message}`)
    } else {
      setAdminRoleStatus(`User ${targetUserId} is now admin.`)
      fetchProfiles()
    }
  }

  const runIntegrityChecks = async () => {
    setCheckingIntegrity(true)
    setIntegrityResults(null)
    const issues: string[] = []

    const { count: orphanResults } = await supabase
      .from("race_results")
      .select("id", { count: "exact", head: true })
      .not("race_id", "in", "(select id from races)")
    if (orphanResults && orphanResults > 0) issues.push(`Orphaned race_results: ${orphanResults}`)

    const { count: orphanQuali } = await supabase
      .from("qualifying_results")
      .select("id", { count: "exact", head: true })
      .not("race_id", "in", "(select id from races)")
    if (orphanQuali && orphanQuali > 0) issues.push(`Orphaned qualifying_results: ${orphanQuali}`)

    const { data: racesWithResults } = await supabase
      .from("race_results")
      .select("race_id")
    const raceIdsWithResults = new Set(racesWithResults?.map((r) => r.race_id) ?? [])
    const { data: allRaces } = await supabase.from("races").select("id, name, season_year")
    const racesMissingResults = allRaces?.filter((r) => !raceIdsWithResults.has(r.id)) ?? []
    if (racesMissingResults.length > 0) {
      issues.push(`Races missing results: ${racesMissingResults.length} (e.g. ${racesMissingResults[0]?.name} ${racesMissingResults[0]?.season_year})`)
    }

    const { data: driversWithResults } = await supabase
      .from("race_results")
      .select("driver_id")
    const driverIdsWithResults = new Set(driversWithResults?.map((r) => r.driver_id) ?? [])
    const { data: allDrivers } = await supabase.from("drivers").select("id, given_name, family_name")
    const driversNoResults = allDrivers?.filter((d) => !driverIdsWithResults.has(d.id)) ?? []
    if (driversNoResults.length > 0) {
      issues.push(`Drivers without results: ${driversNoResults.length} (e.g. ${driversNoResults[0]?.given_name} ${driversNoResults[0]?.family_name})`)
    }

    if (issues.length === 0) issues.push("No issues found.")
    setIntegrityResults(issues)
    setCheckingIntegrity(false)
  }

  const checkConnection = async () => {
    const tables = ["seasons", "circuits", "constructors", "drivers", "races", "race_results", "weather", "race_sessions", "tire_stints"]
    const found: string[] = []
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("id", { count: "exact", head: true }).limit(0)
        if (!error || error.code === "PGRST116") found.push(table)
      } catch {
      }
    }
    setDbStatus({ connected: found.length > 0, tables: found })
  }

  const runImport = async (
    name: string,
    fn: () => Promise<unknown>,
    entityType: string
  ) => {
    setImporting(true)
    setImportStatus(`Importing ${name}...`)
    setImportError(null)
    await logSyncJob("jolpica", entityType, "running")

    try {
      const result = await fn()
      const count = Array.isArray(result) ? result.length : 1
      setImportStatus(`Imported ${count} ${name} successfully.`)
      await logSyncJob("jolpica", entityType, "completed", `Imported ${count} records.`)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } catch (err) {
      const msg = extractErrorMessage(err)
      setImportError(`${name} import failed: ${msg}`)
      await logSyncJob("jolpica", entityType, "failed", msg)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } finally {
      setImporting(false)
    }
  }

  const runOpenF1Import = async () => {
    const season = Number(openf1Season)
    setImporting(true)
    setImportStatus(`Syncing OpenF1 data for ${season}...`)
    setImportError(null)
    await logSyncJob("openf1", `openf1_${season}`, "running")

    try {
      const result = await syncOpenF1Season(season, (msg) => {
        setImportStatus(msg)
      })
      setImportStatus(`OpenF1 sync complete: ${result.meetings} meetings, ${result.sessions} sessions, ${result.weather} weather records, ${result.stints} stints`)
      await logSyncJob("openf1", `openf1_${season}`, "completed",
        `Meetings: ${result.meetings}, Sessions: ${result.sessions}, Weather: ${result.weather}, Stints: ${result.stints}`)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } catch (err) {
      const msg = extractErrorMessage(err)
      setImportError(`OpenF1 sync failed: ${msg}`)
      await logSyncJob("openf1", `openf1_${season}`, "failed", msg)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } finally {
      setImporting(false)
    }
  }

  const runWikipediaImport = async (
    name: string,
    fn: () => Promise<unknown>,
    entityType: string
  ) => {
    setImporting(true)
    setImportStatus(`Importing Wikipedia ${name}...`)
    setImportError(null)
    await logSyncJob("wikipedia", entityType, "running")

    try {
      const result = await fn()
      const resultObj = result as Record<string, unknown>
      let detail = ""
      if (resultObj && typeof resultObj === "object") {
        const parts: string[] = []
        for (const [k, v] of Object.entries(resultObj)) {
          if (typeof v === "object" && v !== null) {
            const sub = v as Record<string, unknown>
            parts.push(`${k}: imported=${sub.imported}, skipped=${sub.skipped}, errors=${sub.errors}`)
          }
        }
        detail = parts.join(" | ")
      }
      setImportStatus(`Wikipedia ${name} complete. ${detail}`)
      await logSyncJob("wikipedia", entityType, "completed", detail)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } catch (err) {
      const msg = extractErrorMessage(err)
      setImportError(`Wikipedia ${name} import failed: ${msg}`)
      await logSyncJob("wikipedia", entityType, "failed", msg)
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl min-h-[160px] flex items-end bg-gradient-to-br from-accent-red/10 via-bg-primary to-bg-primary border border-default p-8 lg:p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(3,95%,46%) 0%, transparent 60%)`
        }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute top-0 left-0 h-full w-[4px] bg-accent-red" />
        <div className="relative z-10">
          <h1 className="text-3xl lg:text-5xl font-heading font-bold uppercase leading-[0.9] tracking-[-0.02em] text-text-primary flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent-red" />
            Administration
          </h1>
          <p className="text-text-secondary mt-2">
            Protected area for data management, imports, and CRUD operations.
          </p>
        </div>
      </section>

      {importStatus && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400 border border-emerald-500/20">
          {importStatus}
        </div>
      )}

      {importError && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
          {importError}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <Button variant="outline" size="sm" onClick={checkConnection}>
          Check DB Connection
        </Button>
        {dbStatus && (
          <span className={dbStatus.connected ? "text-emerald-400" : "text-red-400"}>
            {dbStatus.connected
              ? `Tables found: ${dbStatus.tables.join(", ") || "none (anon key may not have schema access)"}`
              : "No tables found — run Supabase migrations first"}
          </span>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                Jolpica Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Import historical F1 data from Jolpica API.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => runImport("Seasons", importSeasons, "seasons")}
                >
                  Import Seasons
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => runImport("Circuits", importCircuits, "circuits")}
                >
                  Import Circuits
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => runImport("Constructors", importConstructors, "constructors")}
                >
                  Import Constructors
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => runImport("Drivers", importDrivers, "drivers")}
                >
                  Import Drivers
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => runImport("All Driver-Team Links", importDriverConstructorHistoryAll, "dch_all")}
                >
                  All Driver-Team Links
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                OpenF1 Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Sync modern session data (weather, stints) from OpenF1 API.</p>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={openf1Season}
                  onChange={(e) => setOpenf1Season(e.target.value)}
                  min={2018}
                  max={new Date().getFullYear() + 1}
                  className="w-24 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing || !openf1Season}
                  onClick={runOpenF1Import}
                >
                  Sync OpenF1 Season
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium flex items-center gap-2">
                <Book className="w-4 h-4" />
                Wikipedia Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Enrich data with Wikipedia biographies, history, and editorial content.</p>
              <WikipediaImportForm importing={importing} runWikipediaImport={runWikipediaImport} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Import Season
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Import races and results for a specific season.</p>
              <SeasonImportForm importing={importing} runImport={runImport} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Import Single Race
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Import results for a specific race by season and round.</p>
              <RaceImportForm importing={importing} runImport={runImport} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Admin Role
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-text-primary">
                Your role: <Badge variant={userProfile?.role === "admin" ? "default" : "secondary"}>{userProfile?.role ?? "public"}</Badge>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={adminRoleUserId}
                  onChange={(e) => setAdminRoleUserId(e.target.value)}
                  placeholder="User ID (UUID)"
                  className="flex-1 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
                />
                <Button variant="outline" size="sm" onClick={() => setAdminRole(adminRoleUserId)}>
                  Set Admin
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={fetchProfiles}>
                List Profiles
              </Button>
              {adminRoleStatus && <p className="text-xs text-text-secondary">{adminRoleStatus}</p>}
              {profiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex justify-between py-0.5">
                      <span className="font-mono text-text-primary">{p.id.substring(0, 12)}...</span>
                      <Badge variant={p.role === "admin" ? "default" : "secondary"} className="text-[10px]">{p.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Data Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-text-secondary">Orphan detection, missing results, referential checks.</p>
              <Button variant="outline" size="sm" disabled={checkingIntegrity} onClick={runIntegrityChecks}>
                {checkingIntegrity ? "Checking..." : "Run Checks"}
              </Button>
              {integrityResults && (
                <ul className="text-xs space-y-1 mt-2">
                  {integrityResults.map((msg, i) => (
                    <li key={i} className={msg === "No issues found." ? "text-emerald-400" : "text-amber-400"}>{msg}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Image Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">Upload driver photo, team logo, team car image, or circuit image.</p>
              <div className="flex gap-2">
                <select
                  value={uploadType}
                  onChange={(e) => { setUploadType(e.target.value as typeof uploadType); setUploadEntityId(""); setUploadStatus(null); setUploadError(null) }}
                  className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary flex-1"
                >
                  <option value="driver">Driver</option>
                  <option value="constructor">Team</option>
                  <option value="circuit">Circuit</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="search"
                    placeholder="Search..."
                    value={uploadSearch}
                    onChange={(e) => setUploadSearch(e.target.value)}
                    className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-full"
                  />
                  <label className="text-sm flex items-center gap-1 text-text-secondary">
                    <input type="checkbox" checked={searchAll} onChange={(e) => setSearchAll(e.target.checked)} />
                    <span>Search all</span>
                  </label>
                </div>

                <select
                  value={uploadEntityId}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.includes("|")) {
                      const [type, id] = val.split("|")
                      setUploadType(type as typeof uploadType)
                      setUploadEntityId(id)
                    } else {
                      setUploadEntityId(val)
                    }
                  }}
                  className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-full"
                >
                  <option value="">Select {uploadType}...</option>
                  {searchAll ? (
                    [
                      ...(driversList ?? []).map((d) => ({ type: "driver", id: d.id, label: `${d.given_name} ${d.family_name}` })),
                      ...(constructorsList ?? []).map((c) => ({ type: "constructor", id: c.id, label: c.name })),
                      ...(circuitsList ?? []).map((c) => ({ type: "circuit", id: c.id, label: `${c.name} ${c.country ?? ""}` })),
                    ]
                      .filter((item) => item.label.toLowerCase().includes(uploadSearch.toLowerCase()))
                      .map((item) => (
                        <option key={`${item.type}|${item.id}`} value={`${item.type}|${item.id}`}>{`[${item.type}] ${item.label}`}</option>
                      ))
                  ) : (
                    <>
                      {uploadType === "driver" && (driversList ?? []).filter(d => d.given_name.toLowerCase().includes(uploadSearch.toLowerCase()) || d.family_name.toLowerCase().includes(uploadSearch.toLowerCase())).map((d) => (
                        <option key={d.id} value={d.id}>{d.given_name} {d.family_name}</option>
                      ))}
                      {uploadType === "constructor" && (constructorsList ?? []).filter(c => c.name.toLowerCase().includes(uploadSearch.toLowerCase())).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {uploadType === "circuit" && (circuitsList ?? []).filter(c => c.name.toLowerCase().includes(uploadSearch.toLowerCase()) || (c.country ?? "").toLowerCase().includes(uploadSearch.toLowerCase())).map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.country ? `(${c.country})` : ""}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm text-text-secondary"
              />
              <Button
                variant="default"
                size="sm"
                disabled={uploading || !uploadEntityId || !uploadFile}
                onClick={async () => {
                  if (!uploadFile || !uploadEntityId) return
                  setUploading(true)
                  setUploadStatus(null)
                  setUploadError(null)
                  try {
                    const ext = uploadFile.name.split(".").pop() || "png"
                    const filePath = `${uploadType}s/${uploadEntityId}.${ext}`
                    const { error: uploadErr } = await supabase.storage
                      .from("images")
                      .upload(filePath, uploadFile, { upsert: true })
                    if (uploadErr) throw uploadErr
                    const { data: urlData } = supabase.storage
                      .from("images")
                      .getPublicUrl(filePath)
                    const publicUrl = urlData.publicUrl

                    const column = uploadType === "driver" ? "photo_url" : uploadType === "constructor" ? "logo_url" : "image_url"
                    const table = uploadType === "driver" ? "drivers" : uploadType === "constructor" ? "constructors" : "circuits"
                    const idColumn = "id"
                    const { error: updateErr } = await supabase
                      .from(table)
                      .update({ [column]: publicUrl })
                      .eq(idColumn, uploadEntityId)
                    if (updateErr) throw updateErr
                    setUploadStatus("Uploaded and linked successfully.")
                    setUploadFile(null)
                  } catch (err) {
                    setUploadError(extractErrorMessage(err))
                  } finally {
                    setUploading(false)
                  }
                }}
              >
                {uploading ? "Uploading..." : "Upload Image"}
              </Button>
              {uploadStatus && <p className="text-xs text-emerald-400">{uploadStatus}</p>}
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Team Car Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeamCarImagePanel />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Driver Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DriverImagePanel />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Constructor Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConstructorColorPanel />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Nationality Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NationalityFlagPanel />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.6rem] text-text-secondary uppercase tracking-wide font-medium">
                Circuit Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CircuitImagePanel />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="crud">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="crud">CRUD Tables</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="crud">
          <Tabs defaultValue="drivers">
            <div className="overflow-x-auto hide-scrollbar">
              <TabsList className="inline-flex w-max min-w-full">
                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                <TabsTrigger value="constructors">Teams</TabsTrigger>
                <TabsTrigger value="circuits">Circuits</TabsTrigger>
                <TabsTrigger value="races">Races</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="drivers">
              <Card>
                <CardHeader>
                  <CardTitle>Drivers</CardTitle>
                </CardHeader>
                <CardContent>
                  <CrudTable
                    entityType="drivers"
                    columns={[
                      { key: "driver_id", label: "ID" },
                      { key: "given_name", label: "Given Name" },
                      { key: "family_name", label: "Family Name" },
                      { key: "nationality", label: "Nationality" },
                      { key: "dob", label: "DOB" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="constructors">
              <Card>
                <CardHeader>
                  <CardTitle>Constructors</CardTitle>
                </CardHeader>
                <CardContent>
                  <CrudTable
                    entityType="constructors"
                    columns={[
                      { key: "constructor_id", label: "ID" },
                      { key: "name", label: "Name" },
                      { key: "full_name", label: "Full Name" },
                      { key: "nationality", label: "Nationality" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="circuits">
              <Card>
                <CardHeader>
                  <CardTitle>Circuits</CardTitle>
                </CardHeader>
                <CardContent>
                  <CrudTable
                    entityType="circuits"
                    columns={[
                      { key: "circuit_id", label: "ID" },
                      { key: "name", label: "Name" },
                      { key: "location", label: "Location" },
                      { key: "country", label: "Country" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="races">
              <Card>
                <CardHeader>
                  <CardTitle>Races</CardTitle>
                </CardHeader>
                <CardContent>
                  <CrudTable
                    entityType="races"
                    columns={[
                      { key: "season_year", label: "Season" },
                      { key: "round", label: "Round" },
                      { key: "name", label: "Name" },
                      { key: "date", label: "Date" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle>Database Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">
                The database contains tables for seasons, circuits, constructors, drivers,
                races, sessions, qualifying, results, standings, pit stops, weather data,
                tire stints, and sync job logs.
              </p>
              <p className="text-sm mt-2 text-text-secondary">
                Run the Supabase migrations in <code className="text-text-primary">supabase/migrations/</code> to set up the schema,
                then use the Import buttons above to populate data from the Jolpica API.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

function TeamCarImagePanel() {
  const [selectedConstructorId, setSelectedConstructorId] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: constructors } = useQuery({
    queryKey: ["all-constructors-car-image"],
    queryFn: async () => {
      const { data } = await supabase.from("constructors").select("id, constructor_id, name").order("name")
      return (data ?? []) as { id: string; constructor_id: string; name: string }[]
    },
  })

  const filteredConstructors = (constructors ?? []).filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const { data: images, refetch: refetchImages } = useQuery({
    queryKey: ["team-car-images", selectedConstructorId],
    queryFn: async () => {
      if (!selectedConstructorId) return []
      const { data } = await supabase
        .from("team_car_images")
        .select("*")
        .eq("constructor_id", selectedConstructorId)
        .order("year", { ascending: false })
      return (data ?? []) as { id: string; year: number; image_url: string; caption: string | null }[]
    },
    enabled: !!selectedConstructorId,
  })

  const uploadImage = async (f: File) => {
    if (!selectedConstructorId) return
    setUploading(true)
    setStatus(null)
    try {
      const ext = f.name.split(".").pop() || "png"
      const path = `team-car-images/${selectedConstructorId}/${year}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("images").upload(path, f, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from("team_car_images").upsert(
        { constructor_id: selectedConstructorId, year, image_url: publicUrl },
        { onConflict: "constructor_id, year" }
      )
      if (dbErr) throw dbErr
      setStatus("Image uploaded successfully.")
      refetchImages()
    } catch (err) {
      setStatus(extractErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return
    setStatus("Deleting...")
    const { error } = await supabase.from("team_car_images").delete().eq("id", id)
    if (error) setStatus(`Delete failed: ${error.message}`)
    else {
      setStatus("Deleted.")
      refetchImages()
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Search teams..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setSelectedConstructorId(null) }}
        className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-full"
      />
      {searchQuery && filteredConstructors.length > 0 && (
        <div className="border border-default rounded-xl divide-y divide-default max-h-48 overflow-y-auto">
          {filteredConstructors.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedConstructorId(c.id); setSearchQuery(c.name) }}
              className={`w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-tertiary transition-colors ${selectedConstructorId === c.id ? "bg-tertiary font-medium" : ""}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredConstructors.length === 0 && (
        <p className="text-xs text-text-secondary px-1">No teams found.</p>
      )}

      {selectedConstructorId && (
        <>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadImage(f)
                e.target.value = ""
              }}
              className="hidden"
            />
            <Button variant="default" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {status && <p className="text-xs text-text-secondary">{status}</p>}

          {images && images.length > 0 && (
            <div className="grid gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`car-${img.year}`} className="w-24 h-12 object-contain rounded-xl" />
                  <span className="text-sm font-medium text-text-primary flex-1">{img.year}</span>
                  <Button variant="outline" size="sm" onClick={() => deleteImage(img.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
          {images && images.length === 0 && (
            <p className="text-xs text-text-secondary">No images uploaded for this team yet.</p>
          )}
        </>
      )}
    </div>
  )
}

function DriverImagePanel() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string>("card")
  const [year, setYear] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: drivers } = useQuery({
    queryKey: ["all-drivers-driver-image"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, driver_id, given_name, family_name").order("family_name")
      return (data ?? []) as { id: string; driver_id: string; given_name: string; family_name: string }[]
    },
  })

  const filteredDrivers = (drivers ?? []).filter(
    (d) => `${d.given_name} ${d.family_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const { data: images, refetch: refetchImages } = useQuery({
    queryKey: ["driver-images", selectedDriverId],
    queryFn: async () => {
      if (!selectedDriverId) return []
      const { data } = await supabase
        .from("driver_images")
        .select("*")
        .eq("driver_id", selectedDriverId)
        .order("created_at", { ascending: false })
      return (data ?? []) as { id: string; image_url: string; type: string; year: number | null; caption: string | null }[]
    },
    enabled: !!selectedDriverId,
  })

  const uploadImage = async (f: File) => {
    if (!selectedDriverId) return
    setUploading(true)
    setStatus(null)
    try {
      const ext = f.name.split(".").pop() || "png"
      const path = `driver-images/${selectedDriverId}/${imageType}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("images").upload(path, f, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from("driver_images").insert({
        driver_id: selectedDriverId,
        image_url: publicUrl,
        type: imageType,
        year: year,
      })
      if (dbErr) throw dbErr
      setStatus("Image uploaded successfully.")
      refetchImages()
    } catch (err) {
      setStatus(extractErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (id: string, imageUrl: string) => {
    if (!confirm("Delete this image?")) return
    setStatus("Deleting...")
    try {
      const storagePath = extractStoragePath(imageUrl, "images")
      if (storagePath) {
        await supabase.storage.from("images").remove([storagePath])
      }
    } catch {
    }
    const { error } = await supabase.from("driver_images").delete().eq("id", id)
    if (error) setStatus(`Delete failed: ${error.message}`)
    else {
      setStatus("Deleted.")
      refetchImages()
    }
  }

  const typeOptions = [
    { value: "card", label: "Card" },
    { value: "hero", label: "Hero Banner" },
    { value: "pole", label: "Pole Position" },
    { value: "event", label: "Event" },
  ]

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Search drivers..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setSelectedDriverId(null) }}
        className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-full"
      />
      {searchQuery && filteredDrivers.length > 0 && (
        <div className="border border-default rounded-xl divide-y divide-default max-h-48 overflow-y-auto">
          {filteredDrivers.map((d) => (
            <button
              key={d.id}
              onClick={() => { setSelectedDriverId(d.id); setSearchQuery(`${d.given_name} ${d.family_name}`) }}
              className={`w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-tertiary transition-colors ${selectedDriverId === d.id ? "bg-tertiary font-medium" : ""}`}
            >
              {d.given_name} {d.family_name}
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredDrivers.length === 0 && (
        <p className="text-xs text-text-secondary px-1">No drivers found.</p>
      )}

      {selectedDriverId && (
        <>
          <div className="flex gap-2 items-center">
            <select
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              placeholder="Year"
              className="w-20 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadImage(f)
                e.target.value = ""
              }}
              className="hidden"
            />
            <Button variant="default" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {status && <p className="text-xs text-text-secondary">{status}</p>}

          {images && images.length > 0 && (
            <div className="grid gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`${img.type}`} className="w-24 h-12 object-contain rounded-xl" />
                  <div className="flex-1 text-sm text-text-primary">
                    <span className="font-medium capitalize">{img.type}</span>
                    {img.year && <span className="text-text-secondary ml-2">({img.year})</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteImage(img.id, img.image_url)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
          {images && images.length === 0 && (
            <p className="text-xs text-text-secondary">No images uploaded for this driver yet.</p>
          )}
        </>
      )}
    </div>
  )
}

function CircuitImagePanel() {
  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string>("hero")
  const [year, setYear] = useState<number | null>(null)
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: circuits } = useQuery({
    queryKey: ["all-circuits-image"],
    queryFn: async () => {
      const { data } = await supabase.from("circuits").select("id, circuit_id, name, country").order("name")
      return (data ?? []) as { id: string; circuit_id: string; name: string; country: string | null }[]
    },
  })

  const filteredCircuits = (circuits ?? []).filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const { data: images, refetch: refetchImages } = useQuery({
    queryKey: ["circuit-images", selectedCircuitId],
    queryFn: async () => {
      if (!selectedCircuitId) return []
      const { data } = await supabase
        .from("circuit_images")
        .select("*")
        .eq("circuit_id", selectedCircuitId)
        .order("created_at", { ascending: false })
      return (data ?? []) as CircuitImage[]
    },
    enabled: !!selectedCircuitId,
  })

  const uploadImage = async (f: File) => {
    if (!selectedCircuitId) return
    setUploading(true)
    setStatus(null)
    try {
      const ext = f.name.split(".").pop() || "png"
      const path = `circuit-images/${selectedCircuitId}/${imageType}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("images").upload(path, f, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from("circuit_images").insert({
        circuit_id: selectedCircuitId,
        image_url: publicUrl,
        type: imageType,
        year: year,
        caption: caption || null,
      })
      if (dbErr) throw dbErr
      setStatus("Image uploaded successfully.")
      setCaption("")
      refetchImages()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return
    setStatus("Deleting...")
    const { error } = await supabase.from("circuit_images").delete().eq("id", id)
    if (error) setStatus(`Delete failed: ${error.message}`)
    else {
      setStatus("Deleted.")
      refetchImages()
    }
  }

  const typeOptions = [
    { value: "hero", label: "Hero Banner" },
    { value: "circuit_map", label: "Circuit Map" },
    { value: "aerial", label: "Aerial" },
    { value: "pit", label: "Pit Lane" },
  ]

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Search circuits..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setSelectedCircuitId(null) }}
        className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary w-full"
      />
      {searchQuery && filteredCircuits.length > 0 && (
        <div className="border border-default rounded-xl divide-y divide-default max-h-48 overflow-y-auto">
          {filteredCircuits.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCircuitId(c.id); setSearchQuery(c.name) }}
              className={`w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-tertiary transition-colors ${selectedCircuitId === c.id ? "bg-tertiary font-medium" : ""}`}
            >
              {c.name} {c.country ? `(${c.country})` : ""}
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredCircuits.length === 0 && (
        <p className="text-xs text-text-secondary px-1">No circuits found.</p>
      )}

      {selectedCircuitId && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              className="rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              placeholder="Year"
              className="w-20 rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            />
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption"
              className="flex-1 min-w-[120px] rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadImage(f)
                e.target.value = ""
              }}
              className="hidden"
            />
            <Button variant="default" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {status && <p className="text-xs text-text-secondary">{status}</p>}

          {images && images.length > 0 && (
            <div className="grid gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`${img.type}`} className="w-24 h-12 object-cover rounded-xl" />
                  <div className="flex-1 text-sm text-text-primary">
                    <span className="font-medium capitalize">{img.type.replace("_", " ")}</span>
                    {img.year && <span className="text-text-secondary ml-2">({img.year})</span>}
                    {img.caption && <span className="text-text-secondary ml-2">— {img.caption}</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteImage(img.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
          {images && images.length === 0 && (
            <p className="text-xs text-text-secondary">No images uploaded for this circuit yet.</p>
          )}
        </>
      )}
    </div>
  )
}

function ConstructorColorPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [primary, setPrimary] = useState("#6b7280")
  const [secondary, setSecondary] = useState("#d1d5db")
  const [accent, setAccent] = useState("#111827")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: constructors } = useQuery({
    queryKey: ["all-constructors-colors"],
    queryFn: async () => {
      const { data } = await supabase.from("constructors").select("id, constructor_id, name, color_primary, color_secondary, color_accent").order("name")
      return (data ?? []) as { id: string; constructor_id: string; name: string; color_primary: string | null; color_secondary: string | null; color_accent: string | null }[]
    },
  })

  const filteredConstructors = (constructors ?? []).filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectConstructor = (id: string) => {
    const c = constructors?.find((x) => x.id === id)
    if (c) {
      setSelectedId(id)
      setSearchQuery(c.name)
      setPrimary(c.color_primary ?? "#6b7280")
      setSecondary(c.color_secondary ?? "#d1d5db")
      setAccent(c.color_accent ?? "#111827")
    }
  }

  const save = async () => {
    if (!selectedId) return
    setSaving(true)
    setStatus(null)
    try {
      const { error } = await supabase
        .from("constructors")
        .update({ color_primary: primary, color_secondary: secondary, color_accent: accent })
        .eq("id", selectedId)
      if (error) throw error
      setStatus("Colors saved.")
      queryClient.invalidateQueries({ queryKey: ["all-constructors-colors"] })
    } catch (err) {
      setStatus(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!selectedId) return
    setSaving(true)
    setStatus(null)
    try {
      const { error } = await supabase
        .from("constructors")
        .update({ color_primary: null, color_secondary: null, color_accent: null })
        .eq("id", selectedId)
      if (error) throw error
      setPrimary("#6b7280")
      setSecondary("#d1d5db")
      setAccent("#111827")
      setStatus("Reset to defaults.")
      queryClient.invalidateQueries({ queryKey: ["all-constructors-colors"] })
    } catch (err) {
      setStatus(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search constructors..."
        className="w-full rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
      />
      {searchQuery && filteredConstructors.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-default">
          {filteredConstructors.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConstructor(c.id)}
              className={`w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-tertiary transition-colors ${selectedId === c.id ? "bg-tertiary font-medium" : ""}`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.color_primary ?? getConstructorColors(c.name)?.primary ?? "#6b7280" }} />
                {c.name}
              </span>
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredConstructors.length === 0 && (
        <p className="text-xs text-text-secondary px-1">No constructors found.</p>
      )}

      {selectedId && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-primary">Primary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={primary} onChange={(e) => setPrimary(e.target.value)} className="flex-1 rounded-xl border border-default bg-secondary px-3 py-2 text-sm font-mono text-text-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-primary">Secondary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="flex-1 rounded-xl border border-default bg-secondary px-3 py-2 text-sm font-mono text-text-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-primary">Accent</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={accent} onChange={(e) => setAccent(e.target.value)} className="flex-1 rounded-xl border border-default bg-secondary px-3 py-2 text-sm font-mono text-text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-8 rounded-xl border border-default flex items-center justify-center text-xs font-medium" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})`, color: accent }}>
              Preview
            </div>
            <Button variant="default" size="sm" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={resetToDefaults}>
              Reset
            </Button>
          </div>

          {status && <p className="text-xs text-text-secondary">{status}</p>}
        </div>
      )}
    </div>
  )
}

function NationalityFlagPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const { data: allNationalities } = useQuery({
    queryKey: ["all-nationalities"],
    queryFn: async () => {
      const [driversRes, constructorsRes, circuitsRes] = await Promise.all([
        supabase.from("drivers").select("nationality"),
        supabase.from("constructors").select("nationality"),
        supabase.from("circuits").select("country"),
      ])
      const set = new Set<string>()
      driversRes.data?.forEach((d) => d.nationality && set.add(d.nationality))
      constructorsRes.data?.forEach((c) => c.nationality && set.add(c.nationality))
      circuitsRes.data?.forEach((c) => c.country && set.add(c.country))
      return [...set].sort()
    },
  })

  const filtered = (allNationalities ?? []).filter((n) =>
    n.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const flagPreviewUrl = selected ? getFlagUrl(selected, 64) : null

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search nationality..."
        className="w-full rounded-xl border border-default bg-secondary px-3 py-2 text-sm text-text-primary"
      />
      {searchQuery && filtered.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-default">
          {filtered.map((n) => (
            <button
              key={n}
              onClick={() => { setSelected(n); setSearchQuery(n) }}
              className={`w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-tertiary transition-colors flex items-center gap-2 ${selected === n ? "bg-tertiary font-medium" : ""}`}
            >
              {getFlagUrl(n, 24) ? (
                <img src={getFlagUrl(n, 24)!} alt={n} className="w-5 h-3.5 object-cover" />
              ) : (
                <span className="w-5 h-3.5 rounded bg-tertiary" />
              )}
              <span>{n}</span>
            </button>
          ))}
        </div>
      )}
      {searchQuery && filtered.length === 0 && (
        <p className="text-xs text-text-secondary px-1">No nationalities found.</p>
      )}

      {selected && (
        <div className="space-y-3 pt-2">
          {flagPreviewUrl && (
            <div className="flex items-center gap-3">
              <img src={flagPreviewUrl} alt={selected} className="w-12 h-8 object-cover border border-default" />
              <span className="text-sm font-medium text-text-primary">{selected}</span>
            </div>
          )}
          {flagPreviewUrl && (
            <p className="text-xs text-text-secondary break-all">
              {flagPreviewUrl}
            </p>
          )}
          {!flagPreviewUrl && (
            <p className="text-xs text-text-secondary">
              No flag mapping found for "{selected}".
            </p>
          )}
        </div>
      )}
    </div>
  )
}
