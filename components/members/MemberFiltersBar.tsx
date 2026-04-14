// 'use client'

// import { useRouter, usePathname, useSearchParams } from 'next/navigation'
// import { useCallback, useEffect, useRef, useState } from 'react'
// import { Search, SlidersHorizontal, ChevronDown, X, Eye } from 'lucide-react'
// import type { MemberFilters, Role } from '@/lib/types/app'

// interface Sector {
//   sector_id: number
//   sector_name: string
// }

// interface Subsector {
//   subsector_id: number
//   subsector_name: string
//   sector_id: number
//   musaid_name: string | null
// }

// interface Musaid {
//   its_no: number
//   name: string
// }

// interface Props {
//   currentFilters: MemberFilters
//   role: Role
//   showAll?: boolean
// }

// const selectClass =
//   'appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer'

// type PillGroup = {
//   key: string
//   options: Array<{ label: string; value: string }>
// }

// const PILL_GROUPS: PillGroup[] = [
//   {
//     key: 'gender',
//     options: [
//       { label: 'Male', value: 'M' },
//       { label: 'Female', value: 'F' },
//     ],
//   },
//   {
//     key: 'balig_status',
//     options: [
//       { label: 'Balig', value: 'Balig' },
//       { label: 'Ghair Balig', value: 'Ghair Balig' },
//     ],
//   },
//   {
//     key: 'status',
//     options: [
//       { label: 'Active', value: 'active' },
//       { label: 'Deceased', value: 'deceased' },
//       { label: 'Relocated', value: 'relocated' },
//       { label: 'Left', value: 'left_community' },
//       { label: 'Inactive', value: 'inactive' },
//     ],
//   },
// ]

// export function MemberFiltersBar({ currentFilters, role, showAll = false }: Props) {
//   const router = useRouter()
//   const pathname = usePathname()
//   const searchParams = useSearchParams()

//   const [searchValue, setSearchValue] = useState(currentFilters.search ?? '')
//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

//   const [sectors, setSectors] = useState<Sector[]>([])
//   const [allSubsectors, setAllSubsectors] = useState<Subsector[]>([])
//   const [musaids, setMusaids] = useState<Musaid[]>([])

//   // Fetch sectors + subsectors + musaids from API on mount
//   useEffect(() => {
//     fetch('/api/members/filters')
//       .then((r) => r.json())
//       .then(({ sectors: s, subsectors: ss, musaids: ms }) => {
//         setSectors(s ?? [])
//         setAllSubsectors(ss ?? [])
//         setMusaids(ms ?? [])
//       })
//       .catch(() => { })
//   }, [])

//   // Subsectors filtered by currently selected sector
//   const selectedSectorId = currentFilters.sector_id
//   const filteredSubsectors = selectedSectorId
//     ? allSubsectors.filter((ss) => ss.sector_id === selectedSectorId)
//     : allSubsectors

//   const seenKeys = new Set<string>()
//   const dedupedSubsectors = filteredSubsectors.filter((ss) => {
//     const key = `${ss.subsector_id}-${ss.musaid_name ?? ''}`
//     if (seenKeys.has(key)) return false
//     seenKeys.add(key)
//     return true
//   })

//   const updateFilter = useCallback(
//     (key: string, value: string) => {
//       const params = new URLSearchParams(searchParams.toString())
//       if (value) {
//         params.set(key, value)
//       } else {
//         params.delete(key)
//       }
//       if (key === 'sector_id') params.delete('subsector_id')
//       router.push(`${pathname}?${params.toString()}`)
//     },
//     [pathname, router, searchParams],
//   )

//   function togglePill(key: string, value: string) {
//     const current = searchParams.get(key)
//     updateFilter(key, current === value ? '' : value)
//   }

//   // Debounced search
//   useEffect(() => {
//     if (debounceRef.current) clearTimeout(debounceRef.current)
//     debounceRef.current = setTimeout(() => {
//       updateFilter('search', searchValue)
//     }, 300)
//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [searchValue])

//   const clearAll = () => {
//     setSearchValue('')
//     router.push(pathname)
//   }

//   const hasFilters =
//     Object.values(currentFilters).some((v) => v !== undefined && v !== '') || searchValue !== ''

//   const showSectorFilter = role === 'SuperAdmin' || role === 'Admin' || role === 'Masool'

//   function subsectorLabel(ss: Subsector): string {
//     if (ss.musaid_name) return `${ss.subsector_name} — ${ss.musaid_name}`
//     return ss.subsector_name
//   }

//   return (
//     <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm space-y-3">
//       {/* Top row: search + dropdowns */}
//       <div className="flex flex-wrap gap-3 items-end">
//         {/* Filter label */}
//         <div className="flex items-center gap-1.5 text-muted-foreground self-center">
//           <SlidersHorizontal className="w-4 h-4" />
//           <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
//             Filters
//           </span>
//         </div>

//         {/* Search */}
//         <div className="flex-1 min-w-48 relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
//           <input
//             type="text"
//             value={searchValue}
//             onChange={(e) => setSearchValue(e.target.value)}
//             placeholder="Search by name, ITS no, Sabeel no, phone, building..."
//             className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
//           />
//         </div>

//         {/* Sector — SuperAdmin, Admin, Masool */}
//         {showSectorFilter && sectors.length > 0 && (
//           <div className="relative">
//             <select
//               value={currentFilters.sector_id ?? ''}
//               onChange={(e) => updateFilter('sector_id', e.target.value)}
//               className={selectClass}
//             >
//               <option value="">All Sectors</option>
//               {sectors.map((s) => (
//                 <option key={s.sector_id} value={s.sector_id}>
//                   {s.sector_name}
//                 </option>
//               ))}
//             </select>
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//           </div>
//         )}

//         {/* Subsector — always visible when subsectors exist */}
//         {/* {filteredSubsectors.length > 0 && ( */}
//         {dedupedSubsectors.length > 0 && (
//           <div className="relative">
//             <select
//               value={currentFilters.subsector_id ?? ''}
//               onChange={(e) => updateFilter('subsector_id', e.target.value)}
//               className={selectClass}
//             >
//               <option value="">All Subsectors</option>
//               {/* {filteredSubsectors.map((ss) => ( */}
//               {dedupedSubsectors.map((ss) => (
//                 <option key={`${ss.subsector_id}-${ss.musaid_name ?? ''}`} value={ss.subsector_id}>
//                   {subsectorLabel(ss)}
//                 </option>
//               ))}
//             </select>
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//           </div>
//         )}

//         {/* Musaid filter — hidden from table, used for filtering only */}
//         {musaids.length > 0 && (
//           <div className="relative">
//             <select
//               value={currentFilters.musaid_its_no ?? ''}
//               onChange={(e) => updateFilter('musaid_its_no', e.target.value)}
//               className={selectClass}
//             >
//               <option value="">All Musaids</option>
//               {musaids.map((m) => (
//                 <option key={m.its_no} value={m.its_no}>
//                   {m.name}
//                 </option>
//               ))}
//             </select>
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//           </div>
//         )}

//         {/* Status dropdown */}
//         <div className="relative">
//           <select
//             value={currentFilters.status ?? ''}
//             onChange={(e) => updateFilter('status', e.target.value)}
//             className={selectClass}
//           >
//             <option value="">Active only</option>
//             <option value="active">Active</option>
//             <option value="deceased">Deceased</option>
//             <option value="relocated">Relocated</option>
//             <option value="left_community">Left Community</option>
//             <option value="inactive">Inactive</option>
//           </select>
//           <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//         </div>

//         {/* View All */}
//         {!showAll && (
//           <a
//             href="/members?show_all=1"
//             className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
//           >
//             <Eye className="w-3.5 h-3.5" />
//             View All
//           </a>
//         )}

//         {/* Clear filters */}
//         {hasFilters && (
//           <button
//             onClick={clearAll}
//             className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
//           >
//             <X className="w-3.5 h-3.5" />
//             Clear
//           </button>
//         )}
//       </div>

//       {/* Quick-filter pills row */}
//       <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
//         {PILL_GROUPS.map((group) => {
//           const activeVal = searchParams.get(group.key)
//           return (
//             <div key={group.key} className="flex items-center gap-1 flex-wrap">
//               {group.options.map((opt) => {
//                 const isActive = activeVal === opt.value
//                 return (
//                   <button
//                     key={opt.value}
//                     onClick={() => togglePill(group.key, opt.value)}
//                     className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${isActive
//                       ? 'bg-primary text-primary-foreground border-primary'
//                       : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
//                       }`}
//                   >
//                     {opt.label}
//                   </button>
//                 )
//               })}
//               {/* Divider between groups */}
//               <span className="text-border text-xs select-none">|</span>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }


'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, TransitionStartFunction } from 'react'
import { Search, SlidersHorizontal, ChevronDown, X, Eye } from 'lucide-react'
import type { MemberFilters, Role } from '@/lib/types/app'

interface Sector {
  sector_id: number
  sector_name: string
}

interface Subsector {
  subsector_id: number
  subsector_name: string
  sector_id: number
  musaid_name: string | null
}

interface Musaid {
  its_no: number
  name: string
}

interface Props {
  currentFilters: MemberFilters
  role: Role
  showAll?: boolean
  isPending: boolean
  startTransition: TransitionStartFunction
}

const selectClass =
  'appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer max-w-[200px] truncate'

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

export function MemberFiltersBar({
  currentFilters,
  role,
  showAll = false,
  isPending,
  startTransition,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(currentFilters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sectors, setSectors] = useState<Sector[]>([])
  const [allSubsectors, setAllSubsectors] = useState<Subsector[]>([])
  const [musaids, setMusaids] = useState<Musaid[]>([])

  useEffect(() => {
    fetch('/api/members/filters')
      .then((r) => r.json())
      .then(({ sectors: s, subsectors: ss, musaids: ms }) => {
        setSectors(s ?? [])
        setAllSubsectors(ss ?? [])
        setMusaids(ms ?? [])
      })
      .catch(() => {})
  }, [])

  // Subsectors filtered by selected sector — deduped
  const selectedSectorId = currentFilters.sector_id
  const filteredSubsectors = selectedSectorId
    ? allSubsectors.filter((ss) => ss.sector_id === selectedSectorId)
    : allSubsectors

  const seenKeys = new Set<string>()
  const dedupedSubsectors = filteredSubsectors.filter((ss) => {
    const key = `${ss.subsector_id}-${ss.musaid_name ?? ''}`
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      if (key === 'sector_id') params.delete('subsector_id')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams, startTransition],
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
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters =
    Object.values(currentFilters).some((v) => v !== undefined && v !== '') || searchValue !== ''

  const showSectorFilter = role === 'SuperAdmin' || role === 'Admin' || role === 'Masool'

  function subsectorLabel(ss: Subsector): string {
    if (ss.musaid_name) return `${ss.subsector_name} — ${ss.musaid_name}`
    return ss.subsector_name
  }

  return (
    <div
      className={`relative bg-card rounded-xl border border-border p-4 mb-4 shadow-sm space-y-3 transition-opacity duration-150 ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Loading spinner overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Top row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1.5 text-muted-foreground self-center">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Filters
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-45 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, ITS no, Sabeel no, phone, building..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>

        {/* Sector */}
        {showSectorFilter && sectors.length > 0 && (
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

        {/* Subsector */}
        {dedupedSubsectors.length > 0 && (
          <div className="relative">
            <select
              value={currentFilters.subsector_id ?? ''}
              onChange={(e) => updateFilter('subsector_id', e.target.value)}
              className={selectClass}
            >
              <option value="">All Subsectors</option>
              {dedupedSubsectors.map((ss) => (
                <option key={`${ss.subsector_id}-${ss.musaid_name ?? ''}`} value={ss.subsector_id}>
                  {subsectorLabel(ss)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Musaid */}
        {musaids.length > 0 && (
          <div className="relative">
            <select
              value={currentFilters.musaid_its_no ?? ''}
              onChange={(e) => updateFilter('musaid_its_no', e.target.value)}
              className={selectClass}
            >
              <option value="">All Musaids</option>
              {musaids.map((m) => (
                <option key={m.its_no} value={m.its_no}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Status */}
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

        {/* Clear */}
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

      {/* Pills row */}
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
              <span className="text-border text-xs select-none">|</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}