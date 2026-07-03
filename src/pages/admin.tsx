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
import { useAuth, getProfile } from "@/stores/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SyncJob, Profile } from "@/types/database"

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
  const [uploadType, setUploadType] = useState<"driver" | "constructor" | "car" | "circuit">("driver")
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
    enabled: uploadType === "constructor" || uploadType === "car" || searchAll,
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Manage Cars</h3>
              <CrudTable
                entityType="cars"
                columns={[
                  { key: "car_id", label: "Car ID" },
                  { key: "name", label: "Name" },
                  { key: "engine_name", label: "Engine" },
                  { key: "power_unit_name", label: "Power Unit" },
                  { key: "chassis_name", label: "Chassis" },
                ]}
              />

              <hr />

              <h3 className="text-sm font-medium">Assign Car to Teams & Upload Images</h3>
              <CarAssignmentPanel constructorsList={constructorsList ?? []} />
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
            <p className="text-sm">
              Your role: <Badge variant={userProfile?.role === "admin" ? "default" : "secondary"}>{userProfile?.role ?? "public"}</Badge>
            </p>
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
                <option value="car">Car (Team)</option>
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
                    {(uploadType === "constructor" || uploadType === "car") && (constructorsList ?? []).filter(c => c.name.toLowerCase().includes(uploadSearch.toLowerCase())).map((c) => (
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

                  const column = uploadType === "driver" ? "photo_url" : uploadType === "constructor" ? "logo_url" : uploadType === "car" ? "car_image_url" : "image_url"
                  const table = uploadType === "driver" ? "drivers" : uploadType === "constructor" || uploadType === "car" ? "constructors" : "circuits"
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
      </div>

      <Tabs defaultValue="sync">
        <div className="overflow-x-auto hide-scrollbar">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="sync">Sync Jobs</TabsTrigger>
            <TabsTrigger value="crud">CRUD Tables</TabsTrigger>
            <TabsTrigger value="schema">Schema Info</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Import Job History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Finished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncJobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.source}</TableCell>
                      <TableCell>{job.entity_type}</TableCell>
                      <TableCell>{statusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.started_at
                          ? new Date(job.started_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {job.finished_at
                          ? new Date(job.finished_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!syncJobs || syncJobs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No sync jobs have been run yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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

function CarAssignmentPanel({ constructorsList }: { constructorsList: { id: string; constructor_id: string; name: string }[] }) {
  const [carsList, setCarsList] = useState<{ id: string; car_id: string; name: string }[]>([])
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [selectedConstructors, setSelectedConstructors] = useState<Record<string, { selected: boolean; fromYear: number | null; toYear: number | null }>>({})
  const [yearForImage, setYearForImage] = useState<number | null>(new Date().getFullYear())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [carImages, setCarImages] = useState<{ id: string; year: number; image_url: string; caption: string | null }[]>([])
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.from("cars").select("id, car_id, name").order("created_at", { ascending: false })
      if (mounted && data) setCarsList(data as any)
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!selectedCarId) return
    ;(async () => {
      const { data } = await supabase.from("car_teams").select("constructor_id").eq("car_id", selectedCarId)
      const map: Record<string, { selected: boolean; fromYear: number | null; toYear: number | null }> = {}
      ;(data ?? []).forEach((r: any) => { map[r.constructor_id] = { selected: true, fromYear: r.assigned_from_year ?? null, toYear: r.assigned_to_year ?? null } })
      setSelectedConstructors(map)

      const { data: imgs } = await supabase.from("car_images").select("id, year, image_url, caption").eq("car_id", selectedCarId).order("year", { ascending: false })
      setCarImages((imgs as any) ?? [])
    })()
  }, [selectedCarId])

  const toggleConstructor = (id: string) => {
    setSelectedConstructors((s) => ({ ...s, [id]: { selected: !s[id]?.selected, fromYear: s[id]?.fromYear ?? null, toYear: s[id]?.toYear ?? null } }))
  }

  const setConstructorYears = (id: string, fromYear: number | null, toYear: number | null) => {
    setSelectedConstructors((s) => ({ ...s, [id]: { selected: true, fromYear, toYear } }))
  }

  const saveAssignments = async () => {
    if (!selectedCarId) return setStatus("Select a car first")
    setStatus("Saving assignments...")
    // remove existing assignments for this car then insert new ones (with years)
    await supabase.from("car_teams").delete().eq("car_id", selectedCarId)
    const toInsert = Object.keys(selectedConstructors)
      .filter((k) => selectedConstructors[k].selected)
      .map((constructor_id) => ({
        car_id: selectedCarId,
        constructor_id,
        assigned_from_year: selectedConstructors[constructor_id].fromYear,
        assigned_to_year: selectedConstructors[constructor_id].toYear,
      }))
    if (toInsert.length > 0) {
      const { error } = await supabase.from("car_teams").insert(toInsert)
      if (error) setStatus(`Error: ${error.message}`)
      else setStatus("Assignments saved")
    } else {
      setStatus("Assignments cleared")
    }
  }

  const uploadImage = async () => {
    if (!selectedCarId) return setStatus("Select a car first")
    if (!imageFile || !yearForImage) return setStatus("Select a year and image file")
    setStatus("Uploading image...")
    const ext = imageFile.name.split('.').pop() || 'png'
    const car = carsList.find((c) => c.id === selectedCarId)
    const path = `cars/${car?.car_id || selectedCarId}/${yearForImage}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, imageFile, { upsert: true })
    if (uploadErr) return setStatus(`Upload failed: ${uploadErr.message}`)
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
    const publicUrl = urlData?.publicUrl
    if (!publicUrl) return setStatus('Could not get public URL')
    const { error } = await supabase.from('car_images').upsert({ car_id: selectedCarId, year: yearForImage, image_url: publicUrl })
    if (error) return setStatus(`DB save failed: ${error.message}`)
    setStatus('Image uploaded')
    // refresh images
    const { data: imgs } = await supabase.from("car_images").select("id, year, image_url, caption").eq("car_id", selectedCarId).order("year", { ascending: false })
    setCarImages((imgs as any) ?? [])
  }

  const updateImageCaption = async (id: string, caption: string) => {
    const { error } = await supabase.from('car_images').update({ caption }).eq('id', id)
    if (error) setStatus(`Caption save error: ${error.message}`)
    else {
      setStatus('Caption saved')
      const { data: imgs } = await supabase.from("car_images").select("id, year, image_url, caption").eq("car_id", selectedCarId).order("year", { ascending: false })
      setCarImages((imgs as any) ?? [])
    }
  }

  const deleteImage = async (img: { id: string; year: number; image_url: string }) => {
    if (!confirm('Delete this image?')) return
    setStatus('Deleting...')
    // attempt to delete storage object if we can derive path
    try {
      const url = img.image_url
      const marker = '/storage/v1/object/public/images/'
      let path = ''
      const idx = url.indexOf(marker)
      if (idx !== -1) {
        path = url.substring(idx + marker.length)
        await supabase.storage.from('images').remove([path])
      }
    } catch (e) {
      // ignore storage delete errors
    }
    const { error } = await supabase.from('car_images').delete().eq('id', img.id)
    if (error) setStatus(`Delete failed: ${error.message}`)
    else {
      setStatus('Deleted')
      const { data: imgs } = await supabase.from("car_images").select("id, year, image_url, caption").eq("car_id", selectedCarId).order("year", { ascending: false })
      setCarImages((imgs as any) ?? [])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <select value={selectedCarId ?? ''} onChange={(e) => setSelectedCarId(e.target.value || null)} className="rounded border px-2 py-1 bg-background">
          <option value="">Select a car...</option>
          {carsList.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.car_id})</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={async () => { const { data } = await supabase.from('cars').select('id, car_id, name').order('created_at', { ascending: false }); setCarsList((data as any) ?? []) }}>Refresh</Button>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-2">Assign to Teams</div>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {constructorsList.map((ct) => (
              <div key={ct.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!selectedConstructors[ct.id]?.selected} onChange={() => toggleConstructor(ct.id)} />
                <span className="flex-1">{ct.name}</span>
                {selectedConstructors[ct.id]?.selected && (
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="from" value={selectedConstructors[ct.id]?.fromYear ?? ''} onChange={(e) => setConstructorYears(ct.id, Number(e.target.value) || null, selectedConstructors[ct.id]?.toYear ?? null)} className="w-20 rounded border px-2 py-1 bg-background text-sm" />
                    <input type="number" placeholder="to" value={selectedConstructors[ct.id]?.toYear ?? ''} onChange={(e) => setConstructorYears(ct.id, selectedConstructors[ct.id]?.fromYear ?? null, Number(e.target.value) || null)} className="w-20 rounded border px-2 py-1 bg-background text-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button variant="default" size="sm" onClick={saveAssignments}>Save Assignments</Button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Upload Car Image (per year)</div>
          <div className="flex gap-2 items-center">
            <input type="number" value={yearForImage ?? ''} onChange={(e) => setYearForImage(Number(e.target.value) || new Date().getFullYear())} className="w-24 rounded border px-2 py-1 bg-background" />
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            <Button variant="default" size="sm" onClick={uploadImage}>Upload</Button>
          </div>
          <div className="mt-2">
            {status && <div className="text-xs text-muted-foreground">{status}</div>}
            <div className="mt-2 grid gap-2">
              {carImages.map((img) => (
                <div key={img.id} className="flex items-center gap-2">
                  <img src={img.image_url} alt={`car-${img.year}`} className="w-24 h-12 object-contain rounded" />
                  <div className="flex-1">
                    <div className="text-sm">{img.year}</div>
                    <div className="flex gap-2 items-center mt-1">
                      <input className="rounded border px-2 py-1 text-sm bg-background" defaultValue={img.caption ?? ''} onBlur={(e) => updateImageCaption(img.id, e.target.value)} placeholder="Caption (optional)" />
                      <Button variant="outline" size="sm" onClick={() => deleteImage(img)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
