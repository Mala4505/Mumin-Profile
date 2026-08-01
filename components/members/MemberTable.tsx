'use client'

import { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import {
  Users, ChevronUp, ChevronDown, ChevronRight, FilePlus,
  ChevronsUpDown, LayoutList, Hash, Search,
} from 'lucide-react'
import type { MemberListItem, Role } from '@/lib/types/app'
import { EditMemberModal } from './EditMemberModal'
import {
  BaligPill,
  GenderPill,
  HeadBadge,
  MemberIdentity,
  MemberStatusBadge,
} from './MemberPrimitives'


interface MemberTableProps {
  members: MemberListItem[]
  role: Role
  mode: 'idle' | 'loaded'
}

const PAGE_SIZE = 25

/**
 * Sticky first column on the wide member table. The `before:` layer reproduces
 * the row tint *behind* the cell content while `bg-card` keeps the cell opaque
 * so horizontally-scrolled columns never bleed through.
 */
const STICKY_TH =
  'sticky left-0 z-20 bg-card border-r border-border before:absolute before:inset-0 before:-z-10 before:bg-muted/40'
const STICKY_TD =
  'sticky left-0 z-10 bg-card border-r border-border before:absolute before:inset-0 before:-z-10 group-hover:before:bg-muted/30'

/** Row action button/link chrome — visible on touch, hover-revealed on desktop. */
const ROW_ACTION =
  'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-opacity px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground'

/** Same chrome for the mobile cards, where nothing is hover-revealed. */
const CARD_ACTION =
  'inline-flex items-center justify-center min-h-11 sm:min-h-9 px-4 rounded-md border border-border text-sm sm:text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors'

/** Touch-sized inline "View" link used on the mobile cards. */
const MOBILE_VIEW_LINK =
  'shrink-0 inline-flex items-center min-h-11 px-3 py-2 -mr-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors'

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

/** 44px touch target on phones, compact 36px from `sm:` upward. */
const PAGE_BTN =
  'inline-flex items-center justify-center h-11 min-w-11 sm:h-9 sm:min-w-9 text-sm rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

function Pagination({ page, total, pageSize, onPage }: {
  page: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/10">
      <span className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} aria-label="First page"
          className={PAGE_BTN}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className={`${PAGE_BTN} px-3`}>Prev</button>
        <span className="inline-flex items-center justify-center h-11 min-w-11 sm:h-9 sm:min-w-9 px-3 text-sm font-medium bg-primary text-primary-foreground rounded">{page}</span>
        <span className="text-sm text-muted-foreground px-1">/ {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className={`${PAGE_BTN} px-3`}>Next</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} aria-label="Last page"
          className={PAGE_BTN}>»</button>
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
  const [editMember, setEditMember] = useState<MemberListItem | null>(null)

  const isMumin = role === 'Mumin'
  const isStaff = role !== 'Mumin'
  const showSector = role === 'SuperAdmin' || role === 'Admin'
  const showMasool = isStaff
  const showMusaid = isStaff
  const canEdit = role === 'SuperAdmin' || role === 'Admin'

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
  // PACI header columns: paci_no, sabeel_no, floor, flat, building, Head of
  // Family, Count, [Sector], Subsector, Request, chevron → 11 with sector, 10 without.
  const paciColSpan = showSector ? 11 : 10

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
          <div className="hidden lg:block overflow-x-auto">
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
                                        <span className="inline-flex items-center gap-1.5">
                                          {m.name}
                                          {m.its_no === group.head_its_no && <HeadBadge />}
                                        </span>
                                      </td>
                                      <td className="py-1.5 pr-4"><GenderPill gender={m.gender} /></td>
                                      <td className="py-1.5 pr-4"><BaligPill status={m.balig_status} /></td>
                                      <td className="py-1.5 text-right">
                                        <Link
                                          href={`/members/${m.its_no}`}
                                          className="font-medium text-primary hover:text-primary/80 transition-colors"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          View
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

          {/* Mobile / tablet PACI cards */}
          <div className="lg:hidden divide-y divide-border">
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
                          <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
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
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
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
                            className={MOBILE_VIEW_LINK}
                            onClick={e => e.stopPropagation()}
                          >
                            View
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
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th
                      className={`text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap ${STICKY_TH}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
                      >
                        Name
                        <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                      </button>
                      <span className="mx-1.5 text-muted-foreground/40">/</span>
                      <button
                        type="button"
                        onClick={() => handleSort('its_no')}
                        className="uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
                      >
                        ITS
                        <SortIcon col="its_no" sortCol={sortCol} sortDir={sortDir} />
                      </button>
                    </th>
                    {isStaff && (
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                        Head of Family
                      </th>
                    )}
                    {isStaff && <SortTh col="head_its_no" label="Hof ITs" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="building_name" label="Building" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    <SortTh col="gender" label="Gender" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="balig_status" label="Balig" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    {isStaff && <SortTh col="phone" label="Phone" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="paci_no" label="PACI No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="floor_no" label="Floor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="flat_no" label="Flat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="sabeel_no" label="Sabeel" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {showSector && <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {isStaff && <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {showMasool && <SortTh col="masool_name" label="Masool" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                    {showMusaid && <SortTh col="musaid_names" label="Musaid" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
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
                      <tr key={member.its_no} className="group hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                        <td className={`px-4 py-3 ${STICKY_TD}`}>
                          <div className="flex items-center gap-1.5">
                            <MemberIdentity name={member.name} itsNo={member.its_no} size="sm" />
                            {isHead && <HeadBadge />}
                          </div>
                        </td>
                        {isStaff && (
                          <td className="px-4 py-3">
                            {!isHead && member.hof_name
                              ? <span className="text-sm text-muted-foreground">{member.hof_name}</span>
                              : <span className="text-sm text-muted-foreground">—</span>}
                          </td>
                        )}
                        {isStaff && (
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {member.head_its_no ?? '—'}
                            </span>
                          </td>
                        )}
                        {isStaff && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{member.building_name ?? '—'}</span>
                          </td>
                        )}
                        <td className="px-4 py-3"><GenderPill gender={member.gender} /></td>
                        <td className="px-4 py-3"><BaligPill status={member.balig_status} /></td>
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.phone ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.paci_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.floor_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.flat_no ?? '—'}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.sabeel_no}</span></td>}
                        {showSector && <td className="px-4 py-3"><span className="text-sm">{member.sector_name}</span></td>}
                        {isStaff && <td className="px-4 py-3"><span className="text-sm">{member.subsector_name}</span></td>}
                        {showMasool && <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{member.masool_name ?? '—'}</span></td>}
                        {showMusaid && <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{member.musaid_names ?? '—'}</span></td>}
                        <td className="px-4 py-3"><MemberStatusBadge status={member.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button onClick={() => setEditMember(member)} className={ROW_ACTION}>
                                Edit
                              </button>
                            )}
                            {isStaff && (
                              <Link href={`/requests?search=${member.sabeel_no}`} className={ROW_ACTION}>
                                Request
                              </Link>
                            )}
                            <Link
                              href={`/members/${member.its_no}`}
                              className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet member cards */}
            <div className="lg:hidden divide-y divide-border">
              {memberPage.map(member => {
                const isHead = member.its_no === member.head_its_no
                return (
                  <div key={member.its_no} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <MemberIdentity name={member.name} itsNo={member.its_no} size="sm" />
                          {isHead && <HeadBadge />}
                        </div>
                        {isStaff && !isHead && member.hof_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">HoF: {member.hof_name}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <MemberStatusBadge status={member.status} />
                          <BaligPill status={member.balig_status} />
                          <GenderPill gender={member.gender} />
                        </div>
                        {isStaff && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {member.subsector_name}{member.paci_no ? ` · PACI ${member.paci_no}` : ''}
                          </p>
                        )}
                        {(showMasool && member.masool_name) && (
                          <p className="text-xs text-muted-foreground mt-0.5">Masool: {member.masool_name}</p>
                        )}
                        {(showMusaid && member.musaid_names) && (
                          <p className="text-xs text-muted-foreground mt-0.5">Musaid: {member.musaid_names}</p>
                        )}
                      </div>
                      <Link href={`/members/${member.its_no}`} className={MOBILE_VIEW_LINK}>
                        View
                      </Link>
                    </div>

                    {(canEdit || isStaff) && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {canEdit && (
                          <button onClick={() => setEditMember(member)} className={CARD_ACTION}>
                            Edit
                          </button>
                        )}
                        {isStaff && (
                          <Link href={`/requests?search=${member.sabeel_no}`} className={CARD_ACTION}>
                            Request
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )
      }

      <Pagination page={page} total={totalItems} pageSize={PAGE_SIZE} onPage={setPage} />

      {editMember && (
        <EditMemberModal
          open={!!editMember}
          onOpenChange={(open) => { if (!open) setEditMember(null) }}
          itsNo={editMember.its_no}
          initial={{
            name: editMember.name,
            gender: editMember.gender,
            balig_status: editMember.balig_status,
            phone: editMember.phone ?? '',
            status: editMember.status,
          }}
          initialAddress={role === 'SuperAdmin' ? {
            subsector_id: String(editMember.subsector_id),
            building_name: editMember.building_name ?? '',
            floor_no: editMember.floor_no ?? '',
            flat_no: editMember.flat_no ?? '',
            paci_no: editMember.paci_no ?? '',
          } : undefined}
          onSaved={() => { setEditMember(null); window.location.reload() }}
        />
      )}
    </div>
  )
}