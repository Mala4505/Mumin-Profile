'use client'

import * as React from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'
import {
  BarChart2, FileText, TrendingUp, Search, ChevronDown, ChevronUp,
  Layers, Activity,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AnalyticsForm } from '@/app/api/analytics/forms/route'
import type {
  FormFieldMeta, AnswerDist, SectorBreakdown, TextEntry, FormAnswersResponse,
} from '@/app/api/analytics/form-answers/route'
import type { EventTrendResponse } from '@/app/api/analytics/event-trend/route'

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

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

// Pie chart for answer distribution
function DistributionPie({ data }: { data: AnswerDist[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
        Answer Distribution
        <span className="ml-auto text-xs text-muted-foreground font-normal">{total} total</span>
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="answer"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={85}
            paddingAngle={2}
            label={({ percent }: { percent?: number }) =>
              (percent ?? 0) > 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : ''
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((v: any) => [`${v} (${pct(Number(v), total)}%)`, 'Responses']) as any}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Stacked bar chart by sector
function SectorBarChart({
  data,
  answers,
  groupBy,
}: {
  data: SectorBreakdown[]
  answers: string[]
  groupBy: 'sector' | 'subsector'
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block" />
        By {groupBy === 'sector' ? 'Sector' : 'Subsector'}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: data.length > 6 ? 50 : 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={data.length > 5 ? -35 : 0}
            textAnchor={data.length > 5 ? 'end' : 'middle'}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          {answers.map((ans, i) => (
            <Bar
              key={ans}
              dataKey={ans}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
              radius={i === answers.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Text entries table
function TextEntriesTable({ entries }: { entries: TextEntry[] }) {
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(0)
  const PAGE_SIZE = 10

  const filtered = React.useMemo(
    () =>
      entries.filter(
        e =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.answer.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">Text Responses</span>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entries</span>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-7 h-7 text-xs"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No entries found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-28">ITS No</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Answer</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-28 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{e.its_no}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.name}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-xs">{e.answer}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {fmtDate(e.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {pageCount}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Event trend line chart
function EventTrendChart({
  trendData,
  fieldCaption,
}: {
  trendData: EventTrendResponse
  fieldCaption: string
}) {
  if (!trendData.trend || trendData.trend.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
        No trend data available for this event.
      </div>
    )
  }

  // Collect all unique answer keys across all trend points
  const allAnswers = [...new Set(trendData.trend.flatMap(p => Object.keys(p.answers)))]

  // Format for recharts — use label as x-axis
  const chartData = trendData.trend.map(p => ({
    name: p.label,
    total: p.total,
    ...p.answers,
  }))

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          Trend: {trendData.event?.title ?? 'Event'} — {fieldCaption}
        </h3>
        {trendData.event?.event_date && (
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(trendData.event.event_date)}</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={chartData.length > 5 ? -30 : 0}
            textAnchor={chartData.length > 5 ? 'end' : 'middle'}
            height={chartData.length > 5 ? 50 : 24}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          {allAnswers.map((ans, i) => (
            <Line
              key={ans}
              type="monotone"
              dataKey={ans}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 4, fill: PALETTE[i % PALETTE.length] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FormAnalyticsSection() {
  const [forms, setForms] = React.useState<AnalyticsForm[]>([])
  const [formsLoading, setFormsLoading] = React.useState(true)

  const [selectedFormId, setSelectedFormId] = React.useState<string>('')
  const [fields, setFields] = React.useState<FormFieldMeta[]>([])
  const [selectedFieldId, setSelectedFieldId] = React.useState<number | null>(null)

  const [groupBy, setGroupBy] = React.useState<'sector' | 'subsector'>('sector')
  const [answersData, setAnswersData] = React.useState<FormAnswersResponse | null>(null)
  const [answersLoading, setAnswersLoading] = React.useState(false)

  const [showTrend, setShowTrend] = React.useState(false)
  const [trendData, setTrendData] = React.useState<EventTrendResponse | null>(null)
  const [trendLoading, setTrendLoading] = React.useState(false)

  // Load forms on mount
  React.useEffect(() => {
    fetch('/api/analytics/forms')
      .then(r => r.json())
      .then((data: AnalyticsForm[]) => {
        setForms(data)
        if (data.length > 0) setSelectedFormId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setFormsLoading(false))
  }, [])

  // Load fields when form changes
  React.useEffect(() => {
    if (!selectedFormId) return
    setFields([])
    setSelectedFieldId(null)
    setAnswersData(null)
    setShowTrend(false)
    setTrendData(null)

    fetch(`/api/analytics/form-answers?form_id=${selectedFormId}`)
      .then(r => r.json())
      .then((data: FormAnswersResponse) => {
        setFields(data.fields ?? [])
        if (data.fields && data.fields.length > 0) {
          setSelectedFieldId(data.fields[0].id)
        }
      })
      .catch(() => {})
  }, [selectedFormId])

  // Load answers when field or groupBy changes
  React.useEffect(() => {
    if (!selectedFormId || !selectedFieldId) return
    setAnswersLoading(true)
    setAnswersData(null)

    fetch(
      `/api/analytics/form-answers?form_id=${selectedFormId}&field_id=${selectedFieldId}&group_by=${groupBy}`
    )
      .then(r => r.json())
      .then((data: FormAnswersResponse) => setAnswersData(data))
      .catch(() => {})
      .finally(() => setAnswersLoading(false))
  }, [selectedFormId, selectedFieldId, groupBy])

  // Load trend when requested
  React.useEffect(() => {
    if (!showTrend || !selectedFieldId) return
    const form = forms.find(f => f.id === selectedFormId)
    if (!form?.event_id) return

    setTrendLoading(true)
    setTrendData(null)
    fetch(`/api/analytics/event-trend?event_id=${form.event_id}&field_id=${selectedFieldId}`)
      .then(r => r.json())
      .then((data: EventTrendResponse) => setTrendData(data))
      .catch(() => {})
      .finally(() => setTrendLoading(false))
  }, [showTrend, selectedFormId, selectedFieldId, forms])

  const selectedForm = forms.find(f => f.id === selectedFormId)
  const selectedField = fields.find(f => f.id === selectedFieldId)
  const isTextType = selectedField?.field_type === 'text'
  const hasEvent = !!selectedForm?.event_id
  const uniqueAnswers = answersData
    ? [...new Set(answersData.distribution.map(d => d.answer))]
    : []

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart2}
        title="Form Analytics"
        sub="Drill into answers for any published form across sectors and over time"
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
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.caption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedField && !isTextType && (
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
        </div>
      )}

      {/* Charts / Table */}
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
          {isTextType ? (
            <TextEntriesTable entries={answersData.textEntries} />
          ) : answersData.distribution.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
              No responses recorded for this field yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionPie data={answersData.distribution} />
              {answersData.bySector.length > 0 ? (
                <SectorBarChart
                  data={answersData.bySector}
                  answers={uniqueAnswers}
                  groupBy={groupBy}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center text-sm text-muted-foreground">
                  No sector data available.
                </div>
              )}
            </div>
          )}

          {/* Event Trend toggle */}
          {hasEvent && !isTextType && (
            <div>
              <button
                onClick={() => setShowTrend(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                {showTrend ? 'Hide' : 'View'} Event Trend
                {showTrend ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTrend && (
                <div className="mt-4">
                  {trendLoading ? (
                    <div className="bg-card border border-border rounded-xl p-5 h-64 animate-pulse">
                      <div className="h-4 bg-muted rounded w-56 mb-4" />
                      <div className="h-48 bg-muted rounded" />
                    </div>
                  ) : trendData ? (
                    <EventTrendChart
                      trendData={trendData}
                      fieldCaption={selectedField.caption}
                    />
                  ) : null}
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
    </div>
  )
}
