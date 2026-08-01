'use client'

import { useTransition } from 'react'
import { MemberFiltersBar } from './MemberFiltersBar'
import { MemberTable } from './MemberTable'
import type { MemberListItem, MemberFilters, Role } from '@/lib/types/app'

interface Props {
  members: MemberListItem[]
  filters: MemberFilters
  role: Role
  showAll: boolean
  mode: 'idle' | 'loaded'
}

// ── Skeleton shown while server is re-fetching ────────────────────────────────

/**
 * Fluid column widths for the desktop skeleton. Fixed pixel widths used to add
 * up to ~880px and blew out of the content column at tablet sizes.
 */
const COL_WIDTHS = [
  'basis-[14%]',
  'basis-[22%]',
  'basis-[9%]',
  'basis-[9%]',
  'basis-[14%]',
  'basis-[16%]',
  'basis-[8%]',
  'basis-[14%]',
  'basis-[12%]',
  'basis-[8%]',
]

function MemberTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-pulse">
      {/* toolbar row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="h-3.5 w-32 bg-muted rounded" />
        <div className="h-7 w-36 bg-muted rounded-lg" />
      </div>
      {/* header — fluid columns, never wider than the container */}
      <div className="hidden lg:flex gap-4 px-4 py-3 border-b border-border bg-muted/40">
        {COL_WIDTHS.map((w, i) => (
          <div key={i} className={`h-3 bg-muted rounded shrink ${w}`} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="hidden lg:flex gap-4 px-4 py-3 border-b border-border last:border-0 items-center"
        >
          {COL_WIDTHS.map((w, j) => (
            <div
              key={j}
              className={`h-3.5 bg-muted rounded shrink ${w}`}
              style={{ opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
      ))}
      {/* mobile / tablet rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="lg:hidden p-4 border-b border-border last:border-0 space-y-2">
          <div className="h-4 w-1/2 max-w-40 bg-muted rounded" />
          <div className="h-3 w-1/3 max-w-24 bg-muted rounded" />
          <div className="flex flex-wrap gap-2">
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="h-5 w-14 bg-muted rounded-full" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        </div>
      ))}
      {/* pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/10">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-11 sm:h-9 sm:w-9 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MembersShell({ members, filters, role, showAll, mode }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <MemberFiltersBar
        currentFilters={filters}
        role={role}
        showAll={showAll}
        isPending={isPending}
        startTransition={startTransition}
      />
      {isPending
        ? <MemberTableSkeleton />
        : <MemberTable members={members} role={role} mode={mode} />}
    </>
  )
}