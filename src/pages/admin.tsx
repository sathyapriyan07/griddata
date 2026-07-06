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
} from "@/lib/import/jolpica"
import { syncOpenF1Season } from "@/lib/import/openf1"
import { getConstructorColors } from "@/lib/constructorColors"
import { useAuth, getProfile } from "@/stores/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SyncJob, Profile, NationalityFlag } from "@/types/database"

async function logSyncJob(source: string, entityType: string, status: string, log?: string) {
  try {
    await supabase.from("sync_jobs").insert({
      source: source as "jolpica" | "openf1",
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
          className="w-24 rounded-md border px-2 py-1 text-sm bg-background"
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
    // debounce update to searchText so typing doesn't steal focus
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded border px-2 py-1 text-sm bg-background w-64"
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
        <div className="flex flex-wrap gap-2 items-end border rounded-md p-3 bg-muted/30">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{col.label}</label>
              <input
                className="rounded border px-2 py-1 text-sm bg-background w-32"
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
              <TableRow key={row.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {editingId === row.id ? (
                      <input
                        className="w-full rounded border px-2 py-1 text-sm bg-background"
                        value={edits[col.key] ?? ""}
                        onChange={(e) => setEdits({ ...edits, [col.key]: e.target.value })}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-muted px-1 rounded"
                        onDoubleClick={() => startEdit(row)}
                        title="Double-click to edit"
                      >
                        {row[col.key] != null ? String(row[col.key]).substring(0, 40) : "—"}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {editingId === row.id ? (
                    <div className="flex gap-1">
                      <Button variant="default" size="sm" onClick={saveEdit}>Save</Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(row)}>Edit</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this record? This cannot be undone.")) {
                            supabase.from(entityType).delete().eq("id", row.id).then(() => refetch())
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
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
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

    // Orphaned race_results (no matching race)
    const { count: orphanResults } = await supabase
      .from("race_results")
      .select("id", { count: "exact", head: true })
      .not("race_id", "in", "(select id from races)")
    if (orphanResults && orphanResults > 0) issues.push(`Orphaned race_results: ${orphanResults}`)

    // Orphaned qualifying_results
    const { count: orphanQuali } = await supabase
      .from("qualifying_results")
      .select("id", { count: "exact", head: true })
      .not("race_id", "in", "(select id from races)")
    if (orphanQuali && orphanQuali > 0) issues.push(`Orphaned qualifying_results: ${orphanQuali}`)

    // Races without results
    const { data: racesWithResults } = await supabase
      .from("race_results")
      .select("race_id")
    const raceIdsWithResults = new Set(racesWithResults?.map((r) => r.race_id) ?? [])
    const { data: allRaces } = await supabase.from("races").select("id, name, season_year")
    const racesMissingResults = allRaces?.filter((r) => !raceIdsWithResults.has(r.id)) ?? []
    if (racesMissingResults.length > 0) {
      issues.push(`Races missing results: ${racesMissingResults.length} (e.g. ${racesMissingResults[0]?.name} ${racesMissingResults[0]?.season_year})`)
    }

    // Drivers without results
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

  const { data: syncJobs } = useQuery({
    queryKey: ["sync-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20)
      return (data ?? []) as SyncJob[]
    },
  })

  const checkConnection = async () => {
    const tables = ["seasons", "circuits", "constructors", "drivers", "races", "race_results", "weather", "race_sessions", "tire_stints"]
    const found: string[] = []
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("id", { count: "exact", head: true }).limit(0)
        if (!error || error.code === "PGRST116") found.push(table)
      } catch {
        // table doesn't exist
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

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Protected area for data management, imports, and CRUD operations.
        </p>
      </div>

      {importStatus && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
          {importStatus}
        </div>
      )}

      {importError && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
          {importError}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <Button variant="outline" size="sm" onClick={checkConnection}>
          Check DB Connection
        </Button>
        {dbStatus && (
          <span className={dbStatus.connected ? "text-green-600" : "text-red-600"}>
            {dbStatus.connected
              ? `Tables found: ${dbStatus.tables.join(", ") || "none (anon key may not have schema access)"}`
              : "No tables found — run Supabase migrations first"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jolpica Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Import historical F1 data from Jolpica API.</p>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              OpenF1 Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Sync modern session data (weather, stints) from OpenF1 API.</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={openf1Season}
                onChange={(e) => setOpenf1Season(e.target.value)}
                min={2018}
                max={new Date().getFullYear() + 1}
                className="w-24 rounded-md border px-2 py-1 text-sm bg-background"
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Import Season
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Import races and results for a specific season.</p>
            <SeasonImportForm importing={importing} runImport={runImport} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admin Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Your role: <Badge variant={userProfile?.role === "admin" ? "default" : "secondary"}>{userProfile?.role ?? "public"}</Badge>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={adminRoleUserId}
                onChange={(e) => setAdminRoleUserId(e.target.value)}
                placeholder="User ID (UUID)"
                className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
              />
              <Button variant="outline" size="sm" onClick={() => setAdminRole(adminRoleUserId)}>
                Set Admin
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProfiles}>
              List Profiles
            </Button>
            {adminRoleStatus && <p className="text-xs text-muted-foreground">{adminRoleStatus}</p>}
            {profiles.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs">
                {profiles.map((p) => (
                  <div key={p.id} className="flex justify-between py-0.5">
                    <span className="font-mono">{p.id.substring(0, 12)}...</span>
                    <Badge variant={p.role === "admin" ? "default" : "secondary"} className="text-[10px]">{p.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Data Integrity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Orphan detection, missing results, referential checks.</p>
            <Button variant="outline" size="sm" disabled={checkingIntegrity} onClick={runIntegrityChecks}>
              {checkingIntegrity ? "Checking..." : "Run Checks"}
            </Button>
            {integrityResults && (
              <ul className="text-xs space-y-1 mt-2">
                {integrityResults.map((msg, i) => (
                  <li key={i} className={msg === "No issues found." ? "text-green-600" : "text-amber-600"}>{msg}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Image Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Upload driver photo, team logo, team car image, or circuit image.</p>
            <div className="flex gap-2">
              <select
                value={uploadType}
                onChange={(e) => { setUploadType(e.target.value as typeof uploadType); setUploadEntityId(""); setUploadStatus(null); setUploadError(null) }}
                className="rounded-md border px-2 py-1 text-sm bg-background flex-1"
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
                  className="rounded-md border px-2 py-1 text-sm bg-background w-full"
                />
                <label className="text-sm flex items-center gap-1">
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
                className="rounded-md border px-2 py-1 text-sm bg-background w-full"
              >
                <option value="">Select {uploadType}...</option>
                {searchAll ? (
                  // combined list
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
              className="text-sm"
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
            {uploadStatus && <p className="text-xs text-green-600">{uploadStatus}</p>}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Car Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamCarImagePanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Driver Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DriverImagePanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Constructor Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConstructorColorPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nationality Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NationalityFlagPanel />
          </CardContent>
        </Card>
      </div>

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
              <p className="text-muted-foreground">
                The database contains tables for seasons, circuits, constructors, drivers,
                races, sessions, qualifying, results, standings, pit stops, weather data,
                tire stints, and sync job logs.
              </p>
              <p className="text-sm mt-2">
                Run the Supabase migrations in <code>supabase/migrations/</code> to set up the schema,
                then use the Import buttons above to populate data from the Jolpica API.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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
        className="rounded border px-2 py-1 text-sm bg-background w-full"
      />
      {searchQuery && filteredConstructors.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {filteredConstructors.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedConstructorId(c.id); setSearchQuery(c.name) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedConstructorId === c.id ? "bg-muted font-medium" : ""}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredConstructors.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No teams found.</p>
      )}

      {selectedConstructorId && (
        <>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded border px-2 py-1 text-sm bg-background"
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

          {status && <p className="text-xs text-muted-foreground">{status}</p>}

          {images && images.length > 0 && (
            <div className="grid gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`car-${img.year}`} className="w-24 h-12 object-contain rounded" />
                  <span className="text-sm font-medium flex-1">{img.year}</span>
                  <Button variant="outline" size="sm" onClick={() => deleteImage(img.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
          {images && images.length === 0 && (
            <p className="text-xs text-muted-foreground">No images uploaded for this team yet.</p>
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

  const deleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return
    setStatus("Deleting...")
    const { error } = await supabase.from("driver_images").delete().eq("id", id)
    if (error) setStatus(`Delete failed: ${error.message}`)
    else {
      setStatus("Deleted.")
      refetchImages()
    }
  }

  const typeOptions = [
    { value: "card", label: "Card" },
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
        className="rounded border px-2 py-1 text-sm bg-background w-full"
      />
      {searchQuery && filteredDrivers.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {filteredDrivers.map((d) => (
            <button
              key={d.id}
              onClick={() => { setSelectedDriverId(d.id); setSearchQuery(`${d.given_name} ${d.family_name}`) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedDriverId === d.id ? "bg-muted font-medium" : ""}`}
            >
              {d.given_name} {d.family_name}
            </button>
          ))}
        </div>
      )}
      {searchQuery && filteredDrivers.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No drivers found.</p>
      )}

      {selectedDriverId && (
        <>
          <div className="flex gap-2 items-center">
            <select
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              className="rounded border px-2 py-1 text-sm bg-background"
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
              className="w-20 rounded border px-2 py-1 text-sm bg-background"
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

          {status && <p className="text-xs text-muted-foreground">{status}</p>}

          {images && images.length > 0 && (
            <div className="grid gap-2 mt-2">
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`${img.type}`} className="w-24 h-12 object-contain rounded" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium capitalize">{img.type}</span>
                    {img.year && <span className="text-muted-foreground ml-2">({img.year})</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteImage(img.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
          {images && images.length === 0 && (
            <p className="text-xs text-muted-foreground">No images uploaded for this driver yet.</p>
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
        className="w-full rounded border px-3 py-2 text-sm bg-background"
      />
      {searchQuery && filteredConstructors.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded border">
          {filteredConstructors.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConstructor(c.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedId === c.id ? "bg-muted font-medium" : ""}`}
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
        <p className="text-xs text-muted-foreground px-1">No constructors found.</p>
      )}

      {selectedId && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Primary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={primary} onChange={(e) => setPrimary(e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm font-mono bg-background" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Secondary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm font-mono bg-background" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Accent</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              <input type="text" value={accent} onChange={(e) => setAccent(e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm font-mono bg-background" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-8 rounded border flex items-center justify-center text-xs font-medium" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})`, color: accent }}>
              Preview
            </div>
            <Button variant="default" size="sm" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={resetToDefaults}>
              Reset
            </Button>
          </div>

          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      )}
    </div>
  )
}

function NationalityFlagPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [flagUrl, setFlagUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: flags } = useQuery({
    queryKey: ["nationality-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("nationality_flags").select("*").order("nationality")
      return (data ?? []) as NationalityFlag[]
    },
  })

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

  const validFlags = new Set(flags?.map((f) => f.nationality) ?? [])
  const filtered = (allNationalities ?? []).filter((n) =>
    n.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectNationality = (nationality: string) => {
    setSelected(nationality)
    setSearchQuery(nationality)
    const existing = flags?.find((f) => f.nationality === nationality)
    setFlagUrl(existing?.flag_url ?? "")
  }

  const deleteStorageFiles = async (nationality: string) => {
    const { data: existing } = await supabase.storage.from("images").list("nationality-flags", {
      search: nationality,
    })
    if (existing && existing.length > 0) {
      const paths = existing.map((file) => `nationality-flags/${file.name}`)
      await supabase.storage.from("images").remove(paths)
    }
  }

  const uploadFlag = async (f: File) => {
    if (!selected) return
    setUploading(true)
    setStatus(null)
    try {
      await deleteStorageFiles(selected)
      const ext = f.name.split(".").pop() || "png"
      const path = `nationality-flags/${selected}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("images").upload(path, f, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      setFlagUrl(`${publicUrl}?t=${Date.now()}`)
      const { error: dbErr } = await supabase.from("nationality_flags").upsert(
        { nationality: selected, flag_url: publicUrl },
        { onConflict: "nationality" }
      )
      if (dbErr) throw dbErr
      setStatus("Flag uploaded.")
      queryClient.invalidateQueries({ queryKey: ["nationality-flags"] })
    } catch (err) {
      setStatus(extractErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const deleteFlag = async () => {
    if (!selected) return
    setStatus(null)
    try {
      await deleteStorageFiles(selected)
      const { error } = await supabase.from("nationality_flags").delete().eq("nationality", selected)
      if (error) throw error
      setFlagUrl("")
      setSelected(null)
      setStatus("Flag removed.")
      queryClient.invalidateQueries({ queryKey: ["nationality-flags"] })
    } catch (err) {
      setStatus(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search nationality..."
        className="w-full rounded border px-3 py-2 text-sm bg-background"
      />
      {searchQuery && filtered.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded border">
          {filtered.map((n) => (
            <button
              key={n}
              onClick={() => selectNationality(n)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${selected === n ? "bg-muted font-medium" : ""}`}
            >
              {validFlags.has(n) ? (
                <img src={flags?.find((f) => f.nationality === n)?.flag_url} alt={n} className="w-5 h-3.5 object-cover rounded" />
              ) : (
                <span className="w-5 h-3.5 rounded bg-muted" />
              )}
              <span>{n}</span>
            </button>
          ))}
        </div>
      )}
      {searchQuery && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No nationalities found.</p>
      )}

      {selected && (
        <div className="space-y-3 pt-2">
          {flagUrl && (
            <div className="flex items-center gap-3">
              <img src={flagUrl} alt={selected} className="w-12 h-8 object-cover rounded border" />
              <span className="text-sm font-medium">{selected}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Flag"}
            </Button>
            {flagUrl && (
              <Button variant="destructive" size="sm" onClick={deleteFlag}>Remove</Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadFlag(f)
            }}
          />
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      )}
    </div>
  )
}
