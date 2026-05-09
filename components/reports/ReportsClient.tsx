'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  SlidersHorizontal,
  Columns3,
  Download,
  Loader2,
  BarChart3,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronDown,
} from 'lucide-react'
import type { Role } from '@/lib/types/app'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportsClientProps {
  sectors: Array<{ sector_id: number; sector_name: string }>
  role: Role
}

interface ProfileCategory {
  id: number
  name: string
  sort_order: number
}

interface ProfileField {
  id: number
  category_id: number
  caption: string
  field_type: string
  sort_order: number
}

interface MemberRow {
  its_no: number
  name: string
  subsector_id: number
  sector_id: number
  sabeel_no: string
  head_its_no: number | null
  building_name: string | null
  masool_name: string | null
  musaid_names: string | null
}

interface ProfileValueRow {
  its_no: number
  field_id: number
  value: string | null
  profile_field: { caption: string; category_id: number; field_type: string } | null
}

interface ReportData {
  members: MemberRow[]
  values: ProfileValueRow[]
  categories: ProfileCategory[]
  fields: ProfileField[]
}

interface Subsector {
  subsector_id: number
  subsector_name: string
  sector_id: number
}

interface StaffOption {
  its_no: number
  name: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

function buildPivotRows(
  members: MemberRow[],
  values: ProfileValueRow[],
  fields: ProfileField[],
  selectedFieldIds: Set<number>,
): Array<Record<string, string | number>> {
  const fieldMap = new Map(fields.map((f) => [f.id, f.caption]))
  const valueMap = new Map<string, string>()
  for (const v of values) {
    valueMap.set(`${v.its_no}__${v.field_id}`, v.value ?? '')
  }

  return members.map((m) => {
    const row: Record<string, string | number> = {
      its_no: m.its_no,
      name: m.name,
    }
    for (const fid of selectedFieldIds) {
      const caption = fieldMap.get(fid) ?? String(fid)
      row[caption] = valueMap.get(`${m.its_no}__${fid}`) ?? ''
    }
    return row
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-8"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsClient({ sectors, role }: ReportsClientProps) {
  // ── Core filters (server-side) ─────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [subsectorId, setSubsectorId] = useState('')
  const [subsectors, setSubsectors] = useState<Subsector[]>([])
  const [loadingSubsectors, setLoadingSubsectors] = useState(false)

  // ── Enhanced identity filters (client-side) ────────────────────────────────
  const [itsNoFilter, setItsNoFilter] = useState('')
  const [sabelNoFilter, setSabelNoFilter] = useState('')
  const [hofOnly, setHofOnly] = useState(false)
  const [buildingFilter, setBuildingFilter] = useState('')
  const [masoolFilter, setMasoolFilter] = useState('')
  const [musaidFilter, setMusaidFilter] = useState('')

  // ── Staff options for dropdowns ────────────────────────────────────────────
  const [masoolOptions, setMasoolOptions] = useState<StaffOption[]>([])
  const [musaidOptions, setMusaidOptions] = useState<StaffOption[]>([])

  // ── Data state ─────────────────────────────────────────────────────────────
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // ── Column selector state ──────────────────────────────────────────────────
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<number>>(new Set())
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false)

  // ── Export state ───────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // ── Chart filter state (SuperAdmin) ────────────────────────────────────────
  const [chartFilterFieldId, setChartFilterFieldId] = useState<number | null>(null)
  const [chartFilterValue, setChartFilterValue] = useState<string | null>(null)

  // ── Load masool + musaid options on mount ──────────────────────────────────
  useEffect(() => {
    fetch('/api/members/filters')
      .then((r) => r.json())
      .then((d) => {
        setMusaidOptions(d.musaids ?? [])
      })
      .catch(() => {})

    // Masool: fetch from user_sector via filters endpoint (sectors list)
    // We derive masools from sector assignments — use /api/members/filters?sector_id=ALL
    // The filters endpoint returns musaids; masools need a separate query.
    // For now, fetch all masools via a dedicated call we pass sector_ids for.
    fetch('/api/reports/masools')
      .then((r) => r.json())
      .then((d) => setMasoolOptions(d.masools ?? []))
      .catch(() => {})
  }, [])

  // ── Fetch subsectors when sector changes ───────────────────────────────────
  useEffect(() => {
    setSubsectorId('')
    setSubsectors([])
    if (!sectorId) return

    setLoadingSubsectors(true)
    fetch(`/api/members/filters?sector_id=${sectorId}`)
      .then((r) => r.json())
      .then((d) => setSubsectors(d.subsectors ?? []))
      .catch(() => {})
      .finally(() => setLoadingSubsectors(false))
  }, [sectorId])

  // ── Fetch report data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryId) params.set('category_id', categoryId)
      if (fieldId) params.set('field_id', fieldId)
      if (sectorId) params.set('sector_id', sectorId)
      if (subsectorId) params.set('subsector_id', subsectorId)

      const res = await fetch(`/api/reports/profile?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? 'Failed to load report data')
      }
      const json: ReportData = await res.json()
      setData(json)
      setHasFetched(true)
      if (!hasFetched && json.fields.length > 0) {
        setSelectedFieldIds(new Set(json.fields.map((f) => f.id)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [categoryId, fieldId, sectorId, subsectorId, hasFetched])

  // ── Apply client-side identity filters ────────────────────────────────────
  const filteredMembers = useMemo(() => {
    if (!data) return []
    let members = data.members

    if (itsNoFilter) {
      const n = Number(itsNoFilter)
      if (!isNaN(n)) members = members.filter((m) => m.its_no === n)
    }
    if (sabelNoFilter) {
      const q = sabelNoFilter.toLowerCase()
      members = members.filter((m) => m.sabeel_no?.toLowerCase().includes(q))
    }
    if (hofOnly) {
      members = members.filter((m) => m.its_no === m.head_its_no)
    }
    if (buildingFilter) {
      const q = buildingFilter.toLowerCase()
      members = members.filter((m) => m.building_name?.toLowerCase().includes(q))
    }
    if (masoolFilter) {
      members = members.filter((m) => m.masool_name === masoolFilter)
    }
    if (musaidFilter) {
      members = members.filter((m) => m.musaid_names?.includes(musaidFilter))
    }

    return members
  }, [data, itsNoFilter, sabelNoFilter, hofOnly, buildingFilter, masoolFilter, musaidFilter])

  // ── Derived data ──────────────────────────────────────────────────────────
  const pivotRows = useMemo(() => {
    if (!data) return []
    let members = filteredMembers
    if (chartFilterFieldId && chartFilterValue) {
      const valueMap = new Map<number, string>()
      for (const v of data.values) {
        if (v.field_id === chartFilterFieldId) valueMap.set(v.its_no, v.value ?? '')
      }
      members = members.filter((m) => valueMap.get(m.its_no) === chartFilterValue)
    }
    return buildPivotRows(members, data.values, data.fields, selectedFieldIds)
  }, [data, filteredMembers, selectedFieldIds, chartFilterFieldId, chartFilterValue])

  const visibleColumns = useMemo(() => {
    if (!data) return []
    return data.fields.filter((f) => selectedFieldIds.has(f.id))
  }, [data, selectedFieldIds])

  const fieldsByCategory = useMemo(() => {
    if (!data) return []
    return data.categories
      .map((cat) => ({
        category: cat,
        fields: data.fields.filter((f) => f.category_id === cat.id),
      }))
      .filter((c) => c.fields.length > 0)
  }, [data])

  const hasIdentityFilters =
    itsNoFilter || sabelNoFilter || hofOnly || buildingFilter || masoolFilter || musaidFilter

  function clearIdentityFilters() {
    setItsNoFilter('')
    setSabelNoFilter('')
    setHofOnly(false)
    setBuildingFilter('')
    setMasoolFilter('')
    setMusaidFilter('')
  }

  // ── Column selector helpers ────────────────────────────────────────────────
  function toggleField(fid: number) {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev)
      if (next.has(fid)) next.delete(fid)
      else next.add(fid)
      return next
    })
  }

  function selectAllFields() {
    if (!data) return
    setSelectedFieldIds(new Set(data.fields.map((f) => f.id)))
  }

  function deselectAllFields() {
    setSelectedFieldIds(new Set())
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!data || !pivotRows.length) return
    setExporting(true)
    setExportSuccess(false)
    try {
      const itsNos = pivotRows.map((r) => r.its_no).join(',')
      const colList = ['its_no', 'name', ...visibleColumns.map((f) => f.caption)]
      const params = new URLSearchParams({ its_nos: itsNos, columns: colList.join(',') })
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `profile-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 4000)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ── Chart data (SuperAdmin) ────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data || role !== 'SuperAdmin') return []
    const firstField = visibleColumns[0]
    if (!firstField) return []

    const counts: Record<string, number> = {}
    for (const v of data.values) {
      if (v.field_id !== firstField.id || !v.value) continue
      counts[v.value] = (counts[v.value] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [data, role, visibleColumns])

  const chartField = visibleColumns[0]

  const showMasoolDropdown = role === 'SuperAdmin' || role === 'Admin'
  const showMusaidDropdown = role === 'SuperAdmin' || role === 'Admin' || role === 'Masool'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Filters + Actions bar ─────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filters
          </h2>
        </div>

        {/* Row 1: Category / Field / Sector / Subsector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <FilterSelect label="Umoor Category" value={categoryId} onChange={(v) => { setCategoryId(v); setFieldId('') }}>
            <option value="">All Categories</option>
            {(data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Profile Field" value={fieldId} onChange={setFieldId}>
            <option value="">All Fields</option>
            {(data?.fields ?? [])
              .filter((f) => !categoryId || String(f.category_id) === categoryId)
              .map((f) => (
                <option key={f.id} value={f.id}>{f.caption}</option>
              ))}
          </FilterSelect>

          {(role === 'SuperAdmin' || role === 'Admin') && (
            <FilterSelect label="Sector" value={sectorId} onChange={setSectorId}>
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>
              ))}
            </FilterSelect>
          )}

          {(role === 'SuperAdmin' || role === 'Admin' || role === 'Masool') && sectorId && (
            <FilterSelect label="Subsector" value={subsectorId} onChange={setSubsectorId}>
              <option value="">{loadingSubsectors ? 'Loading…' : 'All Subsectors'}</option>
              {subsectors.map((s) => (
                <option key={s.subsector_id} value={s.subsector_id}>{s.subsector_name}</option>
              ))}
            </FilterSelect>
          )}
        </div>

        {/* Row 2: Identity filters */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <FilterInput label="ITS No" value={itsNoFilter} onChange={setItsNoFilter} placeholder="e.g. 30012345" type="number" />
          <FilterInput label="Sabeel No" value={sabelNoFilter} onChange={setSabelNoFilter} placeholder="e.g. KWT-001" />
          <FilterInput label="Building" value={buildingFilter} onChange={setBuildingFilter} placeholder="Building name…" />

          {showMasoolDropdown && (
            <FilterSelect label="Masool" value={masoolFilter} onChange={setMasoolFilter}>
              <option value="">All Masools</option>
              {masoolOptions.map((m) => (
                <option key={m.its_no} value={m.name}>{m.name}</option>
              ))}
            </FilterSelect>
          )}

          {showMusaidDropdown && (
            <FilterSelect label="Musaid" value={musaidFilter} onChange={setMusaidFilter}>
              <option value="">All Musaids</option>
              {musaidOptions.map((m) => (
                <option key={m.its_no} value={m.name}>{m.name}</option>
              ))}
            </FilterSelect>
          )}

          {/* HOF toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              HOF Only
            </label>
            <button
              onClick={() => setHofOnly((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                hofOnly
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted/40'
              }`}
            >
              {hofOnly ? 'HOF Only ✓' : 'All Members'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {loading ? 'Loading…' : hasFetched ? 'Refresh' : 'Load Report'}
          </button>

          {hasFetched && data && (
            <span className="text-xs text-muted-foreground">
              {hasIdentityFilters
                ? <>{filteredMembers.length} of {data.members.length} member{data.members.length !== 1 ? 's' : ''}</>
                : <>{data.members.length} member{data.members.length !== 1 ? 's' : ''}</>}
              {chartFilterValue && (
                <> · filtered to <strong className="text-foreground">{pivotRows.length}</strong>
                  {' '}<button onClick={() => { setChartFilterFieldId(null); setChartFilterValue(null) }} className="text-primary underline ml-1">clear</button>
                </>
              )}
            </span>
          )}

          {hasIdentityFilters && (
            <button
              onClick={clearIdentityFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear identity filters
            </button>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── SuperAdmin Charts ──────────────────────────────────────────── */}
      {role === 'SuperAdmin' && hasFetched && data && chartData.length > 0 && chartField && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            Distribution — {chartField.caption}
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            Click a bar to filter the table below.
            {chartFilterValue && (
              <button
                onClick={() => { setChartFilterFieldId(null); setChartFilterValue(null) }}
                className="ml-2 text-primary underline"
              >
                Clear filter
              </button>
            )}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 24, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry) => { setChartFilterFieldId(chartField.id); setChartFilterValue(entry.name ?? null) }}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={chartFilterValue === chartData[i].name ? CHART_COLORS[0] : CHART_COLORS[i % CHART_COLORS.length]} opacity={chartFilterValue && chartFilterValue !== chartData[i].name ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} cursor="pointer" onClick={(entry) => { setChartFilterFieldId(chartField.id); setChartFilterValue(entry.name ?? null) }}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Table section ────────────────────────────────────────────────── */}
      {hasFetched && data && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setColumnSelectorOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 transition-colors"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  Columns
                  <span className="ml-1 bg-primary/10 text-primary rounded px-1.5 py-0.5 font-semibold">
                    {selectedFieldIds.size}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${columnSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {columnSelectorOpen && (
                  <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-80 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-popover">
                      <button onClick={selectAllFields} className="text-xs text-primary hover:underline">Select All</button>
                      <span className="text-muted-foreground">·</span>
                      <button onClick={deselectAllFields} className="text-xs text-muted-foreground hover:text-foreground">Deselect All</button>
                    </div>
                    {fieldsByCategory.map(({ category, fields }) => (
                      <div key={category.id} className="px-3 py-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{category.name}</p>
                        {fields.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary transition-colors">
                            {selectedFieldIds.has(f.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="text-xs text-foreground">{f.caption}</span>
                            <input type="checkbox" className="sr-only" checked={selectedFieldIds.has(f.id)} onChange={() => toggleField(f.id)} />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                {pivotRows.length} row{pivotRows.length !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || !pivotRows.length}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {exportSuccess && (
            <div className="px-5 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-medium">
              CSV exported successfully.
            </div>
          )}

          {pivotRows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No data to display.{' '}
              {filteredMembers.length === 0 && data.members.length > 0
                ? 'No members match the current identity filters.'
                : data.members.length === 0
                ? 'No members found for the selected filters.'
                : 'Select at least one column to display.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-28">ITS No.</th>
                    <th className="sticky left-28 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[160px]">Name</th>
                    {visibleColumns.map((f) => (
                      <th key={f.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {f.caption}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pivotRows.map((row) => (
                    <tr key={row.its_no} className="hover:bg-muted/20 transition-colors">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">{row.its_no}</td>
                      <td className="sticky left-28 z-10 bg-card px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{row.name}</td>
                      {visibleColumns.map((f) => (
                        <td key={f.id} className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
                          {String(row[f.caption] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!hasFetched && !loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-16 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No report loaded yet</p>
          <p className="text-xs text-muted-foreground">
            Set your filters above and click <strong>Load Report</strong> to begin.
          </p>
        </div>
      )}
    </div>
  )
}
