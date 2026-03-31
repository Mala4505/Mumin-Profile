'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, ChevronUp, ChevronDown, ChevronsUpDown, LayoutList, Hash, Search } from 'lucide-react'
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

// ─── Sort helpers ───────────────────────────────────────────────────────────

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

// ─── Pagination ─────────────────────────────────────────────────────────────

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
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
          {page}
        </span>
        <span className="text-xs text-muted-foreground">/ {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          »
        </button>
      </div>
    </div>
  )
}

// ─── PACI grouped row type ───────────────────────────────────────────────────

interface PaciGroup {
  paci_no: string | null
  sabeel_no: string
  floor_no: string | null
  flat_no: string | null
  building_name: string | null
  landmark: string | null
  subsector_name: string
  sector_name: string
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
        members: [],
      })
    }
    map.get(key)!.members.push(m)
  }
  return [...map.values()]
}

function sortPaciGroups(groups: PaciGroup[], col: string, dir: SortDir): PaciGroup[] {
  return [...groups].sort((a, b) => {
    let av: string, bv: string
    if (col === 'member_count') {
      av = String(a.members.length)
      bv = String(b.members.length)
    } else {
      av = String((a as any)[col] ?? '')
      bv = String((b as any)[col] ?? '')
    }
    const cmp = av.localeCompare(bv, undefined, { numeric: true })
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Main component ─────────────────────────────────────────────────────────

export function MemberTable({ members, role, mode }: MemberTableProps) {
  const [viewMode, setViewMode] = useState<'paci' | 'member'>('paci')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const isMumin = role === 'Mumin'
  const isStaff = role !== 'Mumin'
  const showSector = role === 'SuperAdmin' || role === 'Admin'

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(1)
  }

  // ── Member view ──────────────────────────────────────────────────────────
  const sortedMembers = useMemo(() => sortMembers(members, sortCol, sortDir), [members, sortCol, sortDir])
  const memberPage = useMemo(() => sortedMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedMembers, page])

  // ── PACI view ────────────────────────────────────────────────────────────
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
          <a
            href="/members?show_all=1"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header row: count + view toggle */}
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

      {/* ── PACI View ──────────────────────────────────────────────────────── */}
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
                  <SortTh col="landmark" label="Landmark" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="member_count" label="Members" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  {showSector && (
                    <SortTh col="sector_name" label="Sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  )}
                  <SortTh col="subsector_name" label="Subsector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paciPage.map((group, idx) => (
                  <tr key={group.paci_no ?? idx} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{group.paci_no ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{group.sabeel_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{group.floor_no ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{group.flat_no ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{group.building_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{group.landmark ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {group.members.map(m => (
                          <span key={m.its_no} className="text-xs text-foreground">{m.name}</span>
                        ))}
                      </div>
                    </td>
                    {showSector && (
                      <td className="px-4 py-3">
                        <span className="text-sm">{group.sector_name}</span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="text-sm">{group.subsector_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {group.members.map(m => (
                          <Link
                            key={m.its_no}
                            href={`/members/${m.its_no}`}
                            className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            {m.name.split(' ')[0]} →
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile PACI cards */}
          <div className="md:hidden divide-y divide-border">
            {paciPage.map((group, idx) => (
              <div key={group.paci_no ?? idx} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">PACI: {group.paci_no ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Sabeel: {group.sabeel_no} · Floor {group.floor_no ?? '—'} · Flat {group.flat_no ?? '—'}</p>
                    {group.building_name && <p className="text-xs text-muted-foreground mt-0.5">{group.building_name}{group.landmark ? ` — ${group.landmark}` : ''}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.members.map(m => (
                        <Link key={m.its_no} href={`/members/${m.its_no}`} className="text-xs font-medium text-orange-600 hover:text-orange-700">
                          {m.name} →
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Member View (also default for Mumin) ──────────────────────────── */}
      {(viewMode === 'member' || isMumin) && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh col="its_no" label="ITS No" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="name" label="Name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
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
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {memberPage.map(member => (
                  <tr key={member.its_no} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{member.its_no}</span></td>
                    <td className="px-4 py-3"><span className="font-medium text-foreground">{member.name}</span></td>
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
                      <Link href={`/members/${member.its_no}`} className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile member cards */}
          <div className="md:hidden divide-y divide-border">
            {memberPage.map(member => (
              <div key={member.its_no} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{member.name}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{member.its_no}</p>
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
                  <Link href={`/members/${member.its_no}`} className="flex-shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-0.5">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Pagination page={page} total={totalItems} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
