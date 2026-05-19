﻿'use client'

import * as React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts'

import type { FormRate } from '@/app/api/analytics/forms/[id]/route'
import type { ActivityEvent } from '@/app/api/analytics/dashboard/route'
import type { Role } from '@/lib/types/app'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormAnalyticsSection } from './FormAnalyticsSection'
import { SectorPerformanceSection } from './SectorPerformanceSection'


// â"€â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface OverviewData {
  activeForms: number
  membersWithNoProfile: number
  recentImports: Array<{
    id: string
    filename?: string
    table_name?: string
    status?: string
    created_at: string
    rows_processed?: number
    rows_failed?: number
  }>
  overdueForms: number
}

type GroupBy = 'sector' | 'subsector'

interface GroupItem {
  name: string
  count: number
}

interface MemberRow {
  its_no: number
  name: string
  gender: string | null
  status: string | null
  phone: string | null
  sector_name: string | null
  subsector_name: string | null
  last_profile_update: string | null
}

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#6366F1', '#14B8A6']

// â"€â"€â"€ Widget Card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function WidgetCard({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// â"€â"€â"€ Form Response Rates â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function FormResponseRates({ rates }: { rates: FormRate[] }) {
  if (rates.length === 0) return null
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-semibold text-foreground mb-4">Form Response Rates</h2>
      <div className="space-y-3">
        {rates.map((form) => {
          const color = form.pct >= 70 ? '#10B981' : form.pct >= 40 ? '#F59E0B' : '#EF4444'
          return (
            <div key={form.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground truncate max-w-[240px]">{form.title}</span>
                <span className="text-sm font-semibold tabular-nums ml-2" style={{ color }}>
                  {form.pct}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${form.pct}%`, backgroundColor: color }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {form.responses} of {form.total} members responded
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â"€â"€â"€ Activity Feed â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function timeAgoFromEvent(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ACTIVITY_COLORS: Record<string, string> = {
  submission: '#10B981',
  import: '#3B82F6',
  profile: '#F59E0B',
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ACTIVITY_COLORS[e.type] ?? '#94a3b8' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{e.label}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                {timeAgoFromEvent(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}



// â"€â"€â"€ Main Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export function AnalyticsDashboard({ role }: { role: Role }) {
  // â"€â"€ State â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const [overview, setOverview] = React.useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = React.useState(true)

  const [groupBy, setGroupBy] = React.useState<GroupBy>('sector')
  const [groupData, setGroupData] = React.useState<GroupItem[]>([])
  const [groupLoading, setGroupLoading] = React.useState(true)

  const [profileCompletion, setProfileCompletion] = React.useState<Array<{ name: string; value: number }>>([])
  const [submissionActivity, setSubmissionActivity] = React.useState<Array<{ date: string; submissions: number }>>([])

  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null)
  const [drillMembers, setDrillMembers] = React.useState<MemberRow[]>([])
  const [drillLoading, setDrillLoading] = React.useState(false)
  const [drillSearch, setDrillSearch] = React.useState('')
  const [drillGender, setDrillGender] = React.useState<string>('__all__')
  const [drillStatus, setDrillStatus] = React.useState<string>('__all__')

  const [formRates, setFormRates] = React.useState<FormRate[]>([])
  const [activity, setActivity] = React.useState<ActivityEvent[]>([])

  const isManagement = ['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(role)
  const isSuperAdmin = role === 'SuperAdmin'

  const filteredDrillMembers = React.useMemo(() => {
    const q = drillSearch.trim().toLowerCase()
    return drillMembers.filter(m => {
      if (drillGender !== '__all__' && m.gender !== drillGender) return false
      if (drillStatus !== '__all__' && m.status !== drillStatus) return false
      if (q) {
        if (!m.name.toLowerCase().includes(q) && !String(m.its_no).includes(q) && !(m.phone ?? '').includes(q)) return false
      }
      return true
    })
  }, [drillMembers, drillSearch, drillGender, drillStatus])

  const drillGenders = React.useMemo(
    () => [...new Set(drillMembers.map(m => m.gender).filter((g): g is string => !!g))].sort(),
    [drillMembers]
  )
  const drillStatuses = React.useMemo(
    () => [...new Set(drillMembers.map(m => m.status).filter((s): s is string => !!s))].sort(),
    [drillMembers]
  )

  // â"€â"€ Fetch overview (SuperAdmin only) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  React.useEffect(() => {
    if (!isManagement) return
    fetch('/api/analytics/dashboard?type=overview')
      .then(r => r.json())
      .then(setOverview)
      .catch(() => { })
      .finally(() => setOverviewLoading(false))
  }, [isSuperAdmin])

  // â"€â"€ Fetch group data (SuperAdmin only) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  React.useEffect(() => {
    if (!isManagement) return
    setGroupLoading(true)
    setSelectedGroup(null)
    setDrillMembers([])
    setDrillSearch('')
    setDrillGender('__all__')
    setDrillStatus('__all__')

    fetch(`/api/analytics/dashboard?type=groups&groupBy=${groupBy}`)
      .then(r => r.json())
      .then((d: GroupItem[]) => setGroupData(d))
      .catch(() => setGroupData([]))
      .finally(() => setGroupLoading(false))
  }, [groupBy, isSuperAdmin])

  // â"€â"€ Fetch profile completion & submission activity (SuperAdmin only) â"€â"€â"€â"€â"€â"€â"€
  React.useEffect(() => {
    if (!isManagement) return
    fetch('/api/analytics/trends?type=profile')
      .then(r => r.json())
      .then(setProfileCompletion)
      .catch(() => { })

    fetch('/api/analytics/trends?type=form')
      .then(r => r.json())
      .then(setSubmissionActivity)
      .catch(() => { })
  }, [isSuperAdmin])

  // â"€â"€ Drill-down (SuperAdmin only) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  React.useEffect(() => {
    if (!isManagement) return
    if (!selectedGroup) { setDrillMembers([]); return }
    setDrillLoading(true)
    fetch(`/api/analytics/drill?groupBy=${groupBy}&name=${encodeURIComponent(selectedGroup)}`)
      .then(r => r.json())
      .then((d: MemberRow[]) => setDrillMembers(d))
      .catch(() => setDrillMembers([]))
      .finally(() => setDrillLoading(false))
  }, [selectedGroup, groupBy, isSuperAdmin])

  // â"€â"€ Form rates (all roles) + activity (SuperAdmin only) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  React.useEffect(() => {
    fetch('/api/analytics/forms/all?section=rates')
      .then(r => r.json())
      .then(setFormRates)
      .catch(() => { })

    if (isSuperAdmin) {
      fetch('/api/analytics/dashboard?type=activity')
        .then(r => r.json())
        .then(setActivity)
        .catch(() => { })
    }
  }, [isSuperAdmin])



  // â"€â"€ Bar click handler â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleBarClick(data: any) {
    const name = data?.activePayload?.[0]?.payload?.name
    if (name) setSelectedGroup((prev: string | null) => prev === name ? null : name)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handlePieClick(data: any) {
    if (data?.name) setSelectedGroup((prev: string | null) => prev === data.name ? null : data.name)
  }

  // â"€â"€ Non-management: degraded view (page.tsx redirects Mumin, so this shouldn't fire) â"€
  if (!isManagement) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
          </p>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Showing analytics for your assigned Mumineen</p>
        </div>
        <FormResponseRates rates={formRates} />
        <div className="border-t border-border pt-8">
          <FormAnalyticsSection />
        </div>
      </div>
    )
  }

  // â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
        </p>
        <h1 className="text-[28px] font-bold text-foreground leading-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">{isSuperAdmin ? 'System-wide analytics' : 'Analytics for your assigned Mumineen'}</p>
      </div>

      {/* â"€â"€ Widget Row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
              <div className="h-3 bg-muted rounded w-24 mb-3" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))
        ) : (
          <>
            <WidgetCard
              title="Active Forms"
              value={overview?.activeForms ?? 0}
              sub="Currently published"
            />
            <WidgetCard
              title="Members w/ No Profile"
              value={overview?.membersWithNoProfile ?? 0}
              sub="No profile data recorded"
            />
            <WidgetCard
              title="Overdue Forms"
              value={overview?.overdueForms ?? 0}
              sub="Published & past expiry"
            />
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Imports</p>
              {(overview?.recentImports ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No imports yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {(overview?.recentImports ?? []).slice(0, 3).map((imp) => (
                    <li key={imp.id} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-foreground truncate max-w-[110px]">
                        {imp.filename ?? imp.table_name ?? 'Import'}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(imp.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>


      {/* â"€â"€ Charts Section â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="space-y-6">

        {/* Grouping toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Group by:</span>
          {(['sector', 'subsector'] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                setGroupBy(g)
                setGroupLoading(true)
                setGroupData([])
                setSelectedGroup(null)
                setDrillMembers([])
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${groupBy === g
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:border-primary/50'
                }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear filter: {selectedGroup}
            </button>
          )}
        </div>


        {/* Bar chart â€" members per group */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Members by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
          </h2>
          {groupLoading ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Loadingâ€¦</div>
          ) : groupData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <BarChart
                data={groupData}
                margin={{ top: 4, right: 16, left: 0, bottom: groupData.length > 4 ? 64 : 8 }}
                onClick={handleBarClick as any}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={groupData.length > 4 ? -35 : 0}
                  textAnchor={groupData.length > 4 ? 'end' : 'middle'}
                  height={groupData.length > 4 ? 70 : 30}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar
                  dataKey="count"
                  name="Members"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {groupData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={selectedGroup === entry.name ? '#F59E0B' : '#3B82F6'}
                      opacity={selectedGroup && selectedGroup !== entry.name ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom two charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pie â€" profile completion by Umoor category */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Profile Completion by Category</h2>
            {profileCompletion.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={profileCompletion}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={handlePieClick as any}
                    style={{ cursor: 'pointer' }}
                  >
                    {profileCompletion.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: number | string) => [`${v}%`, 'Completion']) as any}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Line â€" form submission activity over time */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Form Submission Activity</h2>
            {submissionActivity.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No submissions yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={submissionActivity} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="submissions"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#F59E0B' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>



      {/* â"€â"€ Drill-down Table â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          {selectedGroup ? `Members â€" ${selectedGroup}` : 'Member Detail Table'}
        </h2>
        {!selectedGroup ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
            Click a chart segment to filter members by group.
          </div>
        ) : drillLoading ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm animate-pulse">
            Loading membersâ€¦
          </div>
        ) : drillMembers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
            No members found for this group.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Filter bar */}
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                {selectedGroup}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {drillGenders.length > 0 && (
                  <Select value={drillGender} onValueChange={setDrillGender}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Genders</SelectItem>
                      {drillGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {drillStatuses.length > 1 && (
                  <Select value={drillStatus} onValueChange={setDrillStatus}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {drillStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Name or ITSâ€¦"
                    className="pl-7 h-7 text-xs w-36"
                    value={drillSearch}
                    onChange={e => setDrillSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {filteredDrillMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No members match the current filters.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ITS No</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Mobile No</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Sector</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Subsector</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Last Profile Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrillMembers.map((m) => (
                        <tr key={m.its_no} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{m.its_no}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.phone ?? 'â€"'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.sector_name ?? 'â€"'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{m.subsector_name ?? 'â€"'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                            {m.last_profile_update ? formatDate(m.last_profile_update) : 'â€"'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  {filteredDrillMembers.length} of {drillMembers.length} member{drillMembers.length !== 1 ? 's' : ''} shown
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <FormResponseRates rates={formRates} />
      <ActivityFeed events={activity} />

      {/* Divider */}
      <div className="border-t border-border pt-8 space-y-12">

        {/* Form Analytics */}
        <FormAnalyticsSection />

        {/* Sector Performance Heatmap */}
        <SectorPerformanceSection />

      </div>

    </div>
  )
}
