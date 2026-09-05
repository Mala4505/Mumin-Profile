'use client'

import { useState, useMemo, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Users, ChevronUp, ChevronDown, ChevronRight, FilePlus, MoveRight,
  ChevronsUpDown, LayoutList, Hash, Search,
} from 'lucide-react'
import type { MemberListItem, Role } from '@/lib/types/app'
import { EditMemberModal } from './EditMemberModal'
import { MoveHouseholdPanel, type MoveSource } from './MoveHouseholdPanel'
import {
  BaligPill,
  Chip,
  GenderPill,
  HeadBadge,
  MemberIdentity,
  MemberStatusBadge,
} from './MemberPrimitives'

/**
 * "Move pending" tone — distinct from every status/gender/balig chip already
 * rendered in this table (green/gray/blue/red/yellow for status, blue/pink for
 * gender, orange for balig/HoF), so it never gets mistaken for one of those.
 */
const MOVE_PENDING_TONE = 'bg-violet-100 text-violet-700 border-violet-200'
const MOVE_PENDING_TITLE = 'An address change request is open for this family.'


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

/**
 * `'0'` shows up in the data as a placeholder for "no address assigned yet"
 * — but it's a non-empty string, so a plain truthy/`??` check treats it as a
 * real, shared PACI. That silently grouped every family still sitting on
 * that placeholder into one "flat," and moving any one of them (via the
 * PACI-grouped row's "move this flat" action) swept all the others along
 * too. Treat it, and blank strings, the same as null everywhere a paci_no
 * decides grouping or move-type.
 */
function hasRealPaci(paciNo: string | null): paciNo is string {
  return paciNo !== null && paciNo.trim() !== '' && paciNo.trim() !== '0'
}

/**
 * The row identity used for expand/collapse and bulk-select state. In
 * 'sabeel' mode this is always the sabeel_no — never the paci_no — because
 * two different sabeel groups can legitimately share one real PACI (genuine
 * flatmates), and keying by that shared value would collide their
 * checked/expanded state together. 'paci' mode keeps the existing fallback
 * (a group with no real PACI on file falls back to its sabeel_no).
 */
function rowKeyFor(g: PaciGroup, mode: 'sabeel' | 'paci' | 'member'): string {
  if (mode === 'sabeel') return g.sabeel_no
  return hasRealPaci(g.paci_no) ? g.paci_no : g.sabeel_no
}

function groupByPaci(members: MemberListItem[]): PaciGroup[] {
  const map = new Map<string, PaciGroup>()
  for (const m of members) {
    const key = hasRealPaci(m.paci_no) ? m.paci_no : `no-paci-${m.sabeel_no}`
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

/**
 * Same row shape as `groupByPaci`, grouped by `sabeel_no` instead — one row
 * per household, always, regardless of whether it shares a PACI with anyone
 * else. Unlike the PACI grouping, this key is never ambiguous (no placeholder
 * value to fall back from), so every row here maps to exactly one family and
 * its Move action never needs — or offers — a "move this flat" branch.
 */
function groupBySabeel(members: MemberListItem[]): PaciGroup[] {
  const map = new Map<string, PaciGroup>()
  for (const m of members) {
    if (!map.has(m.sabeel_no)) {
      map.set(m.sabeel_no, {
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
    map.get(m.sabeel_no)!.members.push(m)
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [viewMode, setViewMode] = useState<'sabeel' | 'paci' | 'member'>('sabeel')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [expandedPaci, setExpandedPaci] = useState<Set<string>>(new Set())
  const [editMember, setEditMember] = useState<MemberListItem | null>(null)
  // Moves are SuperAdmin-only for now — the write path 403s for anyone else,
  // Masool/Musaid get a request-based flow in a later phase not yet built.
  const canMove = role === 'SuperAdmin'
  // Deep-link: `?move=<sabeel_no>` opens the move panel for that household on
  // mount (e.g. a link from elsewhere in the app), same as the row action.
  // Gated on `canMove` so a non-SuperAdmin hitting this URL directly doesn't
  // get the panel populated (its GETs are staff-accessible) only to 403 on submit.
  const [moveSource, setMoveSource] = useState<MoveSource | null>(() => {
    if (!canMove) return null
    const deepLink = searchParams.get('move')
    return deepLink ? { type: 'sabeel', sabeelNo: deepLink } : null
  })
  // Part A — "Move pending" badge: fetched once client-side, same fetch-on-mount
  // + swallow-errors pattern MemberFiltersBar already uses for /api/members/filters.
  const [movePendingSet, setMovePendingSet] = useState<Set<string>>(new Set())
  useEffect(() => {
    fetch('/api/requests/open-address-sabeels')
      .then((r) => r.json())
      .then((d) => setMovePendingSet(new Set(d.sabeel_nos ?? [])))
      .catch(() => {})
  }, [])
  // Part C — bulk selection, flat/paci view only, SuperAdmin-gated below.
  // Keyed by the same `rowKey` each paci row already uses (paci_no, or
  // `sabeel_no` for the null-paci fallback case).
  const [selectedPaci, setSelectedPaci] = useState<Set<string>>(new Set())

  const isMumin = role === 'Mumin'
  const isStaff = role !== 'Mumin'
  const showSector = role === 'SuperAdmin' || role === 'Admin'
  const showMasool = isStaff
  const showMusaid = isStaff
  const canEdit = role === 'SuperAdmin' || role === 'Admin'

  // Mirror the panel's open/closed state into the URL so it's linkable and
  // survives a refresh. Only the sabeel-sourced case has a URL representation
  // (`?move=<sabeel_no>`); a whole-flat PACI move just clears the param on close.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (moveSource?.type === 'sabeel') params.set('move', moveSource.sabeelNo)
    else params.delete('move')
    const next = params.toString()
    if (next !== searchParams.toString()) {
      router.replace(`${pathname}${next ? `?${next}` : ''}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSource])

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
  const sabeelGroups = useMemo(() => groupBySabeel(members), [members])
  // The grouped-table UI (desktop table + mobile cards, sorting, expand,
  // bulk-select, Move) is shared by both grouping modes — only the grouping
  // key and the Move button's flat-vs-household branch differ between them.
  const activeGroups = viewMode === 'sabeel' ? sabeelGroups : paciGroups
  const sortedPaci = useMemo(() => sortPaciGroups(activeGroups, sortCol, sortDir), [activeGroups, sortCol, sortDir])
  const paciPage = useMemo(() => sortedPaci.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedPaci, page])

  // Every sabeel_no behind the selected rows. A group's own `sabeel_no` field
  // only reflects the first member folded into it — a flat shared by multiple
  // families (paci mode) needs every member's sabeel_no, deduped. (In sabeel
  // mode every group is already exactly one family, so this is a no-op there.)
  const bulkSabeelNos = useMemo(() => {
    const set = new Set<string>()
    for (const g of activeGroups) {
      if (selectedPaci.has(rowKeyFor(g, viewMode))) {
        for (const m of g.members) set.add(m.sabeel_no)
      }
    }
    return [...set]
  }, [activeGroups, selectedPaci, viewMode])

  function clearSelection() {
    setSelectedPaci(new Set())
  }

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

  const totalItems = viewMode === 'sabeel' || viewMode === 'paci' ? activeGroups.length : members.length
  // PACI header columns: [checkbox], paci_no, sabeel_no, floor, flat, building,
  // Head of Family, Count, [Sector], Subsector, Request, [Move], chevron → 10
  // base, +1 for Sector (SuperAdmin/Admin), +2 for Move + checkbox (SuperAdmin only).
  const paciColSpan = 10 + (showSector ? 1 : 0) + (canMove ? 2 : 0)
  const allPaciOnPageSelected =
    paciPage.length > 0 && paciPage.every((g) => selectedPaci.has(rowKeyFor(g, viewMode)))

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-medium">
          {viewMode === 'sabeel'
            ? `${sabeelGroups.length} household${sabeelGroups.length !== 1 ? 's' : ''} (${members.length} member${members.length !== 1 ? 's' : ''})`
            : viewMode === 'paci'
              ? `${paciGroups.length} flat${paciGroups.length !== 1 ? 's' : ''} (${members.length} member${members.length !== 1 ? 's' : ''})`
              : `${members.length} member${members.length !== 1 ? 's' : ''}`}
        </span>
        {isStaff && (
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border">
            <button
              onClick={() => { setViewMode('sabeel'); setPage(1) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'sabeel' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              By Sabeel
            </button>
            <button
              onClick={() => { setViewMode('paci'); setPage(1) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'paci' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Hash className="w-3.5 h-3.5" />
              By PACI
            </button>
          </div>
        )}
      </div>

      {/* ── Grouped view (By Sabeel / By PACI) ──────────────────────────────── */}
      {(viewMode === 'sabeel' || viewMode === 'paci') && isStaff && (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {canMove && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allPaciOnPageSelected}
                        onChange={(e) => {
                          setSelectedPaci((prev) => {
                            const next = new Set(prev)
                            for (const g of paciPage) {
                              const key = rowKeyFor(g, viewMode)
                              if (e.target.checked) next.add(key)
                              else next.delete(key)
                            }
                            return next
                          })
                        }}
                        aria-label="Select all flats on this page"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
                      />
                    </th>
                  )}
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
                  {canMove && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Move
                    </th>
                  )}

                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paciPage.map((group, idx) => {
                  const rowKey = rowKeyFor(group, viewMode)
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
                        {canMove && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedPaci.has(rowKey)}
                              onChange={(e) => {
                                setSelectedPaci((prev) => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(rowKey)
                                  else next.delete(rowKey)
                                  return next
                                })
                              }}
                              aria-label={`Select flat ${rowKey}`}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{group.paci_no ?? '—'}</span></td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-xs text-muted-foreground">{group.sabeel_no}</span>
                            {group.members.some((m) => movePendingSet.has(m.sabeel_no)) && (
                              <Chip tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>Move pending</Chip>
                            )}
                          </span>
                        </td>
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

                        {/* Move button column — the flat is the movable unit, so a
                            PACI-grouped row moves the whole flat (every family on
                            it) at once; a flat with no PACI on file yet (not
                            really "a flat" so much as one unplaced family) falls
                            back to moving just that household by sabeel_no. */}
                        {canMove && (
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() =>
                                setMoveSource(
                                  // 'sabeel' mode groups by household, never by
                                  // address, so every row here is exactly one
                                  // family regardless of what its paci_no is —
                                  // the whole-flat branch only applies in 'paci'
                                  // mode, where a row can genuinely be shared.
                                  viewMode === 'paci' && hasRealPaci(group.paci_no)
                                    ? { type: 'paci', paciNo: group.paci_no }
                                    : { type: 'sabeel', sabeelNo: group.sabeel_no },
                                )
                              }
                              className="inline-flex items-center justify-center p-1 rounded hover:bg-muted/50 transition-colors"
                              title={viewMode === 'paci' && hasRealPaci(group.paci_no) ? 'Move this flat' : 'Move this household'}
                              aria-label={viewMode === 'paci' && hasRealPaci(group.paci_no) ? 'Move this flat' : 'Move this household'}
                            >
                              <MoveRight className="w-4 h-4 text-primary" />
                            </button>
                          </td>
                        )}

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
              const rowKey = rowKeyFor(group, viewMode)
              const isExpanded = expandedPaci.has(rowKey)
              const sortedGroupMembers = [...group.members].sort(
                (a, b) => (b.its_no === group.head_its_no ? 1 : 0) - (a.its_no === group.head_its_no ? 1 : 0)
              )
              return (
                <div key={rowKey + idx} className="hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2 p-4">
                    {canMove && (
                      <input
                        type="checkbox"
                        checked={selectedPaci.has(rowKey)}
                        onChange={(e) => {
                          setSelectedPaci((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(rowKey)
                            else next.delete(rowKey)
                            return next
                          })
                        }}
                        aria-label={`Select flat ${rowKey}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
                      />
                    )}
                    <button className="flex-1 min-w-0 text-left" onClick={() => togglePaci(rowKey)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm truncate">{group.hof_name ?? '—'}</span>
                            <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                              {group.members.length}
                            </span>
                            {group.members.some((m) => movePendingSet.has(m.sabeel_no)) && (
                              <Chip tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>Move pending</Chip>
                            )}
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
                  </div>
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
                            {movePendingSet.has(member.sabeel_no) && (
                              <Chip tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>Move pending</Chip>
                            )}
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
                            {canMove && (
                              <button
                                onClick={() => setMoveSource({ type: 'sabeel', sabeelNo: member.sabeel_no })}
                                className={ROW_ACTION}
                              >
                                Move
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
                        <div className="flex flex-wrap items-start gap-1.5">
                          <MemberIdentity name={member.name} itsNo={member.its_no} size="sm" />
                          {isHead && <HeadBadge />}
                          {movePendingSet.has(member.sabeel_no) && (
                            <Chip tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>Move pending</Chip>
                          )}
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

                    {(canEdit || canMove || isStaff) && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {canEdit && (
                          <button onClick={() => setEditMember(member)} className={CARD_ACTION}>
                            Edit
                          </button>
                        )}
                        {canMove && (
                          <button
                            onClick={() => setMoveSource({ type: 'sabeel', sabeelNo: member.sabeel_no })}
                            className={CARD_ACTION}
                          >
                            Move
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

      {/* Part C — sticky bulk-selection action bar. Same border/shadow weight
          as MoveHouseholdPanel's own container chrome (border-t + shadow-2xl). */}
      {canMove && (viewMode === 'sabeel' || viewMode === 'paci') && selectedPaci.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-2xl sm:px-6">
          <span className="text-sm font-medium text-foreground">
            {selectedPaci.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setMoveSource({ type: 'bulk', sabeelNos: bulkSabeelNos })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <MoveRight className="w-3.5 h-3.5" />
              Move to…
            </button>
          </div>
        </div>
      )}

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
          onSaved={() => { setEditMember(null); window.location.reload() }}
        />
      )}

      {canMove && moveSource && (
        <MoveHouseholdPanel
          open={!!moveSource}
          onOpenChange={(open) => { if (!open) { setMoveSource(null); clearSelection() } }}
          source={moveSource}
          onMoved={() => { setMoveSource(null); clearSelection(); window.location.reload() }}
        />
      )}
    </div>
  )
}