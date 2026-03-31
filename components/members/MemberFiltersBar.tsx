'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown, X, Eye } from 'lucide-react'
import type { MemberFilters, Role } from '@/lib/types/app'

interface Props {
  sectors: Array<{ sector_id: number; sector_name: string }>
  currentFilters: MemberFilters
  role: Role
  showAll?: boolean
}

const selectClass =
  'appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer'

type PillGroup = {
  key: string
  options: Array<{ label: string; value: string }>
}

const PILL_GROUPS: PillGroup[] = [
  {
    key: 'gender',
    options: [
      { label: 'Male', value: 'M' },
      { label: 'Female', value: 'F' },
    ],
  },
  {
    key: 'balig_status',
    options: [
      { label: 'Balig', value: 'Balig' },
      { label: 'Ghair Balig', value: 'Ghair Balig' },
    ],
  },
  {
    key: 'status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Deceased', value: 'deceased' },
      { label: 'Relocated', value: 'relocated' },
      { label: 'Left', value: 'left_community' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
]

export function MemberFiltersBar({ sectors, currentFilters, role, showAll = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(currentFilters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      if (key === 'sector_id') params.delete('subsector_id')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  function togglePill(key: string, value: string) {
    const current = searchParams.get(key)
    updateFilter(key, current === value ? '' : value)
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateFilter('search', searchValue)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const clearAll = () => {
    setSearchValue('')
    router.push(pathname)
  }

  const hasFilters =
    Object.values(currentFilters).some((v) => v !== undefined && v !== '') || searchValue !== ''

  const showSectorFilter = role === 'SuperAdmin' || role === 'Admin'

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm space-y-3">
      {/* Top row: search + dropdowns */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Filter label */}
        <div className="flex items-center gap-1.5 text-muted-foreground self-center">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Filters
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, ITS, phone, Sabeel, PACI..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>

        {/* Sector — SuperAdmin and Admin */}
        {showSectorFilter && (
          <div className="relative">
            <select
              value={currentFilters.sector_id ?? ''}
              onChange={(e) => updateFilter('sector_id', e.target.value)}
              className={selectClass}
            >
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.sector_id} value={s.sector_id}>
                  {s.sector_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Status dropdown */}
        <div className="relative">
          <select
            value={currentFilters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className={selectClass}
          >
            <option value="">Active only</option>
            <option value="active">Active</option>
            <option value="deceased">Deceased</option>
            <option value="relocated">Relocated</option>
            <option value="left_community">Left Community</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* View All */}
        {!showAll && (
          <a
            href="/members?show_all=1"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View All
          </a>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Quick-filter pills row */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        {PILL_GROUPS.map((group) => {
          const activeVal = searchParams.get(group.key)
          return (
            <div key={group.key} className="flex items-center gap-1 flex-wrap">
              {group.options.map((opt) => {
                const isActive = activeVal === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => togglePill(group.key, opt.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
              {/* Divider between groups */}
              <span className="text-border text-xs select-none">|</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
