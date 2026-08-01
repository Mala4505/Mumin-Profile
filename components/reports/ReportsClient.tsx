'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
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
  Plus,
  X,
  Filter,
} from 'lucide-react'
import type { Role } from '@/lib/types/app'
import { RespondentDetailSheet } from './RespondentDetailSheet'
import { GenderPill, MemberIdentity } from '@/components/members/MemberPrimitives'

/** Canonical table-header typography, shared with every other table in the app. */
const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap'
/** Width of the sticky identity column. Kept in sync with FormAnalyticsSection. */
const STICKY_COL = 'w-56 min-w-56'

const ReportsDistributionCharts = dynamic(
  () => import('./ReportsDistributionCharts').then(m => ({ default: m.ReportsDistributionCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="h-4 bg-muted rounded w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-60 bg-muted rounded animate-pulse" />
          <div className="h-60 bg-muted rounded animate-pulse" />
        </div>
      </div>
    ),
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportsClientProps {
  sectors: Array<{ sector_id: number; sector_name: string }>
  categories: Array<{ id: number; name: string }>
  role: Role
}

interface FormOption {
  id: string
  title: string
  status: string
  umoor_category_id: number | null
  response_count: number
}

export interface Question {
  field_id: number
  caption: string
  field_type: string
  sort_order: number
}

export interface Respondent {
  its_no: number
  name: string
  gender: 'M' | 'F' | null
  age: number | null
  sector_name: string | null
  subsector_name: string | null
  submitted_at: string
}

interface FormReportData {
  questions: Question[]
  respondents: Respondent[]
  answers: Record<number, Record<number, string>>
}

interface Subsector {
  subsector_id: number
  subsector_name: string
  sector_id: number
}

type FilterOperator = 'eq' | 'contains' | 'starts_with' | 'is_empty' | 'is_not_empty'

interface FilterRule {
  id: string
  field_id: number
  operator: FilterOperator
  value: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: 'eq', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

function getOperators(fieldType: string) {
  if (fieldType === 'text') return ALL_OPERATORS
  if (fieldType === 'multiselect')
    return ALL_OPERATORS.filter((op) => op.value === 'contains' || op.value.startsWith('is_'))
  return ALL_OPERATORS.filter((op) => op.value === 'eq' || op.value.startsWith('is_'))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPivotRows(
  respondents: Respondent[],
  answers: Record<number, Record<number, string>>,
  questions: Question[],
  selectedFieldIds: Set<number>,
): Array<Record<string, string | number>> {
  return respondents.map((r) => {
    const row: Record<string, string | number> = { its_no: r.its_no, name: r.name }
    for (const q of questions) {
      if (selectedFieldIds.has(q.field_id)) {
        row[q.caption] = answers[r.its_no]?.[q.field_id] ?? ''
      }
    }
    return row
  })
}

function applyFilters(
  respondents: Respondent[],
  answers: Record<number, Record<number, string>>,
  logic: 'AND' | 'OR',
  rules: FilterRule[],
): Respondent[] {
  const activeRules = rules.filter(
    (r) => r.field_id && (['is_empty', 'is_not_empty'].includes(r.operator) || r.value.trim() !== ''),
  )
  if (!activeRules.length) return respondents

  return respondents.filter((r) => {
    const check = (rule: FilterRule): boolean => {
      const val = answers[r.its_no]?.[rule.field_id] ?? ''
      switch (rule.operator) {
        case 'eq':
          return val.toLowerCase() === rule.value.toLowerCase()
        case 'contains':
          return val.toLowerCase().includes(rule.value.toLowerCase())
        case 'starts_with':
          return val.toLowerCase().startsWith(rule.value.toLowerCase())
        case 'is_empty':
          return !val
        case 'is_not_empty':
          return !!val
      }
    }
    return logic === 'AND' ? activeRules.every(check) : activeRules.some(check)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
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
          disabled={disabled}
          className="w-full appearance-none px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-8 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

function FilterBuilder({
  questions,
  logic,
  onLogicChange,
  rules,
  onRulesChange,
}: {
  questions: Question[]
  logic: 'AND' | 'OR'
  onLogicChange: (l: 'AND' | 'OR') => void
  rules: FilterRule[]
  onRulesChange: (r: FilterRule[]) => void
}) {
  const selectClass =
    'appearance-none px-2.5 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-7'

  function addRule() {
    const firstField = questions[0]
    if (!firstField) return
    const ops = getOperators(firstField.field_type)
    onRulesChange([
      ...rules,
      { id: crypto.randomUUID(), field_id: firstField.field_id, operator: ops[0].value, value: '' },
    ])
  }

  function removeRule(id: string) {
    onRulesChange(rules.filter((r) => r.id !== id))
  }

  function updateRule(id: string, patch: Partial<FilterRule>) {
    onRulesChange(
      rules.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, ...patch }
        // Reset operator when field changes
        if (patch.field_id !== undefined) {
          const q = questions.find((q) => q.field_id === patch.field_id)
          const ops = getOperators(q?.field_type ?? 'text')
          updated.operator = ops[0].value
          updated.value = ''
        }
        return updated
      }),
    )
  }

  const showValue = (op: FilterOperator) => !['is_empty', 'is_not_empty'].includes(op)

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="flex items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Filter Responses
        </span>
        {rules.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Match</span>
            <button
              onClick={() => onLogicChange('AND')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                logic === 'AND'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted/40'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => onLogicChange('OR')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                logic === 'OR'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted/40'
              }`}
            >
              ANY
            </button>
            <span>of these rules</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {rules.map((rule) => {
          const q = questions.find((q) => q.field_id === rule.field_id)
          const ops = getOperators(q?.field_type ?? 'text')
          return (
            <div key={rule.id} className="flex items-center gap-2 flex-wrap">
              {/* Field */}
              <div className="relative">
                <select
                  value={rule.field_id}
                  onChange={(e) => updateRule(rule.id, { field_id: Number(e.target.value) })}
                  className={`${selectClass} max-w-[200px]`}
                >
                  {questions.map((q) => (
                    <option key={q.field_id} value={q.field_id}>
                      {q.caption}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>

              {/* Operator */}
              <div className="relative">
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                  className={selectClass}
                >
                  {ops.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>

              {/* Value */}
              {showValue(rule.operator) && (
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  placeholder="Value…"
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50 w-40"
                />
              )}

              {/* Remove */}
              <button
                onClick={() => removeRule(rule.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={addRule}
        disabled={!questions.length}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        Add filter
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsClient({ sectors, categories, role }: ReportsClientProps) {
  // ── Form list ──────────────────────────────────────────────────────────────
  const [forms, setForms] = useState<FormOption[]>([])
  const [loadingForms, setLoadingForms] = useState(true)
  const [formId, setFormId] = useState('')

  // ── Umoor filter ───────────────────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState('')

  // ── Location filters ───────────────────────────────────────────────────────
  const [sectorId, setSectorId] = useState('')
  const [subsectorId, setSubsectorId] = useState('')
  const [subsectors, setSubsectors] = useState<Subsector[]>([])
  const [loadingSubsectors, setLoadingSubsectors] = useState(false)

  // ── Demographic filters ────────────────────────────────────────────────────
  const [gender, setGender] = useState('')
  const [ageFrom, setAgeFrom] = useState('')
  const [ageTo, setAgeTo] = useState('')

  // ── Respondent detail sheet ────────────────────────────────────────────────
  const [detailItsNo, setDetailItsNo] = useState<number | null>(null)

  // ── Report data ────────────────────────────────────────────────────────────
  const [data, setData] = useState<FormReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // ── Column selector ────────────────────────────────────────────────────────
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<number>>(new Set())
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false)

  // ── AND/OR filter builder ──────────────────────────────────────────────────
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND')
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])

  // ── Export ─────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // ── Load form list on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/reports/forms')
      .then((r) => r.json())
      .then((d) => setForms(d.forms ?? []))
      .catch(() => {})
      .finally(() => setLoadingForms(false))
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
    if (!formId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ form_id: formId })
      if (sectorId) params.set('sector_id', sectorId)
      if (subsectorId) params.set('subsector_id', subsectorId)
      if (gender) params.set('gender', gender)
      if (ageFrom) params.set('age_from', ageFrom)
      if (ageTo) params.set('age_to', ageTo)

      const res = await fetch(`/api/reports/forms?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? 'Failed to load report')
      }
      const json: FormReportData = await res.json()
      setData(json)
      setHasFetched(true)
      setDetailItsNo(null)
      setSelectedFieldIds(new Set(json.questions.map((q) => q.field_id)))
      setFilterRules([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [formId, sectorId, subsectorId, gender, ageFrom, ageTo])

  // ── Forms visible in the picker (umoor filter) ─────────────────────────────
  const visibleForms = useMemo(() => {
    if (!categoryId) return forms
    const cid = Number(categoryId)
    return forms.filter((f) => f.umoor_category_id === cid)
  }, [forms, categoryId])

  // ── Filtered respondents ───────────────────────────────────────────────────
  const filteredRespondents = useMemo(() => {
    if (!data) return []
    return applyFilters(data.respondents, data.answers, filterLogic, filterRules)
  }, [data, filterLogic, filterRules])

  // ── Visible columns ────────────────────────────────────────────────────────
  const visibleColumns = useMemo(() => {
    if (!data) return []
    return data.questions.filter((q) => selectedFieldIds.has(q.field_id))
  }, [data, selectedFieldIds])

  // ── Pivot rows ─────────────────────────────────────────────────────────────
  const pivotRows = useMemo(() => {
    if (!data) return []
    return buildPivotRows(filteredRespondents, data.answers, data.questions, selectedFieldIds)
  }, [data, filteredRespondents, selectedFieldIds])

  // ── Respondent lookup (demographic columns + detail sheet) ─────────────────
  const respondentMap = useMemo(() => {
    const map = new Map<number, Respondent>()
    for (const r of data?.respondents ?? []) map.set(r.its_no, r)
    return map
  }, [data])

  const detailRespondent = detailItsNo !== null ? respondentMap.get(detailItsNo) ?? null : null

  // ── Chart data (SuperAdmin) ────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data || role !== 'SuperAdmin') return []
    const firstCol = visibleColumns[0]
    if (!firstCol) return []
    const counts: Record<string, number> = {}
    for (const r of data.respondents) {
      const val = data.answers[r.its_no]?.[firstCol.field_id]
      if (!val) continue
      counts[val] = (counts[val] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [data, role, visibleColumns])

  // ── Column selector helpers ────────────────────────────────────────────────
  function toggleField(fid: number) {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev)
      if (next.has(fid)) next.delete(fid)
      else next.add(fid)
      return next
    })
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!data || !pivotRows.length || !formId) return
    setExporting(true)
    setExportSuccess(false)
    try {
      const itsNos = pivotRows.map((r) => r.its_no).join(',')
      const colList = ['its_no', 'name', ...visibleColumns.map((q) => q.caption)]
      const params = new URLSearchParams({
        form_id: formId,
        its_nos: itsNos,
        columns: colList.join(','),
      })
      // Mirror the on-screen filters so the server-side export matches exactly
      if (sectorId) params.set('sector_id', sectorId)
      if (subsectorId) params.set('subsector_id', subsectorId)
      if (gender) params.set('gender', gender)
      if (ageFrom) params.set('age_from', ageFrom)
      if (ageTo) params.set('age_to', ageTo)
      const res = await fetch(`/api/reports/forms/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form-report-${new Date().toISOString().split('T')[0]}.xlsx`
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

  const hasActiveFilters = filterRules.some(
    (r) => r.field_id && (['is_empty', 'is_not_empty'].includes(r.operator) || r.value.trim() !== ''),
  )

  // UmoorCoordinator is geo-unrestricted → sector/subsector filters are still useful to them.
  const showSectorFilter = role === 'SuperAdmin' || role === 'Admin' || role === 'UmoorCoordinator'
  const showSubsectorFilter =
    (role === 'SuperAdmin' || role === 'Admin' || role === 'Masool' || role === 'UmoorCoordinator') && !!sectorId

  function handleCategoryChange(next: string) {
    setCategoryId(next)
    if (!next || !formId) return
    const current = forms.find((f) => f.id === formId)
    if (current && current.umoor_category_id !== Number(next)) {
      setFormId('')
      setData(null)
      setHasFetched(false)
      setFilterRules([])
      setDetailItsNo(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Filters card ──────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filters
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <FilterSelect label="Umoor" value={categoryId} onChange={handleCategoryChange}>
            <option value="">All Umoors</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>

          {/* Form picker */}
          <div className="space-y-1.5 col-span-2 md:col-span-1 lg:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Form
            </label>
            <div className="relative">
              <select
                value={formId}
                disabled={loadingForms}
                onChange={(e) => {
                  setFormId(e.target.value)
                  setData(null)
                  setHasFetched(false)
                  setFilterRules([])
                  setDetailItsNo(null)
                }}
                className="w-full appearance-none px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-8 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingForms
                    ? 'Loading forms…'
                    : visibleForms.length
                      ? 'Select a form'
                      : 'No forms in this umoor'}
                </option>
                {visibleForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                    {f.response_count > 0
                      ? ` (${f.response_count} response${f.response_count !== 1 ? 's' : ''})`
                      : ' (no responses)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {showSectorFilter && (
            <FilterSelect label="Sector" value={sectorId} onChange={setSectorId}>
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.sector_id} value={s.sector_id}>
                  {s.sector_name}
                </option>
              ))}
            </FilterSelect>
          )}

          {showSubsectorFilter && (
            <FilterSelect label="Subsector" value={subsectorId} onChange={setSubsectorId}>
              <option value="">{loadingSubsectors ? 'Loading…' : 'All Subsectors'}</option>
              {subsectors.map((s) => (
                <option key={s.subsector_id} value={s.subsector_id}>
                  {s.subsector_name}
                </option>
              ))}
            </FilterSelect>
          )}

          <FilterSelect label="Gender" value={gender} onChange={setGender}>
            <option value="">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </FilterSelect>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Age range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={ageFrom}
                onChange={(e) => setAgeFrom(e.target.value)}
                placeholder="Min"
                aria-label="Minimum age"
                className="w-full min-w-0 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              />
              <span className="text-xs text-muted-foreground flex-shrink-0">to</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={ageTo}
                onChange={(e) => setAgeTo(e.target.value)}
                placeholder="Max"
                aria-label="Maximum age"
                className="w-full min-w-0 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>

        {/* AND/OR filter builder — appears after data is loaded */}
        {hasFetched && data && data.questions.length > 0 && (
          <FilterBuilder
            questions={data.questions}
            logic={filterLogic}
            onLogicChange={setFilterLogic}
            rules={filterRules}
            onRulesChange={setFilterRules}
          />
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <button
            onClick={fetchData}
            disabled={loading || !formId}
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
              {hasActiveFilters ? (
                <>
                  {filteredRespondents.length} of {data.respondents.length} respondent
                  {data.respondents.length !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  {data.respondents.length} respondent{data.respondents.length !== 1 ? 's' : ''}
                </>
              )}
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => setFilterRules([])}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── SuperAdmin Charts ──────────────────────────────────────────────── */}
      {role === 'SuperAdmin' && hasFetched && data && chartData.length > 0 && visibleColumns[0] && (
        <ReportsDistributionCharts
          chartData={chartData}
          columnCaption={visibleColumns[0].caption}
        />
      )}

      {/* ── Table section ─────────────────────────────────────────────────── */}
      {hasFetched && data && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              {/* Column selector */}
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
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${columnSelectorOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {columnSelectorOpen && (
                  <div className="absolute left-0 top-full mt-1 z-20 w-64 max-h-72 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-popover">
                      <button
                        onClick={() =>
                          setSelectedFieldIds(new Set(data.questions.map((q) => q.field_id)))
                        }
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        onClick={() => setSelectedFieldIds(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Deselect All
                      </button>
                    </div>
                    <div className="px-3 py-2">
                      {data.questions.map((q) => (
                        <label
                          key={q.field_id}
                          className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary transition-colors"
                        >
                          {selectedFieldIds.has(q.field_id) ? (
                            <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-xs text-foreground">{q.caption}</span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selectedFieldIds.has(q.field_id)}
                            onChange={() => toggleField(q.field_id)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                {pivotRows.length} row{pivotRows.length !== 1 ? 's' : ''}
                {pivotRows.length > 0 && (
                  <span className="hidden sm:inline"> · click a row for full answers</span>
                )}
              </span>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || !pivotRows.length}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {exportSuccess && (
            <div className="px-5 py-2 bg-green-50 border-b border-green-200 text-green-700 text-xs font-medium">
              CSV exported successfully.
            </div>
          )}

          {pivotRows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'No respondents match the current filters.'
                : data.respondents.length === 0
                  ? 'No responses submitted for this form yet.'
                  : 'Select at least one column to display.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className={`sticky left-0 z-10 bg-muted/50 ${TH} ${STICKY_COL}`}>
                      Member
                    </th>
                    <th className={TH}>
                      Gender
                    </th>
                    <th className={TH}>
                      Age
                    </th>
                    {visibleColumns.map((q) => (
                      <th key={q.field_id} className={TH}>
                        {q.caption}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pivotRows.map((row) => {
                    const itsNo = row.its_no as number
                    const respondent = respondentMap.get(itsNo)
                    return (
                      <tr
                        key={itsNo}
                        tabIndex={0}
                        onClick={() => setDetailItsNo(itsNo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDetailItsNo(itsNo)
                          }
                        }}
                        aria-label={`View all answers from ${row.name}`}
                        className="cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:outline-none transition-colors"
                      >
                        <td className={`sticky left-0 z-10 bg-card px-4 py-2.5 ${STICKY_COL}`}>
                          <MemberIdentity name={String(row.name ?? '')} itsNo={itsNo} size="sm" />
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
                          {respondent?.gender ? <GenderPill gender={respondent.gender} size="sm" /> : null}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
                          {respondent?.age ?? ''}
                        </td>
                        {visibleColumns.map((q) => (
                          <td
                            key={q.field_id}
                            className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap"
                          >
                            {String(row[q.caption] ?? '')}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!hasFetched && !loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-16 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No report loaded yet</p>
          <p className="text-xs text-muted-foreground">
            {formId
              ? 'Click Load Report to fetch form responses.'
              : 'Select a form and click Load Report to begin.'}
          </p>
        </div>
      )}

      {/* ── Respondent detail sheet ────────────────────────────────────────── */}
      <RespondentDetailSheet
        respondent={detailRespondent}
        questions={data?.questions ?? []}
        answers={detailItsNo !== null ? data?.answers[detailItsNo] ?? {} : {}}
        onClose={() => setDetailItsNo(null)}
      />
    </div>
  )
}
