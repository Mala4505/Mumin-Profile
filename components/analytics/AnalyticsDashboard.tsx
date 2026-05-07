// 'use client'

// import * as React from 'react'
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
//   PieChart, Pie, Cell,
//   LineChart, Line,
// } from 'recharts'

// import type { FormRate } from '@/app/api/analytics/form-rates/route'
// import type { ActivityEvent } from '@/app/api/analytics/activity/route'
// import type { Role } from '@/lib/types/app'
// import { Search } from 'lucide-react'
// import { Input } from '@/components/ui/input'
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from '@/components/ui/select'
// import { FormAnalyticsSection } from './FormAnalyticsSection'
// import { SectorPerformanceSection } from './SectorPerformanceSection'


// // ─── Types ────────────────────────────────────────────────────────────────────

// interface OverviewData {
//   activeForms: number
//   membersWithNoProfile: number
//   recentImports: Array<{
//     id: string
//     filename?: string
//     table_name?: string
//     status?: string
//     created_at: string
//     rows_processed?: number
//     rows_failed?: number
//   }>
//   overdueForms: number
// }

// type GroupBy = 'sector' | 'subsector'

// interface GroupItem {
//   name: string
//   count: number
// }

// interface MemberRow {
//   its_no: number
//   name: string
//   gender: string | null
//   status: string | null
//   sector_name: string | null
//   subsector_name: string | null
//   last_profile_update: string | null
// }

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// function timeAgo(dateStr: string): string {
//   const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
//   if (diff < 60) return `${diff}s ago`
//   if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
//   if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
//   return `${Math.floor(diff / 86400)}d ago`
// }

// function formatDate(d: string) {
//   return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
// }

// const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#6366F1', '#14B8A6']

// // ─── Widget Card ─────────────────────────────────────────────────────────────

// function WidgetCard({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
//   return (
//     <div className="bg-card border border-border rounded-lg p-5">
//       <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
//       <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
//       {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
//     </div>
//   )
// }

// // ─── Form Response Rates ────────────────────────────────────────────────
// function FormResponseRates({ rates }: { rates: FormRate[] }) {
//   if (rates.length === 0) return null
//   return (
//     <div className="bg-card border border-border rounded-lg p-5">
//       <h2 className="text-base font-semibold text-foreground mb-4">Form Response Rates</h2>
//       <div className="space-y-3">
//         {rates.map((form) => {
//           const color = form.pct >= 70 ? '#10B981' : form.pct >= 40 ? '#F59E0B' : '#EF4444'
//           return (
//             <div key={form.id}>
//               <div className="flex items-center justify-between mb-1">
//                 <span className="text-sm text-foreground truncate max-w-[240px]">{form.title}</span>
//                 <span className="text-sm font-semibold tabular-nums ml-2" style={{ color }}>
//                   {form.pct}%
//                 </span>
//               </div>
//               <div className="h-1.5 bg-muted rounded-full overflow-hidden">
//                 <div
//                   className="h-full rounded-full transition-all"
//                   style={{ width: `${form.pct}%`, backgroundColor: color }}
//                 />
//               </div>
//               <p className="text-[10px] text-muted-foreground mt-0.5">
//                 {form.responses} of {form.total} members responded
//               </p>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

// // ─── Activity Feed ──────────────────────────────────────────────────────
// function timeAgoFromEvent(dateStr: string): string {
//   const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
//   if (diff < 60) return `${diff}s ago`
//   if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
//   if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
//   return `${Math.floor(diff / 86400)}d ago`
// }

// const ACTIVITY_COLORS: Record<string, string> = {
//   submission: '#10B981',
//   import: '#3B82F6',
//   profile: '#F59E0B',
// }

// function ActivityFeed({ events }: { events: ActivityEvent[] }) {
//   return (
//     <div className="bg-card border border-border rounded-lg p-5">
//       <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
//       {events.length === 0 ? (
//         <p className="text-sm text-muted-foreground">No recent activity.</p>
//       ) : (
//         <ul className="space-y-2.5">
//           {events.map((e, i) => (
//             <li key={i} className="flex items-start gap-2.5">
//               <span
//                 className="mt-1.5 w-2 h-2 rounded-full shrink-0"
//                 style={{ backgroundColor: ACTIVITY_COLORS[e.type] ?? '#94a3b8' }}
//               />
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm text-foreground leading-snug">{e.label}</p>
//               </div>
//               <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
//                 {timeAgoFromEvent(e.timestamp)}
//               </span>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   )
// }



// // ─── Main Component ───────────────────────────────────────────────────────────

// export function AnalyticsDashboard({ role }: { role: Role }) {
//   // ── State ──────────────────────────────────────────────────────────────────
//   const [overview, setOverview] = React.useState<OverviewData | null>(null)
//   const [overviewLoading, setOverviewLoading] = React.useState(true)

//   const [groupBy, setGroupBy] = React.useState<GroupBy>('sector')
//   const [groupData, setGroupData] = React.useState<GroupItem[]>([])
//   const [groupLoading, setGroupLoading] = React.useState(true)

//   const [profileCompletion, setProfileCompletion] = React.useState<Array<{ name: string; value: number }>>([])
//   const [submissionActivity, setSubmissionActivity] = React.useState<Array<{ date: string; submissions: number }>>([])

//   const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null)
//   const [drillMembers, setDrillMembers] = React.useState<MemberRow[]>([])
//   const [drillLoading, setDrillLoading] = React.useState(false)
//   const [drillSearch, setDrillSearch] = React.useState('')
//   const [drillGender, setDrillGender] = React.useState<string>('__all__')
//   const [drillStatus, setDrillStatus] = React.useState<string>('__all__')

//   const [formRates, setFormRates] = React.useState<FormRate[]>([])
//   const [activity, setActivity] = React.useState<ActivityEvent[]>([])

//   const isSuperAdmin = role === 'SuperAdmin'

//   const filteredDrillMembers = React.useMemo(() => {
//     const q = drillSearch.trim().toLowerCase()
//     return drillMembers.filter(m => {
//       if (drillGender !== '__all__' && m.gender !== drillGender) return false
//       if (drillStatus !== '__all__' && m.status !== drillStatus) return false
//       if (q) {
//         if (!m.name.toLowerCase().includes(q) && !String(m.its_no).includes(q)) return false
//       }
//       return true
//     })
//   }, [drillMembers, drillSearch, drillGender, drillStatus])

//   const drillGenders = React.useMemo(
//     () => [...new Set(drillMembers.map(m => m.gender).filter((g): g is string => !!g))].sort(),
//     [drillMembers]
//   )
//   const drillStatuses = React.useMemo(
//     () => [...new Set(drillMembers.map(m => m.status).filter((s): s is string => !!s))].sort(),
//     [drillMembers]
//   )

//   // ── Fetch overview (SuperAdmin only) ───────────────────────────────────────
//   React.useEffect(() => {
//     if (!isSuperAdmin) return
//     fetch('/api/analytics/overview')
//       .then(r => r.json())
//       .then(setOverview)
//       .catch(() => { })
//       .finally(() => setOverviewLoading(false))
//   }, [isSuperAdmin])

//   // ── Fetch group data (SuperAdmin only) ────────────────────────────────────
//   React.useEffect(() => {
//     if (!isSuperAdmin) return
//     setGroupLoading(true)
//     setSelectedGroup(null)
//     setDrillMembers([])
//     setDrillSearch('')
//     setDrillGender('__all__')
//     setDrillStatus('__all__')

//     fetch(`/api/analytics/groups?groupBy=${groupBy}`)
//       .then(r => r.json())
//       .then((d: GroupItem[]) => setGroupData(d))
//       .catch(() => setGroupData([]))
//       .finally(() => setGroupLoading(false))
//   }, [groupBy, isSuperAdmin])

//   // ── Fetch profile completion & submission activity (SuperAdmin only) ───────
//   React.useEffect(() => {
//     if (!isSuperAdmin) return
//     fetch('/api/analytics/profile-completion')
//       .then(r => r.json())
//       .then(setProfileCompletion)
//       .catch(() => { })

//     fetch('/api/analytics/form-activity')
//       .then(r => r.json())
//       .then(setSubmissionActivity)
//       .catch(() => { })
//   }, [isSuperAdmin])

//   // ── Drill-down (SuperAdmin only) ──────────────────────────────────────────
//   React.useEffect(() => {
//     if (!isSuperAdmin) return
//     if (!selectedGroup) { setDrillMembers([]); return }
//     setDrillLoading(true)
//     fetch(`/api/analytics/drill?groupBy=${groupBy}&name=${encodeURIComponent(selectedGroup)}`)
//       .then(r => r.json())
//       .then((d: MemberRow[]) => setDrillMembers(d))
//       .catch(() => setDrillMembers([]))
//       .finally(() => setDrillLoading(false))
//   }, [selectedGroup, groupBy, isSuperAdmin])

//   // ── Form rates (all roles) + activity (SuperAdmin only) ───────────────────
//   React.useEffect(() => {
//     fetch('/api/analytics/form-rates')
//       .then(r => r.json())
//       .then(setFormRates)
//       .catch(() => { })

//     if (isSuperAdmin) {
//       fetch('/api/analytics/activity')
//         .then(r => r.json())
//         .then(setActivity)
//         .catch(() => { })
//     }
//   }, [isSuperAdmin])



//   // ── Bar click handler ──────────────────────────────────────────────────────
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   function handleBarClick(data: any) {
//     const name = data?.activePayload?.[0]?.payload?.name
//     if (name) setSelectedGroup((prev: string | null) => prev === name ? null : name)
//   }

//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   function handlePieClick(data: any) {
//     if (data?.name) setSelectedGroup((prev: string | null) => prev === data.name ? null : data.name)
//   }

//   // ── Non-SuperAdmin: scoped view ───────────────────────────────────────────
//   if (!isSuperAdmin) {
//     return (
//       <div className="space-y-8">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
//             {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
//           </p>
//           <h1 className="text-[28px] font-bold text-foreground leading-tight">Analytics</h1>
//           <p className="text-sm text-muted-foreground mt-1">Showing analytics for your assigned Mumineen</p>
//         </div>
//         <FormResponseRates rates={formRates} />
//         <div className="border-t border-border pt-8">
//           <FormAnalyticsSection />
//         </div>
//       </div>
//     )
//   }

//   // ─────────────────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-8">

//       {/* Header */}
//       <div>
//         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
//           {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
//         </p>
//         <h1 className="text-[28px] font-bold text-foreground leading-tight">Analytics</h1>
//         <p className="text-sm text-muted-foreground mt-1">System-wide analytics for SuperAdmin</p>
//       </div>

//       {/* ── Widget Row ─────────────────────────────────────────────────────── */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//         {overviewLoading ? (
//           Array.from({ length: 4 }).map((_, i) => (
//             <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
//               <div className="h-3 bg-muted rounded w-24 mb-3" />
//               <div className="h-8 bg-muted rounded w-16" />
//             </div>
//           ))
//         ) : (
//           <>
//             <WidgetCard
//               title="Active Forms"
//               value={overview?.activeForms ?? 0}
//               sub="Currently published"
//             />
//             <WidgetCard
//               title="Members w/ No Profile"
//               value={overview?.membersWithNoProfile ?? 0}
//               sub="No profile data recorded"
//             />
//             <WidgetCard
//               title="Overdue Forms"
//               value={overview?.overdueForms ?? 0}
//               sub="Published & past expiry"
//             />
//             <div className="bg-card border border-border rounded-lg p-5">
//               <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Imports</p>
//               {(overview?.recentImports ?? []).length === 0 ? (
//                 <p className="text-xs text-muted-foreground">No imports yet</p>
//               ) : (
//                 <ul className="space-y-1.5">
//                   {(overview?.recentImports ?? []).slice(0, 3).map((imp) => (
//                     <li key={imp.id} className="flex items-start justify-between gap-2">
//                       <span className="text-xs text-foreground truncate max-w-[110px]">
//                         {imp.filename ?? imp.table_name ?? 'Import'}
//                       </span>
//                       <span className="text-[10px] text-muted-foreground whitespace-nowrap">
//                         {timeAgo(imp.created_at)}
//                       </span>
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </div>
//           </>
//         )}
//       </div>


//       {/* ── Charts Section ────────────────────────────────────────────────── */}
//       <div className="space-y-6">

//         {/* Grouping toggle */}
//         <div className="flex items-center gap-2">
//           <span className="text-xs font-medium text-muted-foreground">Group by:</span>
//           {(['sector', 'subsector'] as GroupBy[]).map((g) => (
//             <button
//               key={g}
//               onClick={() => setGroupBy(g)}
//               className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${groupBy === g
//                 ? 'bg-primary text-primary-foreground border-primary'
//                 : 'bg-card text-foreground border-border hover:border-primary/50'
//                 }`}
//             >
//               {g.charAt(0).toUpperCase() + g.slice(1)}
//             </button>
//           ))}
//           {selectedGroup && (
//             <button
//               onClick={() => setSelectedGroup(null)}
//               className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
//             >
//               Clear filter: {selectedGroup}
//             </button>
//           )}
//         </div>


//         {/* Bar chart — members per group */}
//         <div className="bg-card border border-border rounded-lg p-5">
//           <h2 className="text-base font-semibold text-foreground mb-4">
//             Members by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
//           </h2>
//           {groupLoading ? (
//             <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
//           ) : groupData.length === 0 ? (
//             <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
//           ) : (
//             <ResponsiveContainer width="100%" height={260}>
//               {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
//               <BarChart
//                 data={groupData}
//                 margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
//                 onClick={handleBarClick as any}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
//                 <XAxis
//                   dataKey="name"
//                   tick={{ fontSize: 11 }}
//                   tickLine={false}
//                   axisLine={false}
//                   interval={0}
//                   angle={groupData.length > 6 ? -35 : 0}
//                   textAnchor={groupData.length > 6 ? 'end' : 'middle'}
//                   height={groupData.length > 6 ? 60 : 30}
//                 />
//                 <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
//                 <Tooltip
//                   contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
//                   cursor={{ fill: '#f8fafc' }}
//                 />
//                 <Bar
//                   dataKey="count"
//                   name="Members"
//                   radius={[4, 4, 0, 0]}
//                   maxBarSize={48}
//                 >
//                   {groupData.map((entry, i) => (
//                     <Cell
//                       key={i}
//                       fill={selectedGroup === entry.name ? '#F59E0B' : '#3B82F6'}
//                       opacity={selectedGroup && selectedGroup !== entry.name ? 0.4 : 1}
//                     />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {/* Bottom two charts */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

//           {/* Pie — profile completion by Umoor category */}
//           <div className="bg-card border border-border rounded-lg p-5">
//             <h2 className="text-base font-semibold text-foreground mb-4">Profile Completion by Category</h2>
//             {profileCompletion.length === 0 ? (
//               <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
//             ) : (
//               <ResponsiveContainer width="100%" height={220}>
//                 <PieChart>
//                   <Pie
//                     data={profileCompletion}
//                     cx="50%"
//                     cy="50%"
//                     innerRadius={55}
//                     outerRadius={80}
//                     paddingAngle={3}
//                     dataKey="value"
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     onClick={handlePieClick as any}
//                     style={{ cursor: 'pointer' }}
//                   >
//                     {profileCompletion.map((_, i) => (
//                       <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip
//                     contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     formatter={((v: number | string) => [`${v}%`, 'Completion']) as any}
//                   />
//                   <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
//                 </PieChart>
//               </ResponsiveContainer>
//             )}
//           </div>

//           {/* Line — form submission activity over time */}
//           <div className="bg-card border border-border rounded-lg p-5">
//             <h2 className="text-base font-semibold text-foreground mb-4">Form Submission Activity</h2>
//             {submissionActivity.length === 0 ? (
//               <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No submissions yet</div>
//             ) : (
//               <ResponsiveContainer width="100%" height={220}>
//                 <LineChart data={submissionActivity} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
//                   <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
//                   <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
//                   <Tooltip
//                     contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
//                   />
//                   <Line
//                     type="monotone"
//                     dataKey="submissions"
//                     stroke="#F59E0B"
//                     strokeWidth={2}
//                     dot={{ r: 3, fill: '#F59E0B' }}
//                     activeDot={{ r: 5 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             )}
//           </div>
//         </div>
//       </div>



//       {/* ── Drill-down Table ──────────────────────────────────────────────── */}
//       <div>
//         <h2 className="text-base font-semibold text-foreground mb-3">
//           {selectedGroup ? `Members — ${selectedGroup}` : 'Member Detail Table'}
//         </h2>
//         {!selectedGroup ? (
//           <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
//             Click a chart segment to filter members by group.
//           </div>
//         ) : drillLoading ? (
//           <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm animate-pulse">
//             Loading members…
//           </div>
//         ) : drillMembers.length === 0 ? (
//           <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
//             No members found for this group.
//           </div>
//         ) : (
//           <div className="bg-card border border-border rounded-lg overflow-hidden">
//             {/* Filter bar */}
//             <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
//               <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
//                 {selectedGroup}
//               </span>
//               <div className="ml-auto flex items-center gap-2">
//                 {drillGenders.length > 0 && (
//                   <Select value={drillGender} onValueChange={setDrillGender}>
//                     <SelectTrigger className="h-7 text-xs w-28">
//                       <SelectValue placeholder="All Genders" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="__all__">All Genders</SelectItem>
//                       {drillGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                 )}
//                 {drillStatuses.length > 1 && (
//                   <Select value={drillStatus} onValueChange={setDrillStatus}>
//                     <SelectTrigger className="h-7 text-xs w-28">
//                       <SelectValue placeholder="All Statuses" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="__all__">All Statuses</SelectItem>
//                       {drillStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                 )}
//                 <div className="relative">
//                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
//                   <Input
//                     placeholder="Name or ITS…"
//                     className="pl-7 h-7 text-xs w-36"
//                     value={drillSearch}
//                     onChange={e => setDrillSearch(e.target.value)}
//                   />
//                 </div>
//               </div>
//             </div>
//             {filteredDrillMembers.length === 0 ? (
//               <div className="p-8 text-center text-muted-foreground text-sm">No members match the current filters.</div>
//             ) : (
//               <>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/30">
//                         <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ITS No</th>
//                         <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
//                         <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Sector</th>
//                         <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Subsector</th>
//                         <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Last Profile Update</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {filteredDrillMembers.map((m) => (
//                         <tr key={m.its_no} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
//                           <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{m.its_no}</td>
//                           <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
//                           <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.sector_name ?? '—'}</td>
//                           <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{m.subsector_name ?? '—'}</td>
//                           <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
//                             {m.last_profile_update ? formatDate(m.last_profile_update) : '—'}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//                 <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
//                   {filteredDrillMembers.length} of {drillMembers.length} member{drillMembers.length !== 1 ? 's' : ''} shown
//                 </div>
//               </>
//             )}
//           </div>
//         )}
//       </div>

//       <FormResponseRates rates={formRates} />
//       <ActivityFeed events={activity} />

//       {/* ── Divider ───────────────────────────────────────────────────────── */}
//       <div className="border-t border-border pt-8 space-y-12">

//         {/* Step 5 — Form Analytics */}
//         <FormAnalyticsSection />

//         {/* Step 6 — Sector Performance Heatmap */}
//         <SectorPerformanceSection />

//       </div>

//     </div>
//   )
// }

'use client'

import * as React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts'

import type { FormRate } from '@/app/api/analytics/form-rates/route'
import type { ActivityEvent } from '@/app/api/analytics/activity/route'
import type { Role } from '@/lib/types/app'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormAnalyticsSection } from './FormAnalyticsSection'
import { SectorPerformanceSection } from './SectorPerformanceSection'


// ─── Types ────────────────────────────────────────────────────────────────────

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
  sector_name?: string
  subsector_name?: string
  last_profile_update?: string
  gender?: string
  status?: string
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function timeAgo(date: string) {
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  } catch (e) { return 'recently' }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}


// ─── Sub-Components ───────────────────────────────────────────────────────────

function WidgetCard({ title, value, sub }: { title: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground mt-2 font-medium">{sub}</p>}
    </div>
  )
}

function FormResponseRates({ rates }: { rates: FormRate[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">Form Response Rates</h3>
      </div>
      <div className="divide-y divide-border">
        {!Array.isArray(rates) || rates.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No published forms found</div>
        ) : (
          rates.map((form) => (
            <div key={form.id} className="px-5 py-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">{form.title}</span>
                <span className="text-[11px] font-bold text-foreground">{form.pct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ width: `${form.pct}%` }} 
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">
                  {form.responses} of {form.total} responded
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// function ActivityFeed({ events }: { events: ActivityEvent[] }) {
//   return (
//     <div className="bg-card border border-border rounded-lg flex flex-col h-full">
//       <div className="px-5 py-4 border-b border-border">
//         <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
//       </div>
//       <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[400px]">
//         {!Array.isArray(events) || events.length === 0 ? (
//           <div className="text-center py-8 text-xs text-muted-foreground">No recent events</div>
//         ) : (
//           events.map((ev, i) => (
//             <div key={i} className="flex gap-3 items-start group">
//               <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
//               <div className="space-y-1">
//                 <p className="text-xs text-foreground leading-relaxed">
//                   <span className="font-bold">{ev.user_email?.split('@')[0] || 'User'}</span>
//                   {' '}{ev.action_type?.replace('_', ' ') || 'action'}
//                   {ev.entity_name && <span className="text-muted-foreground italic"> — {ev.entity_name}</span>}
//                 </p>
//                 <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
//                   {timeAgo(ev.created_at)}
//                 </p>
//               </div>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   )
// }


// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsDashboard({ role }: { role: Role }) {
  // ── State ──────────────────────────────────────────────────────────────────
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

  // Logic Change: Define Management Roles
  const isManagement = ['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(role)
  const isSuperAdmin = role === 'SuperAdmin'

  const filteredDrillMembers = React.useMemo(() => {
    const q = drillSearch.trim().toLowerCase()
    return (drillMembers || []).filter(m => {
      if (drillGender !== '__all__' && m.gender !== drillGender) return false
      if (drillStatus !== '__all__' && m.status !== drillStatus) return false
      if (q) {
        if (!m.name?.toLowerCase().includes(q) && !String(m.its_no).includes(q)) return false
      }
      return true
    })
  }, [drillMembers, drillSearch, drillGender, drillStatus])

  const drillGenders = React.useMemo(
    () => [...new Set((drillMembers || []).map(m => m.gender).filter((g): g is string => !!g))].sort(),
    [drillMembers]
  )
  const drillStatuses = React.useMemo(
    () => [...new Set((drillMembers || []).map(m => m.status).filter((s): s is string => !!s))].sort(),
    [drillMembers]
  )


  // ── Effects (Updated Gates) ────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isManagement) return
    fetch('/api/analytics/overview')
      .then(r => r.json())
      .then(d => setOverview(d.error ? null : d))
      .catch(() => { })
      .finally(() => setOverviewLoading(false))
  }, [isManagement])

  React.useEffect(() => {
    if (!isManagement) return
    setGroupLoading(true)
    setSelectedGroup(null)
    setDrillMembers([])
    
    fetch(`/api/analytics/groups?groupBy=${groupBy}`)
      .then(r => r.json())
      .then((d) => setGroupData(Array.isArray(d) ? d : []))
      .catch(() => setGroupData([]))
      .finally(() => setGroupLoading(false))
  }, [groupBy, isManagement])

  React.useEffect(() => {
    if (!isManagement) return
    fetch('/api/analytics/profile-completion')
      .then(r => r.json())
      .then(d => setProfileCompletion(Array.isArray(d) ? d : []))
      .catch(() => { })

    fetch('/api/analytics/form-activity')
      .then(r => r.json())
      .then(d => setSubmissionActivity(Array.isArray(d) ? d : []))
      .catch(() => { })
  }, [isManagement])

  React.useEffect(() => {
    if (!isManagement) return
    if (!selectedGroup) { setDrillMembers([]); return }
    setDrillLoading(true)
    fetch(`/api/analytics/drill?groupBy=${groupBy}&name=${encodeURIComponent(selectedGroup)}`)
      .then(r => r.json())
      .then((d) => setDrillMembers(Array.isArray(d) ? d : []))
      .catch(() => setDrillMembers([]))
      .finally(() => setDrillLoading(false))
  }, [selectedGroup, groupBy, isManagement])

  React.useEffect(() => {
    fetch('/api/analytics/form-rates')
      .then(r => r.json())
      .then(d => setFormRates(Array.isArray(d) ? d : []))
      .catch(() => { })

    if (isManagement) {
      fetch('/api/analytics/activity')
        .then(r => r.json())
        .then(d => setActivity(Array.isArray(d) ? d : []))
        .catch(() => { })
    }
  }, [isManagement])


  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleBarClick(data: any) {
    if (data && data.activePayload && data.activePayload.length > 0) {
      setSelectedGroup(data.activePayload[0].payload.name)
    }
  }

  function handlePieClick(data: any) {
    if (data && data.name) {
      setSelectedGroup(data.name)
    }
  }


  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isManagement) {
    return <div className="p-12 text-center text-muted-foreground font-medium">Access Denied</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
        </p>
        <h1 className="text-[28px] font-bold text-foreground leading-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuperAdmin ? 'System-wide analytics overview' : 'Assigned analytics overview'}
        </p>
      </div>

      {/* Overview Cards */}
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
            <WidgetCard title="Active Forms" value={overview?.activeForms ?? 0} sub="Currently published" />
            <WidgetCard title="Members w/ No Profile" value={overview?.membersWithNoProfile ?? 0} sub="No profile data recorded" />
            <WidgetCard title="Overdue Forms" value={overview?.overdueForms ?? 0} sub="Past expiry date" />
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Imports</p>
              {!overview?.recentImports || overview.recentImports.length === 0 ? (
                <p className="text-xs text-muted-foreground">No imports found</p>
              ) : (
                <ul className="space-y-1.5">
                  {overview.recentImports.slice(0, 3).map((imp) => (
                    <li key={imp.id} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-foreground truncate max-w-[110px]">
                        {imp.filename ?? imp.table_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(imp.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-bold text-foreground">Member Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Distribution by {groupBy}</p>
              </div>
              <div className="flex bg-muted p-1 rounded-md">
                <button
                  onClick={() => setGroupBy('sector')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all ${groupBy === 'sector' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Sector
                </button>
                <button
                  onClick={() => setGroupBy('subsector')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all ${groupBy === 'subsector' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Subsector
                </button>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {groupLoading ? (
                <div className="h-full w-full bg-muted/20 animate-pulse rounded flex items-center justify-center text-xs text-muted-foreground">
                  Loading distribution...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupData} onClick={handleBarClick} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }} 
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={groupBy === 'sector' ? 40 : 20} />
                    {/* <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={groupBy === 'sector' ? 40 : 20} /> */}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-bold text-foreground mb-6">Profile Completion</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={profileCompletion}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={handlePieClick}
                    >
                      {profileCompletion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-bold text-foreground mb-6">Submission Activity</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={submissionActivity}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* <ActivityFeed events={activity} /> */}
          <FormResponseRates rates={formRates} />
        </div>
      </div>

      {/* Drill-down Section */}
      <div id="drill-down" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Data Explorer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedGroup ? `Showing members in ${selectedGroup}` : 'Select a category above to filter members'}
            </p>
          </div>
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline underline-offset-4"
            >
              Clear Filter
            </button>
          )}
        </div>

        {selectedGroup && (
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or ITS..."
                  className="pl-9 h-9 text-xs"
                  value={drillSearch}
                  onChange={e => setDrillSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={drillGender} onValueChange={setDrillGender}>
                  <SelectTrigger className="h-9 text-xs w-[120px]">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Genders</SelectItem>
                    {drillGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={drillStatus} onValueChange={setDrillStatus}>
                  <SelectTrigger className="h-9 text-xs w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    {drillStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {drillLoading ? (
              <div className="p-12 text-center animate-pulse text-xs text-muted-foreground">Fetching member data...</div>
            ) : !Array.isArray(filteredDrillMembers) || filteredDrillMembers.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">No members found matching filters</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 font-bold border-b border-border">
                      <tr>
                        <th className="px-4 py-3">ITS No</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Sector</th>
                        <th className="px-4 py-3 hidden md:table-cell">Subsector</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDrillMembers.map((m) => (
                        <tr key={m.its_no} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs">{m.its_no}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.sector_name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{m.subsector_name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                            {m.last_profile_update ? formatDate(m.last_profile_update) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground font-medium">
                  {filteredDrillMembers.length} of {drillMembers?.length || 0} member{(drillMembers?.length || 0) !== 1 ? 's' : ''} shown
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-8 space-y-12">
        <FormAnalyticsSection />
        <SectorPerformanceSection />
      </div>
    </div>
  )
}