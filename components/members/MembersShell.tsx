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
function MemberTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-pulse">
      {/* toolbar row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="h-3.5 w-32 bg-muted rounded" />
        <div className="h-7 w-36 bg-muted rounded-lg" />
      </div>
      {/* header */}
      <div className="hidden md:flex gap-4 px-4 py-3 border-b border-border bg-muted/40">
        {[80, 160, 60, 60, 100, 120, 60, 100, 80, 60].map((w, i) => (
          <div key={i} className="h-3 bg-muted rounded flex-shrink-0" style={{ width: w }} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="hidden md:flex gap-4 px-4 py-3 border-b border-border last:border-0 items-center"
        >
          {[80, 160, 60, 60, 100, 120, 60, 100, 80, 60].map((w, j) => (
            <div
              key={j}
              className="h-3.5 bg-muted rounded flex-shrink-0"
              style={{ width: w, opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
      ))}
      {/* mobile rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="md:hidden p-4 border-b border-border last:border-0 space-y-2">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-muted rounded-full" />
            <div className="h-5 w-14 bg-muted rounded-full" />
          </div>
        </div>
      ))}
      {/* pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-10 bg-muted rounded" />
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