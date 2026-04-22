'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Download, Map } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { AnalyticsForm } from '@/app/api/analytics/forms/route'
import type { SectorCompletion, SubsectorCompletion } from '@/app/api/analytics/sector-completion/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctColor(pct: number): string {
  if (pct >= 80) return '#10B981'
  if (pct >= 60) return '#F59E0B'
  if (pct >= 40) return '#F97316'
  return '#EF4444'
}

function pctBg(pct: number): string {
  if (pct >= 80) return 'rgba(16,185,129,0.1)'
  if (pct >= 60) return 'rgba(245,158,11,0.1)'
  if (pct >= 40) return 'rgba(249,115,22,0.1)'
  return 'rgba(239,68,68,0.08)'
}

function PctBar({ value }: { value: number }) {
  const color = pctColor(value)
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-9 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  )
}

function SubsectorRow({ sub }: { sub: SubsectorCompletion }) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
      <td className="pl-10 pr-4 py-2.5">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 inline-block" />
          {sub.name}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{sub.responded}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{sub.total}</td>
      <td className="px-4 py-2.5">
        <PctBar value={sub.pct} />
      </td>
    </tr>
  )
}

function SectorRow({ sector }: { sector: SectorCompletion }) {
  const [expanded, setExpanded] = React.useState(false)
  const color = pctColor(sector.pct)
  const bg = pctBg(sector.pct)

  return (
    <>
      <tr
        className="border-b border-border cursor-pointer hover:bg-muted/20 transition-colors"
        style={{ backgroundColor: bg }}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="text-sm font-semibold text-foreground">{sector.name}</span>
            {sector.subsectors.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {sector.subsectors.length} subsector{sector.subsectors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-medium tabular-nums" style={{ color }}>
          {sector.responded}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{sector.total}</td>
        <td className="px-4 py-3">
          <PctBar value={sector.pct} />
        </td>
      </tr>
      {expanded &&
        sector.subsectors.map(sub => (
          <SubsectorRow key={sub.subsector_id} sub={sub} />
        ))}
    </>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(data: SectorCompletion[], formTitle: string) {
  const rows: string[] = [
    ['Sector', 'Subsector', 'Responded', 'Total', 'Completion %'].join(','),
  ]
  for (const s of data) {
    rows.push([`"${s.name}"`, '', s.responded, s.total, s.pct].join(','))
    for (const sub of s.subsectors) {
      rows.push([`"${s.name}"`, `"${sub.name}"`, sub.responded, sub.total, sub.pct].join(','))
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${formTitle.replace(/\s+/g, '_')}_sector_completion.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SectorPerformanceSection() {
  const [forms, setForms] = React.useState<AnalyticsForm[]>([])
  const [formsLoading, setFormsLoading] = React.useState(true)
  const [selectedFormId, setSelectedFormId] = React.useState<string>('')

  const [sectorData, setSectorData] = React.useState<SectorCompletion[]>([])
  const [dataLoading, setDataLoading] = React.useState(false)

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

  React.useEffect(() => {
    if (!selectedFormId) return
    setDataLoading(true)
    setSectorData([])

    fetch(`/api/analytics/sector-completion?form_id=${selectedFormId}`)
      .then(r => r.json())
      .then((data: SectorCompletion[]) => setSectorData(data))
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [selectedFormId])

  const selectedForm = forms.find(f => f.id === selectedFormId)

  // Summary stats
  const totalResponded = sectorData.reduce((s, d) => s + d.responded, 0)
  const totalMembers = sectorData.reduce((s, d) => s + d.total, 0)
  const overallPct = totalMembers > 0 ? Math.round((totalResponded / totalMembers) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Map className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground leading-tight">Sector Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completion heatmap by sector · click a row to expand subsectors
          </p>
        </div>
      </div>

      {/* Form selector + export */}
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
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {sectorData.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => exportCSV(sectorData, selectedForm?.title ?? 'form')}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Summary stat strip */}
      {!dataLoading && sectorData.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Responses', value: totalResponded.toLocaleString() },
            { label: 'Total Members', value: totalMembers.toLocaleString() },
            {
              label: 'Overall Completion',
              value: `${overallPct}%`,
              color: pctColor(overallPct),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {stat.label}
              </p>
              <p
                className="text-2xl font-bold tabular-nums"
                style={stat.color ? { color: stat.color } : undefined}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {dataLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="px-4 py-3.5 border-b border-border last:border-0 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-3.5 bg-muted rounded w-32" />
                <div className="h-3.5 bg-muted rounded w-10 ml-auto" />
                <div className="h-1.5 bg-muted rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : sectorData.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {selectedFormId
            ? 'No response data found for this form.'
            : 'Select a form to view sector completion.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sector / Subsector
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-28">
                    Responded
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                    Completion
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectorData.map(sector => (
                  <SectorRow key={sector.sector_id} sector={sector} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-4 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Legend:
            </span>
            {[
              { label: '≥ 80%', color: '#10B981' },
              { label: '60–79%', color: '#F59E0B' },
              { label: '40–59%', color: '#F97316' },
              { label: '< 40%', color: '#EF4444' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
