'use client'

import * as React from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  BarChart2, Search, Layers,
  ChevronDown, Plus, X, Filter, Columns3, Download, Loader2,
  CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AnalyticsForm } from '@/app/api/analytics/forms/route'
import type {
  FormFieldMeta, AnswerDist, SectorBreakdown, FormAnswersResponse,
} from '@/app/api/analytics/forms/[id]/route'

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportRespondent {
  its_no: number
  name: string
  submitted_at: string
}

interface ReportData {
  questions: Array<{ field_id: number; caption: string; field_type: string; sort_order: number }>
  respondents: ReportRespondent[]
  answers: Record<number, Record<number, string>>
}

type FilterOperator = 'eq' | 'contains' | 'starts_with' | 'is_empty' | 'is_not_empty'

interface FilterRule {
  id: string
  field_id: number
  operator: FilterOperator
  value: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
    return ALL_OPERATORS.filter(op => op.value === 'contains' || op.value.startsWith('is_'))
  return ALL_OPERATORS.filter(op => op.value === 'eq' || op.value.startsWith('is_'))
}

function applyFilters(
  respondents: ReportRespondent[],
  answers: Record<number, Record<number, string>>,
  logic: 'AND' | 'OR',
  rules: FilterRule[],
): ReportRespondent[] {
  const active = rules.filter(
    r => r.field_id && (['is_empty', 'is_not_empty'].includes(r.operator) || r.value.trim() !== ''),
  )
  if (!active.length) return respondents
  return respondents.filter(r => {
    const check = (rule: FilterRule): boolean => {
      const val = answers[r.its_no]?.[rule.field_id] ?? ''
      switch (rule.operator) {
        case 'eq': return val.toLowerCase() === rule.value.toLowerCase()
        case 'contains': return val.toLowerCase().includes(rule.value.toLowerCase())
        case 'starts_with': return val.toLowerCase().startsWith(rule.value.toLowerCase())
        case 'is_empty': return !val
        case 'is_not_empty': return !!val
      }
    }
    return logic === 'AND' ? active.every(check) : active.some(check)
  })
}

function buildPivotRows(
  respondents: ReportRespondent[],
  answers: Record<number, Record<number, string>>,
  questions: ReportData['questions'],
  selectedFieldIds: Set<number>,
): Array<Record<string, string | number>> {
  return respondents.map(r => {
    const row: Record<string, string | number> = { its_no: r.its_no, name: r.name }
    for (const q of questions) {
      if (selectedFieldIds.has(q.field_id)) {
        row[q.caption] = answers[r.its_no]?.[q.field_id] ?? ''
      }
    }
    return row
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FieldTypeBadge({ type, behavior }: { type: string; behavior: string }) {
  const isHistorical = behavior === 'historical'
  return (
    <Badge
      className={`text-[10px] px-1.5 py-0 font-medium border ${
        isHistorical
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
      }`}
    >
      {isHistorical ? 'Event' : 'Profile'} · {type}
    </Badge>
  )
}

function DistributionPie({
  data,
  selectedAnswer,
  onSliceClick,
}: {
  data: AnswerDist[]
  selectedAnswer?: string | null
  onSliceClick?: (answer: string) => void
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
        Answer Distribution
        {onSliceClick && (
          <span className="text-xs text-muted-foreground font-normal ml-1">· click a slice to filter</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground font-normal">{total} total</span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="answer"
            cx="50%"
            cy="46%"
            innerRadius={70}
            outerRadius={105}
            paddingAngle={2}
            // only label slices that are large enough to read
            label={({ percent, answer }: { percent?: number; answer?: string }) => {
              if ((percent ?? 0) < 0.12) return ''
              const label = answer ?? ''
              return label.length > 12 ? label.slice(0, 11) + '…' : label
            }}
            labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={onSliceClick ? ((data: any) => onSliceClick(data.answer)) : undefined}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={PALETTE[i % PALETTE.length]}
                opacity={selectedAnswer && selectedAnswer !== d.answer ? 0.35 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', padding: '8px 12px' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, _name: any, props: any) => [
              `${value} (${pct(Number(value), total)}%)`,
              props.payload?.answer ?? _name,
            ]) as any}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 12, lineHeight: '22px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function SectorBarChart({
  data,
  answers,
  groupBy,
  selectedSector,
  onSegmentClick,
}: {
  data: SectorBreakdown[]
  answers: string[]
  groupBy: 'sector' | 'subsector'
  selectedSector?: string | null
  onSegmentClick?: (sector: string, answer: string) => void
}) {
  const bottomMargin = data.length > 6 ? 64 : data.length > 3 ? 40 : 20
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block" />
        By {groupBy === 'sector' ? 'Sector' : 'Subsector'}
        {onSegmentClick && (
          <span className="text-xs text-muted-foreground font-normal ml-1">· click a bar to filter</span>
        )}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: bottomMargin }}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={data.length > 4 ? -35 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', padding: '8px 12px' }}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 16, lineHeight: '22px' }}
          />
          {answers.map((ans, i) => (
            <Bar
              key={ans}
              dataKey={ans}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
              radius={i === answers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={48}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={onSegmentClick ? (barData: any) => onSegmentClick(barData.name, ans) : undefined}
            >
              {data.map((entry, j) => (
                <Cell
                  key={j}
                  fill={PALETTE[i % PALETTE.length]}
                  opacity={selectedSector && selectedSector !== entry.name ? 0.35 : 1}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
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
  questions: ReportData['questions']
  logic: 'AND' | 'OR'
  onLogicChange: (l: 'AND' | 'OR') => void
  rules: FilterRule[]
  onRulesChange: (r: FilterRule[]) => void
}) {
  const selectClass =
    'appearance-none px-2.5 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-7'

  function addRule() {
    const first = questions[0]
    if (!first) return
    const ops = getOperators(first.field_type)
    onRulesChange([...rules, { id: crypto.randomUUID(), field_id: first.field_id, operator: ops[0].value, value: '' }])
  }

  function removeRule(id: string) {
    onRulesChange(rules.filter(r => r.id !== id))
  }

  function updateRule(id: string, patch: Partial<FilterRule>) {
    onRulesChange(
      rules.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, ...patch }
        if (patch.field_id !== undefined) {
          const q = questions.find(q => q.field_id === patch.field_id)
          updated.operator = getOperators(q?.field_type ?? 'text')[0].value
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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter Responses</span>
        {rules.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Match</span>
            <button
              onClick={() => onLogicChange('AND')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${logic === 'AND' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/40'}`}
            >ALL</button>
            <button
              onClick={() => onLogicChange('OR')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${logic === 'OR' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/40'}`}
            >ANY</button>
            <span>of these rules</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {rules.map(rule => {
          const q = questions.find(q => q.field_id === rule.field_id)
          const ops = getOperators(q?.field_type ?? 'text')
          return (
            <div key={rule.id} className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={rule.field_id}
                  onChange={e => updateRule(rule.id, { field_id: Number(e.target.value) })}
                  className={`${selectClass} max-w-[200px]`}
                >
                  {questions.map(q => (
                    <option key={q.field_id} value={q.field_id}>{q.caption}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={rule.operator}
                  onChange={e => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                  className={selectClass}
                >
                  {ops.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
              {showValue(rule.operator) && (
                <input
                  type="text"
                  value={rule.value}
                  onChange={e => updateRule(rule.id, { value: e.target.value })}
                  placeholder="Value…"
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50 w-40"
                />
              )}
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

// ── Main Component ────────────────────────────────────────────────────────────

export function FormAnalyticsSection() {
  // ── Analytics state ────────────────────────────────────────────────────────
  const [forms, setForms] = React.useState<AnalyticsForm[]>([])
  const [formsLoading, setFormsLoading] = React.useState(true)
  const [selectedFormId, setSelectedFormId] = React.useState<string>('')
  const [fields, setFields] = React.useState<FormFieldMeta[]>([])
  const [selectedFieldId, setSelectedFieldId] = React.useState<number | null>(null)
  const [groupBy, setGroupBy] = React.useState<'sector' | 'subsector'>('sector')
  const [answersData, setAnswersData] = React.useState<FormAnswersResponse | null>(null)
  const [answersLoading, setAnswersLoading] = React.useState(false)
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null)
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null)

  // ── Report state (filter + export) ────────────────────────────────────────
  const [reportData, setReportData] = React.useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = React.useState(false)
  const [filterLogic, setFilterLogic] = React.useState<'AND' | 'OR'>('AND')
  const [filterRules, setFilterRules] = React.useState<FilterRule[]>([])
  const [selectedFieldIds, setSelectedFieldIds] = React.useState<Set<number>>(new Set())
  const [columnSelectorOpen, setColumnSelectorOpen] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [exportSuccess, setExportSuccess] = React.useState(false)
  const [tableSearch, setTableSearch] = React.useState('')
  const [tablePage, setTablePage] = React.useState(0)
  const [sortCol, setSortCol] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

  // ── Load forms on mount ────────────────────────────────────────────────────
  React.useEffect(() => {
    fetch('/api/analytics/forms')
      .then(r => r.json())
      .then((data: AnalyticsForm[]) => {
        const list = Array.isArray(data) ? data : []
        setForms(list)
        if (list.length > 0) setSelectedFormId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setFormsLoading(false))
  }, [])

  // ── Load fields when form changes ──────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedFormId) return
    setFields([])
    setSelectedFieldId(null)
    setAnswersData(null)

    fetch(`/api/analytics/forms/${selectedFormId}?section=answers`)
      .then(r => r.json())
      .then((data: FormAnswersResponse) => {
        const list = data.fields ?? []
        setFields(list)
        // prefer first chartable (non-text) field so charts appear by default
        const first = list.find(f => f.field_type !== 'text') ?? list[0]
        if (first) setSelectedFieldId(first.id)
      })
      .catch(() => {})
  }, [selectedFormId])

  // ── Load report data (all fields) when form changes ────────────────────────
  React.useEffect(() => {
    if (!selectedFormId) { setReportData(null); return }
    setReportData(null)
    setReportLoading(true)
    setFilterRules([])
    setSelectedAnswer(null)
    setSelectedSector(null)
    setTableSearch('')
    setTablePage(0)
    setSortCol(null)
    setSortDir('asc')

    fetch(`/api/reports/forms?form_id=${selectedFormId}`)
      .then(r => { if (!r.ok) throw new Error('Report fetch failed'); return r.json() })
      .then((d: ReportData) => {
        if (Array.isArray(d?.questions)) {
          setReportData(d)
          setSelectedFieldIds(new Set(d.questions.map(q => q.field_id)))
        }
      })
      .catch(() => {})
      .finally(() => setReportLoading(false))
  }, [selectedFormId])

  // ── Load answers when field or groupBy changes ─────────────────────────────
  // NOTE: selectedFormId intentionally excluded from deps — it always changes
  // before selectedFieldId (which gets nulled by the load-fields effect), so
  // including it would fire this effect with a stale field_id from the previous form.
  React.useEffect(() => {
    if (!selectedFieldId || !selectedFormId) return
    setAnswersLoading(true)
    setAnswersData(null)

    fetch(`/api/analytics/forms/${selectedFormId}?section=answers&field_id=${selectedFieldId}&group_by=${groupBy}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: FormAnswersResponse) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (Array.isArray((data as any).distribution)) setAnswersData(data)
      })
      .catch(() => {})
      .finally(() => setAnswersLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId, groupBy])

  // ── Reset chart filters when field changes ─────────────────────────────────
  React.useEffect(() => {
    setSelectedAnswer(null)
    setSelectedSector(null)
  }, [selectedFieldId])

  // ── Computed: filtered respondents + pivot rows ────────────────────────────
  const filteredRespondents = React.useMemo(() => {
    if (!reportData) return []
    const byFilter = applyFilters(reportData.respondents, reportData.answers, filterLogic, filterRules)
    // If chart answer selected, further narrow by that answer on the selected field
    if (selectedAnswer && selectedFieldId) {
      return byFilter.filter(r => {
        const val = reportData.answers[r.its_no]?.[selectedFieldId] ?? ''
        return val === selectedAnswer
      })
    }
    return byFilter
  }, [reportData, filterLogic, filterRules, selectedAnswer, selectedFieldId])

  const visibleColumns = React.useMemo(() => {
    if (!reportData?.questions) return []
    return reportData.questions.filter(q => selectedFieldIds.has(q.field_id))
  }, [reportData, selectedFieldIds])

  const searchedRespondents = React.useMemo(() => {
    if (!tableSearch.trim()) return filteredRespondents
    const q = tableSearch.toLowerCase()
    return filteredRespondents.filter(
      r => String(r.its_no).includes(q) || r.name.toLowerCase().includes(q)
    )
  }, [filteredRespondents, tableSearch])

  const pivotRows = React.useMemo(() => {
    if (!reportData) return []
    return buildPivotRows(searchedRespondents, reportData.answers, reportData.questions, selectedFieldIds)
  }, [reportData, searchedRespondents, selectedFieldIds])

  const hasActiveFilters = filterRules.some(
    r => r.field_id && (['is_empty', 'is_not_empty'].includes(r.operator) || r.value.trim() !== ''),
  )

  const sortedRows = React.useMemo(() => {
    if (!sortCol) return pivotRows
    return [...pivotRows].sort((a, b) => {
      const av = String(a[sortCol] ?? '')
      const bv = String(b[sortCol] ?? '')
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [pivotRows, sortCol, sortDir])

  const TABLE_PAGE_SIZE = 20
  const pageCount = Math.ceil(sortedRows.length / TABLE_PAGE_SIZE)
  const pagedRows = sortedRows.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE)

  // Reset to first page when any filter/search changes
  React.useEffect(() => { setTablePage(0) }, [tableSearch, filterRules, selectedAnswer, filterLogic])

  // ── Pie slice click: pre-populate / toggle filter rule ─────────────────────
  function handlePieSliceClick(answer: string) {
    if (selectedAnswer === answer) {
      setSelectedAnswer(null)
    } else {
      setSelectedAnswer(answer)
    }
  }

  function handleSectorClick(sector: string, answer: string) {
    setSelectedSector(prev => prev === sector ? null : sector)
    setSelectedAnswer(prev => prev === answer ? null : answer)
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!reportData || !pivotRows.length || !selectedFormId) return
    setExporting(true)
    setExportSuccess(false)
    try {
      const itsNos = pivotRows.map(r => r.its_no).join(',')
      const colList = ['its_no', 'name', ...visibleColumns.map(q => q.caption)]
      const params = new URLSearchParams({
        form_id: selectedFormId,
        its_nos: itsNos,
        columns: colList.join(','),
      })
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

  function toggleField(fid: number) {
    setSelectedFieldIds(prev => {
      const next = new Set(prev)
      if (next.has(fid)) next.delete(fid)
      else next.add(fid)
      return next
    })
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setTablePage(0)
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-30 shrink-0" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary shrink-0" />
      : <ArrowDown className="w-3 h-3 text-primary shrink-0" />
  }

  const selectedField = fields.find(f => f.id === selectedFieldId)
  const uniqueAnswers = answersData?.distribution
    ? [...new Set(answersData.distribution.map(d => d.answer))]
    : []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart2}
        title="Form Analytics"
        sub="Drill into answers, filter respondents, and export to Excel"
      />

      {/* Form + Field selectors */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Form
          </label>
          {formsLoading ? (
            <div className="h-9 bg-muted animate-pulse rounded-md" />
          ) : forms.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No published forms yet.</p>
          ) : (
            <Select value={selectedFormId} onValueChange={setSelectedFormId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a form…" />
              </SelectTrigger>
              <SelectContent>
                {forms.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      {f.title}
                      {f.event_title && (
                        <span className="text-[10px] text-muted-foreground">· {f.event_title}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {fields.length > 0 && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Field
            </label>
            <Select
              value={selectedFieldId?.toString() ?? ''}
              onValueChange={v => setSelectedFieldId(parseInt(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a field…" />
              </SelectTrigger>
              <SelectContent>
                {fields.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.caption}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedField && (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Group by
            </label>
            <div className="flex gap-1">
              {(['sector', 'subsector'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    groupBy === g
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Field metadata badge */}
      {selectedField && (
        <div className="flex items-center gap-2">
          <FieldTypeBadge type={selectedField.field_type} behavior={selectedField.behavior} />
          {selectedField.is_required && (
            <Badge variant="outline" className="text-[10px]">Required</Badge>
          )}
          {selectedAnswer && (
            <button
              onClick={() => setSelectedAnswer(null)}
              className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
            >
              Filtered: {selectedAnswer}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Charts */}
      {answersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-64 animate-pulse">
              <div className="h-4 bg-muted rounded w-40 mb-4" />
              <div className="h-48 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : answersData && selectedField ? (
        <>
          {answersData.distribution.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
              No responses recorded for this field yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionPie
                data={answersData.distribution}
                selectedAnswer={selectedAnswer}
                onSliceClick={handlePieSliceClick}
              />
              {answersData.bySector.length > 0 ? (
                <SectorBarChart
                  data={answersData.bySector}
                  answers={uniqueAnswers}
                  groupBy={groupBy}
                  selectedSector={selectedSector}
                  onSegmentClick={handleSectorClick}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center text-sm text-muted-foreground">
                  No sector data available.
                </div>
              )}
            </div>
          )}
        </>
      ) : selectedFormId && fields.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          This form has no questions configured.
        </div>
      ) : null}

      {/* ── Report Panel: filter builder + respondents table + export ─────── */}
      {selectedFormId && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-0">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Respondents</h3>
            {reportData && (
              <span className="text-xs text-muted-foreground ml-1">
                {hasActiveFilters || selectedAnswer
                  ? `${filteredRespondents.length} of ${reportData.respondents.length}`
                  : reportData.respondents.length}{' '}
                respondent{reportData.respondents.length !== 1 ? 's' : ''}
              </span>
            )}
            {(hasActiveFilters || selectedAnswer) && (
              <button
                onClick={() => { setFilterRules([]); setSelectedAnswer(null) }}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Filter builder */}
          {reportData && reportData.questions.length > 0 && (
            <FilterBuilder
              questions={reportData.questions}
              logic={filterLogic}
              onLogicChange={setFilterLogic}
              rules={filterRules}
              onRulesChange={setFilterRules}
            />
          )}

          {/* Table toolbar: search + column selector + export */}
          {reportData && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by ITS No or name…"
                  className="pl-8 h-8 text-xs"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                />
              </div>

              {/* Column selector + row count + export */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Column selector */}
                  <div className="relative">
                    <button
                      onClick={() => setColumnSelectorOpen(v => !v)}
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
                      <div className="absolute left-0 top-full mt-1 z-20 w-64 max-h-72 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-popover">
                          <button
                            onClick={() => setSelectedFieldIds(new Set(reportData.questions.map(q => q.field_id)))}
                            className="text-xs text-primary hover:underline"
                          >Select All</button>
                          <span className="text-muted-foreground">·</span>
                          <button
                            onClick={() => setSelectedFieldIds(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >Deselect All</button>
                        </div>
                        <div className="px-3 py-2">
                          {reportData.questions.map(q => (
                            <label key={q.field_id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary transition-colors">
                              {selectedFieldIds.has(q.field_id) ? (
                                <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="text-xs text-foreground">{q.caption}</span>
                              <input type="checkbox" className="sr-only" checked={selectedFieldIds.has(q.field_id)} onChange={() => toggleField(q.field_id)} />
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {tableSearch.trim()
                      ? `${sortedRows.length} of ${filteredRespondents.length}`
                      : sortedRows.length}{' '}
                    row{sortedRows.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exporting || !pivotRows.length}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {exporting ? 'Exporting…' : 'Export Excel'}
                </button>
              </div>
            </div>
          )}

          {/* Export success */}
          {exportSuccess && (
            <div className="mt-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg">
              Exported successfully.
            </div>
          )}

          {/* Respondents pivot table */}
          {reportLoading ? (
            <div className="mt-4 h-32 bg-muted/30 animate-pulse rounded-lg" />
          ) : reportData ? (
            pivotRows.length === 0 ? (
              <div className="mt-4 py-10 text-center text-sm text-muted-foreground">
                {hasActiveFilters || selectedAnswer
                  ? 'No respondents match the current filters.'
                  : reportData.respondents.length === 0
                    ? 'No responses submitted for this form yet.'
                    : 'Select at least one column to display.'}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th
                          className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-[112px] border-r border-border cursor-pointer select-none hover:bg-muted/70 transition-colors"
                          onClick={() => handleSort('its_no')}
                        >
                          <span className="flex items-center gap-1.5">ITS No. <SortIcon col="its_no" /></span>
                        </th>
                        <th
                          className="sticky left-[112px] z-10 bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[160px] border-r border-border cursor-pointer select-none hover:bg-muted/70 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <span className="flex items-center gap-1.5">Name <SortIcon col="name" /></span>
                        </th>
                        {visibleColumns.map(q => (
                          <th
                            key={q.field_id}
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[140px] cursor-pointer select-none hover:bg-muted/70 transition-colors"
                            onClick={() => handleSort(q.caption)}
                          >
                            <span className="flex items-center gap-1.5">{q.caption} <SortIcon col={q.caption} /></span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedRows.map(row => (
                        <tr key={row.its_no} className="hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap w-[112px] border-r border-border">{row.its_no}</td>
                          <td className="sticky left-[112px] z-10 bg-card px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap min-w-[160px] border-r border-border">{row.name}</td>
                          {visibleColumns.map(q => (
                            <td key={q.field_id} className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap min-w-[140px] max-w-[300px] truncate">
                              {String(row[q.caption] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/10">
                    <span className="text-xs text-muted-foreground">
                      {tablePage * TABLE_PAGE_SIZE + 1}–{Math.min((tablePage + 1) * TABLE_PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
                    </span>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={tablePage === 0} onClick={() => setTablePage(p => p - 1)}>Prev</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={tablePage >= pageCount - 1} onClick={() => setTablePage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
