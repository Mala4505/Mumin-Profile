// 'use client'

// import { useState, useMemo, Fragment } from 'react'
// import Link from 'next/link'
// import { Users, ChevronUp, ChevronDown, ChevronRight, ChevronsUpDown, LayoutList, Hash, Search } from 'lucide-react'
// import type { MemberListItem, Role } from '@/lib/types/app'

// interface MemberTableProps {
//   members: MemberListItem[]
//   role: Role
//   mode: 'idle' | 'loaded'
// }

// const PAGE_SIZE = 25

// // ─── Badges ────────────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: string }) {
//   const styles: Record<string, string> = {
//     active: 'bg-green-100 text-green-700 border border-green-200',
//     deceased: 'bg-gray-100 text-gray-500 border border-gray-200',
//     relocated: 'bg-blue-100 text-blue-700 border border-blue-200',
//     left_community: 'bg-red-100 text-red-700 border border-red-200',
//     inactive: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
//   }
//   const labels: Record<string, string> = {
//     active: 'Active',
//     deceased: 'Deceased',
//     relocated: 'Relocated',
//     left_community: 'Left Community',
//     inactive: 'Inactive',
//   }
//   return (
//     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
//       {labels[status] ?? status}
//     </span>
//   )
// }

// function BaligBadge({ status }: { status: string }) {
//   return (
//     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Balig' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
//       {status}
//     </span>
//   )
// }

// function GenderPill({ gender }: { gender: 'M' | 'F' }) {
//   if (gender === 'M') {
//     return (
//       <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
//         <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//           <circle cx="10" cy="14" r="5" /><line x1="19" y1="5" x2="14.14" y2="9.86" /><polyline points="15 5 19 5 19 9" />
//         </svg>
//         Male
//       </span>
//     )
//   }
//   return (
//     <span className="inline-flex items-center gap-1 text-xs text-pink-600 font-medium">
//       <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//         <circle cx="12" cy="9" r="5" /><line x1="12" y1="14" x2="12" y2="22" /><line x1="9" y1="19" x2="15" y2="19" />
//       </svg>
//       Female
//     </span>
//   )
// }

// // ─── Sort helpers ───────────────────────────────────────────────────────────

// type SortDir = 'asc' | 'desc'

// function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
//   if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50 inline ml-1" />
//   return sortDir === 'asc'
//     ? <ChevronUp className="w-3.5 h-3.5 text-primary inline ml-1" />
//     : <ChevronDown className="w-3.5 h-3.5 text-primary inline ml-1" />
// }

// function SortTh({ col, label, sortCol, sortDir, onSort, className = '' }: {
//   col: string; label: string; sortCol: string; sortDir: SortDir; onSort: (c: string) => void; className?: string
// }) {
//   return (
//     <th
//       className={`text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
//       onClick={() => onSort(col)}
//     >
//       {label}
//       <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
//     </th>
//   )
// }

// function sortMembers(members: MemberListItem[], col: string, dir: SortDir): MemberListItem[] {
//   return [...members].sort((a, b) => {
//     const av = (a as any)[col] ?? ''
//     const bv = (b as any)[col] ?? ''
//     const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
//     return dir === 'asc' ? cmp : -cmp
//   })
// }

// // ─── Pagination ─────────────────────────────────────────────────────────────

// function Pagination({ page, total, pageSize, onPage }: {
//   page: number; total: number; pageSize: number; onPage: (p: number) => void
// }) {
//   const totalPages = Math.max(1, Math.ceil(total / pageSize))
//   const from = Math.min((page - 1) * pageSize + 1, total)
//   const to = Math.min(page * pageSize, total)

//   return (
//     <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
//       <span className="text-xs text-muted-foreground">
//         Showing {from}–{to} of {total}
//       </span>
//       <div className="flex items-center gap-1">
//         <button
//           onClick={() => onPage(1)}
//           disabled={page === 1}
//           className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           «
//         </button>
//         <button
//           onClick={() => onPage(page - 1)}
//           disabled={page === 1}
//           className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           Prev
//         </button>
//         <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
//           {page}
//         </span>
//         <span className="text-xs text-muted-foreground">/ {totalPages}</span>
//         <button
//           onClick={() => onPage(page + 1)}
//           disabled={page === totalPages}
//           className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           Next
//         </button>
//         <button
//           onClick={() => onPage(totalPages)}
//           disabled={page === totalPages}
//           className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           »
//         </button>
//       </div>
//     </div>
//   )
// }

// // ─── PACI grouped row type ───────────────────────────────────────────────────

// interface PaciGroup {
//   paci_no: string | null
//   sabeel_no: string
//   floor_no: string | null
//   flat_no: string | null
//   building_name: string | null
//   landmark: string | null
//   subsector_name: string
//   sector_name: string
//   head_its_no: number | null
//   hof_name: string | null
//   members: MemberListItem[]
// }

// function groupByPaci(members: MemberListItem[]): PaciGroup[] {
//   const map = new Map<string, PaciGroup>()
//   for (const m of members) {
//     const key = m.paci_no ?? `no-paci-${m.sabeel_no}`
//     if (!map.has(key)) {
//       map.set(key, {
//         paci_no: m.paci_no,
//         sabeel_no: m.sabeel_no,
//         floor_no: m.floor_no,
//         flat_no: m.flat_no,
//         building_name: m.building_name,
//         landmark: m.landmark,
//         subsector_name: m.subsector_name,
//         sector_name: m.sector_name,
//         head_its_no: m.head_its_no,
//         hof_name: m.hof_name,
//         members: [],
//       })
//     }
//     map.get(key)!.members.push(m)
//   }
//   return [...map.values()]
// }

// function sortPaciGroups(groups: PaciGroup[], col: string, dir: SortDir): PaciGroup[] {
//   return [...groups].sort((a, b) => {
//     let av: string, bv: string
//     if (col === 'member_count') {
//       av = String(a.members.length)
//       bv = String(b.members.length)
//     } else {
//       av = String((a as any)[col] ?? '')
//       bv = String((b as any)[col] ?? '')
//     }
//     const cmp = av.localeCompare(bv, undefined, { numeric: true })
//     return dir === 'asc' ? cmp : -cmp
//   })
// }

// // ─── Main component ─────────────────────────────────────────────────────────

// export function MemberTable({ members, role, mode }: MemberTableProps) {
//   const [viewMode, setViewMode] = useState<'paci' | 'member'>('paci')
//   const [sortCol, setSortCol] = useState('name')
//   const [sortDir, setSortDir] = useState<SortDir>('asc')
//   const [page, setPage] = useState(1)
//   const [expandedPaci, setExpandedPaci] = useState<Set<string>>(new Set())

//   const isMumin = role === 'Mumin'
//   const isStaff = role !== 'Mumin'
//   const showSector = role === 'SuperAdmin' || role === 'Admin'

//   function handleSort(col: string) {
//     if (sortCol === col) {
//       setSortDir(d => d === 'asc' ? 'desc' : 'asc')
//     } else {
//       setSortCol(col)
//       setSortDir('asc')
//     }
//     setPage(1)
//   }

//   function togglePaci(key: string) {
//     setExpandedPaci(prev => {
//       const next = new Set(prev)
//       next.has(key) ? next.delete(key) : next.add(key)
//       return next
//     })
//   }

//   // ── Member view ──────────────────────────────────────────────────────────
//   const sortedMembers = useMemo(() => sortMembers(members, sortCol, sortDir), [members, sortCol, sortDir])
//   const memberPage = useMemo(() => sortedMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedMembers, page])

//   // ── PACI view ────────────────────────────────────────────────────────────
//   const paciGroups = useMemo(() => groupByPaci(members), [members])
//   const sortedPaci = useMemo(() => sortPaciGroups(paciGroups, sortCol, sortDir), [paciGroups, sortCol, sortDir])
//   const paciPage = useMemo(() => sortedPaci.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedPaci, page])

//   if (mode === 'idle') {
//     return (
//       <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
//         <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
//           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
//             <Search className="w-8 h-8 text-muted-foreground" />
//           </div>
//           <h3 className="text-base font-semibold text-foreground mb-1">Search to find members</h3>
//           <p className="text-sm text-muted-foreground mb-5">
//             Use the filters above, or load all members you have access to.
//           </p>
//           <a
//             href="/members?show_all=1"
//             className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
//           >
//             <Users className="w-4 h-4" />
//             View All Members
//           </a>
//         </div>
//       </div>
//     )
//   }

//   if (members.length === 0) {
//     return (
//       <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
//         <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
//           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
//             <Users className="w-8 h-8 text-muted-foreground" />
//           </div>
//           <h3 className="text-base font-semibold text-foreground mb-1">No members found</h3>
//           <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
//         </div>
//       </div>
//     )
//   }

//   const totalItems = viewMode === 'paci' ? paciGroups.length : members.length
//   // colSpan for accordion row: PACI No, Sabeel, Floor, Flat, Building, Landmark, Members, [Sector], Subsector, Actions
//   const paciColSpan = showSector ? 11 : 10

//   return (
//     <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
//       {/* Header row: count + view toggle */}
//       <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
//         <span className="text-xs text-muted-foreground font-medium">
//           {viewMode === 'paci'
//             ? `${paciGroups.length} flat${paciGroups.length !== 1 ? 's' : ''} (${members.length} member${members.length !== 1 ? 's' : ''})`
//             : `${members.length} member${members.length !== 1 ? 's' : ''}`}
//         </span>
//         {isStaff && (
//           <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border">
//             <button
//               onClick={() => { setViewMode('paci'); setPage(1) }}
//               className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'paci' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
//             >
//               <Hash className="w-3.5 h-3.5" />
//               By PACI
//             </button>
//             <button
//               onClick={() => { setViewMode('member'); setPage(1) }}
//               className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'member' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
//             >
//               <LayoutList className="w-3.5 h-3.5" />
//               By Member
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ── PACI View ──────────────────────────────────────────────────────── */}
//       {viewMode === 'paci' && isStaff && (
//         <>
//           <div className="hidden md:block overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-muted/40 border-b border-border">
//                   <SortTh col="paci_no" label="PACI No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="sabeel_no" label="Sabeel No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="floor_no" label="Floor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="flat_no" label="Flat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="building_name" label="Building" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   {/* <SortTh col="landmark" label="Landmark" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} /> */}
//                   <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">Head of Family</th>
//                   <SortTh col="member_count" label="Count" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   {showSector && (
//                     <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   )}
//                   <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
//                     {/* chevron column — no label */}
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paciPage.map((group, idx) => {
//                   const rowKey = group.paci_no ?? group.sabeel_no
//                   const isExpanded = expandedPaci.has(rowKey)
//                   const sortedGroupMembers = [...group.members].sort(
//                     (a, b) => (b.its_no === group.head_its_no ? 1 : 0) - (a.its_no === group.head_its_no ? 1 : 0)
//                   )
//                   return (
//                     <Fragment key={group.paci_no ?? idx}>
//                       <tr
//                         className="hover:bg-muted/30 transition-colors border-b border-border last:border-0 cursor-pointer"
//                         onClick={() => togglePaci(rowKey)}
//                       >
//                         <td className="px-4 py-3">
//                           <span className="font-mono text-xs text-muted-foreground">{group.paci_no ?? '—'}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="font-mono text-xs text-muted-foreground">{group.sabeel_no}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-sm">{group.floor_no ?? '—'}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-sm">{group.flat_no ?? '—'}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-sm">{group.building_name ?? '—'}</span>
//                         </td>
//                         {/* <td className="px-4 py-3">
//                           <span className="text-sm text-muted-foreground">{group.landmark ?? '—'}</span>
//                         </td> */}
//                         {/* Head of Family cell */}
//                         <td className="px-4 py-3">
//                           {group.hof_name
//                             ? <span className="text-sm font-medium">{group.hof_name}</span>
//                             : <span className="text-sm text-muted-foreground">—</span>}
//                         </td>
//                         {/* Member count cell */}
//                         <td className="px-4 py-3">
//                           <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
//                             {group.members.length}
//                           </span>
//                         </td>
//                         {showSector && (
//                           <td className="px-4 py-3">
//                             <span className="text-sm">{group.sector_name}</span>
//                           </td>
//                         )}
//                         <td className="px-4 py-3">
//                           <span className="text-sm">{group.subsector_name}</span>
//                         </td>
//                         {/* Chevron toggle */}
//                         <td className="px-4 py-3 text-right" onClick={e => { e.stopPropagation(); togglePaci(rowKey) }}>
//                           <button className="p-1 rounded hover:bg-muted/50 transition-colors">
//                             {isExpanded
//                               ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
//                               : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
//                           </button>
//                         </td>
//                       </tr>

//                       {/* Accordion expanded row */}
//                       {isExpanded && (
//                         <tr key={`${rowKey}-expanded`}>
//                           <td colSpan={paciColSpan} className="px-0 py-0 bg-muted/10 border-b border-border">
//                             <div className="px-6 py-3">
//                               <table className="w-full text-xs">
//                                 <thead>
//                                   <tr className="text-left text-muted-foreground">
//                                     <th className="pb-1.5 pr-4 font-medium">ITS No</th>
//                                     <th className="pb-1.5 pr-4 font-medium">Name</th>
//                                     <th className="pb-1.5 pr-4 font-medium">Gender</th>
//                                     <th className="pb-1.5 pr-4 font-medium">Balig</th>
//                                     {/* <th className="pb-1.5 pr-4 font-medium">Status</th> */}
//                                     <th className="pb-1.5 font-medium text-right">View</th>
//                                   </tr>
//                                 </thead>
//                                 <tbody>
//                                   {sortedGroupMembers.map(m => {
//                                     const isHead = m.its_no === group.head_its_no
//                                     return (
//                                       <tr key={m.its_no} className="border-t border-border/50">
//                                         <td className="py-1.5 pr-4 font-mono text-muted-foreground">{m.its_no}</td>
//                                         <td className="py-1.5 pr-4 font-medium">
//                                           {m.name}
//                                           {isHead && (
//                                             <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-200">
//                                               Head
//                                             </span>
//                                           )}
//                                         </td>
//                                         <td className="py-1.5 pr-4"><GenderPill gender={m.gender} /></td>
//                                         <td className="py-1.5 pr-4"><BaligBadge status={m.balig_status} /></td>
//                                         {/* <td className="py-1.5 pr-4"><StatusBadge status={m.status} /></td> */}
//                                         <td className="py-1.5 text-right">
//                                           <Link
//                                             href={`/members/${m.its_no}`}
//                                             className="font-medium text-orange-600 hover:text-orange-700 transition-colors"
//                                             onClick={e => e.stopPropagation()}
//                                           >
//                                             View →
//                                           </Link>
//                                         </td>
//                                       </tr>
//                                     )
//                                   })}
//                                 </tbody>
//                               </table>
//                             </div>
//                           </td>
//                         </tr>
//                       )}
//                     </Fragment>
//                   )
//                 })}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile PACI cards */}
//           <div className="md:hidden divide-y divide-border">
//             {paciPage.map((group, idx) => {
//               const rowKey = group.paci_no ?? group.sabeel_no
//               const isExpanded = expandedPaci.has(rowKey)
//               const sortedGroupMembers = [...group.members].sort(
//                 (a, b) => (b.its_no === group.head_its_no ? 1 : 0) - (a.its_no === group.head_its_no ? 1 : 0)
//               )
//               return (
//                 <div key={group.paci_no ?? idx} className="hover:bg-muted/30 transition-colors">
//                   <button
//                     className="w-full text-left p-4"
//                     onClick={() => togglePaci(rowKey)}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2">
//                           <span className="font-medium text-sm truncate">{group.hof_name ?? '—'}</span>
//                           <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
//                             {group.members.length}
//                           </span>
//                         </div>
//                         <p className="font-mono text-xs text-muted-foreground mt-0.5">PACI: {group.paci_no ?? '—'} · Sabeel: {group.sabeel_no}</p>
//                         <p className="text-xs text-muted-foreground">Floor {group.floor_no ?? '—'} · Flat {group.flat_no ?? '—'}{group.building_name ? ` · ${group.building_name}` : ''}</p>
//                       </div>
//                       {isExpanded
//                         ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
//                         : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
//                     </div>
//                   </button>
//                   {isExpanded && (
//                     <div className="px-4 pb-4 space-y-1.5">
//                       {sortedGroupMembers.map(m => {
//                         const isHead = m.its_no === group.head_its_no
//                         return (
//                           <div key={m.its_no} className="flex items-center justify-between gap-2 text-sm">
//                             <div className="flex items-center gap-1.5 min-w-0">
//                               <span className="font-medium truncate">{m.name}</span>
//                               {isHead && (
//                                 <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-200">Head</span>
//                               )}
//                             </div>
//                             <Link
//                               href={`/members/${m.its_no}`}
//                               className="flex-shrink-0 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
//                               onClick={e => e.stopPropagation()}
//                             >
//                               View →
//                             </Link>
//                           </div>
//                         )
//                       })}
//                     </div>
//                   )}
//                 </div>
//               )
//             })}
//           </div>
//         </>
//       )}

//       {/* ── Member View (also default for Mumin) ──────────────────────────── */}
//       {(viewMode === 'member' || isMumin) && (
//         <>
//           <div className="hidden md:block overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-muted/40 border-b border-border">
//                   <SortTh col="its_no" label="ITS No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="name" label="Name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   {isStaff && (
//                     <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
//                       Head of Family
//                     </th>
//                   )}
//                   <SortTh col="gender" label="Gender" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <SortTh col="balig_status" label="Balig" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   {isStaff && <SortTh col="phone" label="Phone" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="paci_no" label="PACI No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="floor_no" label="Floor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="flat_no" label="Flat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="sabeel_no" label="Sabeel" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="landmark" label="Landmark" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {showSector && <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   {isStaff && <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
//                   <SortTh col="status" label="Status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
//                   <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {memberPage.map(member => (
//                   <tr key={member.its_no} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0">
//                     <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.its_no}</span></td>
//                     <td className="px-4 py-3"><span className="font-medium text-foreground">{member.name}</span></td>
//                     // Name cell — add Head badge
//                     <td className="px-4 py-3">
//                       <span className="font-medium text-foreground">{member.name}</span>
//                       {member.its_no === member.head_its_no && (
//                         <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-200">
//                           Head
//                         </span>
//                       )}
//                     </td>

//                     // HOF cell — add immediately after
//                     {isStaff && (
//                       <td className="px-4 py-3">
//                         {member.hof_name && member.its_no !== member.head_its_no
//                           ? <span className="text-sm text-muted-foreground">{member.hof_name}</span>
//                           : <span className="text-sm text-muted-foreground">—</span>}
//                       </td>
//                     )}
//                     <td className="px-4 py-3"><GenderPill gender={member.gender} /></td>
//                     <td className="px-4 py-3"><BaligBadge status={member.balig_status} /></td>
//                     {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.phone ?? '—'}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.paci_no ?? '—'}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.floor_no ?? '—'}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.flat_no ?? '—'}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.sabeel_no}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{member.landmark ?? '—'}</span></td>}
//                     {showSector && <td className="px-4 py-3"><span className="text-sm">{member.sector_name}</span></td>}
//                     {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.subsector_name}</span></td>}
//                     <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
//                     <td className="px-4 py-3 text-right">
//                       <Link href={`/members/${member.its_no}`} className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
//                         View →
//                       </Link>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           {/* Mobile member cards */}
//           <div className="md:hidden divide-y divide-border">
//             {memberPage.map(member => (
//               <div key={member.its_no} className="p-4 hover:bg-muted/30 transition-colors">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="flex-1 min-w-0">
//                     {/* <p className="font-medium text-foreground truncate">{member.name}</p> */}
//                     <p className="font-medium text-foreground truncate">
//                       {member.name}
//                       {member.its_no === member.head_its_no && (
//                         <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-200">
//                           Head
//                         </span>
//                       )}
//                     </p>
//                     <p className="font-mono text-xs text-muted-foreground mt-0.5">{member.its_no}</p>
//                     <div className="flex flex-wrap items-center gap-2 mt-2">
//                       <StatusBadge status={member.status} />
//                       <BaligBadge status={member.balig_status} />
//                       <GenderPill gender={member.gender} />
//                     </div>
//                     {isStaff && (
//                       <p className="text-xs text-muted-foreground mt-1.5">
//                         {member.subsector_name}{member.paci_no ? ` · PACI ${member.paci_no}` : ''}
//                       </p>
//                     )}
//                   </div>
//                   <Link href={`/members/${member.its_no}`} className="flex-shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-0.5">
//                     View →
//                   </Link>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </>
//       )}

//       <Pagination page={page} total={totalItems} pageSize={PAGE_SIZE} onPage={setPage} />
//     </div>
//   )
// }



'use client'

import { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import {
  Users, ChevronUp, ChevronDown, ChevronRight, FilePlus,
  ChevronsUpDown, LayoutList, Hash, Search,
} from 'lucide-react'
import type { MemberListItem, Role } from '@/lib/types/app'


interface MemberTableProps {
  members: MemberListItem[]
  role: Role
  mode: 'idle' | 'loaded'
}

const PAGE_SIZE = 25

// ─── Badges ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border border-green-200',
    deceased: 'bg-gray-100 text-gray-500 border border-gray-200',
    relocated: 'bg-blue-100 text-blue-700 border border-blue-200',
    left_community: 'bg-red-100 text-red-700 border border-red-200',
    inactive: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  }
  const labels: Record<string, string> = {
    active: 'Active',
    deceased: 'Deceased',
    relocated: 'Relocated',
    left_community: 'Left Community',
    inactive: 'Inactive',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function BaligBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Balig' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
      {status}
    </span>
  )
}

function GenderPill({ gender }: { gender: 'M' | 'F' }) {
  if (gender === 'M') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="14" r="5" /><line x1="19" y1="5" x2="14.14" y2="9.86" /><polyline points="15 5 19 5 19 9" />
        </svg>
        Male
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-pink-600 font-medium">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="5" /><line x1="12" y1="14" x2="12" y2="22" /><line x1="9" y1="19" x2="15" y2="19" />
      </svg>
      Female
    </span>
  )
}

function HeadBadge() {
  return (
    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-200">
      Head
    </span>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50 inline ml-1" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary inline ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary inline ml-1" />
}

function SortTh({ col, label, sortCol, sortDir, onSort, className = '' }: {
  col: string; label: string; sortCol: string; sortDir: SortDir; onSort: (c: string) => void; className?: string
}) {
  return (
    <th
      className={`text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  )
}

function sortMembers(members: MemberListItem[], col: string, dir: SortDir): MemberListItem[] {
  return [...members].sort((a, b) => {
    const av = (a as any)[col] ?? ''
    const bv = (b as any)[col] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Pagination ────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onPage }: {
  page: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
      <span className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
        <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">{page}</span>
        <span className="text-xs text-muted-foreground">/ {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
      </div>
    </div>
  )
}

// ─── PACI group type ───────────────────────────────────────────────────────

interface PaciGroup {
  paci_no: string | null
  sabeel_no: string
  floor_no: string | null
  flat_no: string | null
  building_name: string | null
  landmark: string | null
  subsector_name: string
  sector_name: string
  head_its_no: number | null
  hof_name: string | null
  members: MemberListItem[]
}

function groupByPaci(members: MemberListItem[]): PaciGroup[] {
  const map = new Map<string, PaciGroup>()
  for (const m of members) {
    const key = m.paci_no ?? `no-paci-${m.sabeel_no}`
    if (!map.has(key)) {
      map.set(key, {
        paci_no: m.paci_no,
        sabeel_no: m.sabeel_no,
        floor_no: m.floor_no,
        flat_no: m.flat_no,
        building_name: m.building_name,
        landmark: m.landmark,
        subsector_name: m.subsector_name,
        sector_name: m.sector_name,
        head_its_no: m.head_its_no,
        hof_name: m.hof_name,
        members: [],
      })
    }
    map.get(key)!.members.push(m)
  }
  return [...map.values()]
}

function sortPaciGroups(groups: PaciGroup[], col: string, dir: SortDir): PaciGroup[] {
  return [...groups].sort((a, b) => {
    const av = col === 'member_count' ? String(a.members.length) : String((a as any)[col] ?? '')
    const bv = col === 'member_count' ? String(b.members.length) : String((b as any)[col] ?? '')
    const cmp = av.localeCompare(bv, undefined, { numeric: true })
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Main component ────────────────────────────────────────────────────────

export function MemberTable({ members, role, mode }: MemberTableProps) {
  const [viewMode, setViewMode] = useState<'paci' | 'member'>('paci')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [expandedPaci, setExpandedPaci] = useState<Set<string>>(new Set())

  const isMumin = role === 'Mumin'
  const isStaff = role !== 'Mumin'
  const showSector = role === 'SuperAdmin' || role === 'Admin'

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  function togglePaci(key: string) {
    setExpandedPaci(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const sortedMembers = useMemo(() => sortMembers(members, sortCol, sortDir), [members, sortCol, sortDir])
  const memberPage = useMemo(() => sortedMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedMembers, page])

  const paciGroups = useMemo(() => groupByPaci(members), [members])
  const sortedPaci = useMemo(() => sortPaciGroups(paciGroups, sortCol, sortDir), [paciGroups, sortCol, sortDir])
  const paciPage = useMemo(() => sortedPaci.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedPaci, page])

  if (mode === 'idle') {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Search to find members</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Use the filters above, or load all members you have access to.
          </p>
          <a href="/members?show_all=1"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Users className="w-4 h-4" />
            View All Members
          </a>
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No members found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  const totalItems = viewMode === 'paci' ? paciGroups.length : members.length
  const paciColSpan = showSector ? 10 : 9

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-medium">
          {viewMode === 'paci'
            ? `${paciGroups.length} flat${paciGroups.length !== 1 ? 's' : ''} (${members.length} member${members.length !== 1 ? 's' : ''})`
            : `${members.length} member${members.length !== 1 ? 's' : ''}`}
        </span>
        {isStaff && (
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border">
            <button
              onClick={() => { setViewMode('paci'); setPage(1) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'paci' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Hash className="w-3.5 h-3.5" />
              By PACI
            </button>
            <button
              onClick={() => { setViewMode('member'); setPage(1) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'member' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              By Member
            </button>
          </div>
        )}
      </div>

      {/* ── PACI View ────────────────────────────────────────────────────── */}
      {viewMode === 'paci' && isStaff && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh col="paci_no" label="PACI No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="sabeel_no" label="Sabeel No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="floor_no" label="Floor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="flat_no" label="Flat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="building_name" label="Building" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Head of Family
                  </th>
                  <SortTh col="member_count" label="Count" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  {showSector && <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                  <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Request
                  </th>

                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paciPage.map((group, idx) => {
                  const rowKey = group.paci_no ?? group.sabeel_no
                  const isExpanded = expandedPaci.has(rowKey)
                  const sortedGroupMembers = [...group.members].sort(
                    (a, b) => (b.its_no === group.head_its_no ? 1 : 0) - (a.its_no === group.head_its_no ? 1 : 0)
                  )
                  return (
                    <Fragment key={rowKey + idx}>
                      <tr
                        className="hover:bg-muted/30 transition-colors border-b border-border last:border-0 cursor-pointer"
                        onClick={() => togglePaci(rowKey)}
                      >
                        <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{group.paci_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{group.sabeel_no}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.floor_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.flat_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.building_name ?? '—'}</span></td>
                        <td className="px-4 py-3">
                          {group.hof_name
                            ? <span className="text-sm font-medium">{group.hof_name}</span>
                            : <span className="text-sm text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                            {group.members.length}
                          </span>
                        </td>
                        {showSector && <td className="px-4 py-3"><span className="text-sm">{group.sector_name}</span></td>}
                        <td className="px-4 py-3"><span className="text-sm">{group.subsector_name}</span></td>

                        {/* Request button column */}
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <Link
                            href={`/requests?search=${group.sabeel_no}`}
                            className="inline-flex items-center justify-center p-1 rounded hover:bg-muted/50 transition-colors"
                          >
                            <FilePlus className="w-4 h-4 text-primary" />
                          </Link>
                        </td>

                        <td className="px-4 py-3 text-right" onClick={e => { e.stopPropagation(); togglePaci(rowKey) }}>
                          <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                      </tr>

                      {/* <tr
                        className="hover:bg-muted/30 transition-colors border-b border-border last:border-0 cursor-pointer"
                        onClick={() => togglePaci(rowKey)}
                      >
                        <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{group.paci_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{group.sabeel_no}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.floor_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.flat_no ?? '—'}</span></td>
                        <td className="px-4 py-3"><span className="text-sm">{group.building_name ?? '—'}</span></td>
                        <td className="px-4 py-3">
                          {group.hof_name
                            ? <span className="text-sm font-medium">{group.hof_name}</span>
                            : <span className="text-sm text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                            {group.members.length}
                          </span>
                        </td>
                        {showSector && <td className="px-4 py-3"><span className="text-sm">{group.sector_name}</span></td>}
                        <td className="px-4 py-3"><span className="text-sm">{group.subsector_name}</span></td>
                        <td className="px-4 py-3 text-right" onClick={e => { e.stopPropagation(); togglePaci(rowKey) }}>
                          <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                      </tr> */}

                      {isExpanded && (
                        <tr key={`${rowKey}-expanded`}>
                          <td colSpan={paciColSpan} className="px-0 py-0 bg-muted/10 border-b border-border">
                            <div className="px-6 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="pb-1.5 pr-4 font-medium">ITS No</th>
                                    <th className="pb-1.5 pr-4 font-medium">Name</th>
                                    <th className="pb-1.5 pr-4 font-medium">Gender</th>
                                    <th className="pb-1.5 pr-4 font-medium">Balig</th>
                                    <th className="pb-1.5 font-medium text-right">View</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedGroupMembers.map(m => (
                                    <tr key={m.its_no} className="border-t border-border/50">
                                      <td className="py-1.5 pr-4 font-mono text-muted-foreground">{m.its_no}</td>
                                      <td className="py-1.5 pr-4 font-medium">
                                        {m.name}
                                        {m.its_no === group.head_its_no && <HeadBadge />}
                                      </td>
                                      <td className="py-1.5 pr-4"><GenderPill gender={m.gender} /></td>
                                      <td className="py-1.5 pr-4"><BaligBadge status={m.balig_status} /></td>
                                      <td className="py-1.5 text-right">
                                        <Link
                                          href={`/members/${m.its_no}`}
                                          className="font-medium text-orange-600 hover:text-orange-700 transition-colors"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          View →
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile PACI cards */}
          <div className="md:hidden divide-y divide-border">
            {paciPage.map((group, idx) => {
              const rowKey = group.paci_no ?? group.sabeel_no
              const isExpanded = expandedPaci.has(rowKey)
              const sortedGroupMembers = [...group.members].sort(
                (a, b) => (b.its_no === group.head_its_no ? 1 : 0) - (a.its_no === group.head_its_no ? 1 : 0)
              )
              return (
                <div key={rowKey + idx} className="hover:bg-muted/30 transition-colors">
                  <button className="w-full text-left p-4" onClick={() => togglePaci(rowKey)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{group.hof_name ?? '—'}</span>
                          <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                            {group.members.length}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">
                          PACI: {group.paci_no ?? '—'} · Sabeel: {group.sabeel_no}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Floor {group.floor_no ?? '—'} · Flat {group.flat_no ?? '—'}
                          {group.building_name ? ` · ${group.building_name}` : ''}
                        </p>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {sortedGroupMembers.map(m => (
                        <div key={m.its_no} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium truncate">{m.name}</span>
                            {m.its_no === group.head_its_no && <HeadBadge />}
                          </div>
                          <Link
                            href={`/members/${m.its_no}`}
                            className="flex-shrink-0 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Member View ───────────────────────────────────────────────────── */}
      {
        (viewMode === 'member' || isMumin) && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <SortTh col="its_no" label="ITS No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="name" label="Name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    {isStaff && (
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                        Head of Family
                      </th>
                    )}
                    <SortTh col="gender" label="Gender" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="balig_status" label="Balig" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    {isStaff && <SortTh col="phone" label="Phone" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="paci_no" label="PACI No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="floor_no" label="Floor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="flat_no" label="Flat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="sabeel_no" label="Sabeel" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="landmark" label="Landmark" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {showSector && <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    <SortTh col="status" label="Status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {memberPage.map(member => {
                    const isHead = member.its_no === member.head_its_no
                    return (
                      <tr key={member.its_no} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{member.its_no}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{member.name}</span>
                          {isHead && <HeadBadge />}
                        </td>
                        {isStaff && (
                          <td className="px-4 py-3">
                            {!isHead && member.hof_name
                              ? <span className="text-sm text-muted-foreground">{member.hof_name}</span>
                              : <span className="text-sm text-muted-foreground">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3"><GenderPill gender={member.gender} /></td>
                        <td className="px-4 py-3"><BaligBadge status={member.balig_status} /></td>
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.phone ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.paci_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.floor_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.flat_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.sabeel_no}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{member.landmark ?? '—'}</span></td>}
                        {showSector && <td className="px-4 py-3"><span className="text-sm">{member.sector_name}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.subsector_name}</span></td>}
                        <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/members/${member.its_no}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile member cards */}
            <div className="md:hidden divide-y divide-border">
              {memberPage.map(member => {
                const isHead = member.its_no === member.head_its_no
                return (
                  <div key={member.its_no} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {member.name}
                          {isHead && <HeadBadge />}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{member.its_no}</p>
                        {isStaff && !isHead && member.hof_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">HoF: {member.hof_name}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <StatusBadge status={member.status} />
                          <BaligBadge status={member.balig_status} />
                          <GenderPill gender={member.gender} />
                        </div>
                        {isStaff && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {member.subsector_name}{member.paci_no ? ` · PACI ${member.paci_no}` : ''}
                          </p>
                        )}
                      </div>
                      <Link href={`/members/${member.its_no}`}
                        className="flex-shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-0.5">
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      }

      <Pagination page={page} total={totalItems} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}