'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, Search, AlertTriangle, Plus, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A building that already exists in the `building` table. */
export interface ExistingBuilding {
  building_id: number
  building_name: string
  subsector_id: number
  subsector_name: string
  street: string | null
  landmark: string | null
  duplicate_building_ids?: number[]
}

/**
 * Synthetic result produced when the user picks "Create '<query>' as a new
 * building" instead of an existing row. `building_id: null` is the
 * discriminant the parent panel switches on — nothing is created here; the
 * parent's own `/api/address/move` call carries this shape through as
 * `new_building: { building_name, subsector_id }` and `resolve_or_create_house`
 * does the actual insert server-side.
 */
export interface NewBuildingSelection {
  building_id: null
  building_name: string
  subsector_id: number
  isNew: true
}

export type SelectedBuilding = ExistingBuilding | NewBuildingSelection

export interface BuildingComboboxProps {
  /**
   * The subsector a new building gets created under, and (only when
   * `scopeSearchToSubsector` is also true) the subsector the *search* is
   * restricted to.
   *
   * Decision: rather than embedding a nested subsector picker in this
   * component, the "Create new building" option only appears once the caller
   * supplies `subsectorId`. The move panel resolves the destination subsector
   * earlier in its own flow, so by the time this combobox needs to offer
   * "create new" the id is already known; when it isn't (yet), the combobox
   * still searches city-wide and simply omits the create option with a hint.
   */
  subsectorId?: number
  /**
   * Whether `subsectorId` also restricts the *search* to that one subsector
   * (sent as `?subsector_id=`), on top of gating "create new". Default true.
   *
   * Set false when `subsectorId` is only a default/hint for creating a new
   * building — e.g. the move panel seeds it from the household's *current*
   * subsector, but the whole point of a move is often landing somewhere
   * else, so search must stay city-wide (still bounded by the caller's own
   * role scope server-side) or an existing destination building outside
   * that one subsector is simply never found.
   */
  scopeSearchToSubsector?: boolean
  value: SelectedBuilding | null
  onChange: (building: SelectedBuilding) => void
  placeholder?: string
  disabled?: boolean
  /** Accessible label for the search input; falls back to `placeholder`. */
  ariaLabel?: string
  id?: string
  className?: string
  /**
   * Seeds the search text on mount — for a caller that swaps its own text
   * input for this combobox mid-typing (e.g. DestinationResolver, which
   * hands off after the first non-digit keystroke) so that keystroke isn't
   * silently dropped. Read once, on mount, like `value` is; not synced on
   * every keystroke.
   */
  initialQuery?: string
}

const MIN_QUERY_LENGTH = 2

function buildingSubtitle(b: ExistingBuilding): string {
  return [b.subsector_name, b.street, b.landmark].filter(Boolean).join(' · ')
}

export function BuildingCombobox({
  subsectorId,
  scopeSearchToSubsector = true,
  value,
  onChange,
  placeholder = 'Search buildings…',
  disabled = false,
  ariaLabel,
  id,
  className,
  initialQuery,
}: BuildingComboboxProps) {
  const [query, setQuery] = useState(value?.building_name ?? initialQuery ?? '')
  const [open, setOpen] = useState(() => Boolean(initialQuery?.trim()))
  const [results, setResults] = useState<ExistingBuilding[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reactId = useId()
  const inputId = id ?? `building-combobox-${reactId}`
  const listboxId = `${inputId}-listbox`

  // Keep the input text in sync when the parent changes `value` out from
  // under us (e.g. resetting the form, or the destination subsector changing
  // and invalidating a prior pick). Skipped on mount — otherwise this stomps
  // `initialQuery` right back to '' the instant a caller seeds it, since
  // `value` starts null for a fresh pick.
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setQuery(value?.building_name ?? '')
  }, [value?.building_id, value?.building_name])

  // When seeded via `initialQuery`, this mount is a hand-off from a caller's
  // own text input (e.g. DestinationResolver's front-door field, which
  // unmounts itself the instant it hands off) — that input had focus, and
  // React doesn't carry DOM focus across an unmount/mount of two different
  // elements. Without this, the cursor just drops out and the user has to
  // click back in to keep typing. Run once, on mount, matching the
  // read-once-on-mount semantics of `initialQuery` itself.
  useEffect(() => {
    if (!initialQuery?.trim()) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = useCallback(
    async (q: string) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ q })
        if (subsectorId !== undefined && scopeSearchToSubsector) params.set('subsector_id', String(subsectorId))
        const res = await fetch(`/api/buildings?${params.toString()}`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? 'Search failed')
        }
        const d = await res.json()
        if (requestId !== requestIdRef.current) return // superseded by a newer request
        setResults(d.buildings ?? [])
        setActiveIndex(-1)
      } catch (e) {
        if (requestId !== requestIdRef.current) return
        setError(e instanceof Error ? e.message : 'Search failed')
        setResults([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [subsectorId, scopeSearchToSubsector],
  )

  // Debounced search — same shape as MemberFiltersBar's search debounce.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current++ // invalidate any in-flight request
      setResults([])
      setLoading(false)
      setError('')
      return
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(trimmed)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, subsectorId, scopeSearchToSubsector])

  // Close on outside click.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const trimmedQuery = query.trim()
  const hasExactMatch = results.some(
    (r) => r.building_name.trim().toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const showCreateHint = trimmedQuery.length >= MIN_QUERY_LENGTH && !hasExactMatch && !loading
  const canCreate = showCreateHint && subsectorId !== undefined
  const totalOptions = results.length + (canCreate ? 1 : 0)

  function selectExisting(b: ExistingBuilding) {
    onChange(b)
    setQuery(b.building_name)
    setOpen(false)
    setActiveIndex(-1)
  }

  function selectCreate() {
    if (subsectorId === undefined) return
    onChange({
      building_id: null,
      building_name: trimmedQuery,
      subsector_id: subsectorId,
      isNew: true,
    })
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || totalOptions === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % totalOptions)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + totalOptions) % totalOptions)
    } else if (e.key === 'Enter') {
      if (activeIndex === -1) return
      e.preventDefault()
      if (activeIndex < results.length) {
        selectExisting(results[activeIndex])
      } else {
        selectCreate()
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-label={ariaLabel ?? placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full pl-9 pr-3 py-2 h-10 text-sm bg-card border border-border rounded-lg text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-72 max-h-72 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg py-1">
          <ul id={listboxId} role="listbox" aria-label="Buildings">
            {error && (
              <li className="px-3 py-2 text-xs text-destructive bg-destructive/10 mx-1 my-1 rounded-lg">
                {error}
              </li>
            )}

            {!error && trimmedQuery.length < MIN_QUERY_LENGTH && (
              <li className="px-3 py-4 text-xs text-muted-foreground text-center">
                Type at least {MIN_QUERY_LENGTH} characters to search
              </li>
            )}

            {!error &&
              trimmedQuery.length >= MIN_QUERY_LENGTH &&
              !loading &&
              results.length === 0 && (
                <li className="px-3 py-3 text-xs text-muted-foreground text-center">
                  No buildings found
                </li>
              )}

            {!error &&
              results.map((b, index) => {
                const isActive = index === activeIndex
                const isDuplicate = (b.duplicate_building_ids?.length ?? 0) > 0
                return (
                  <li
                    key={b.building_id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()} // keep focus on input
                    onClick={() => selectExisting(b)}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors',
                      isActive ? 'bg-muted text-primary' : 'hover:bg-muted hover:text-primary',
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm text-foreground truncate">{b.building_name}</span>
                        {isDuplicate && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            possible duplicate — also #{b.duplicate_building_ids![0]}
                            {b.duplicate_building_ids!.length > 1
                              ? ` +${b.duplicate_building_ids!.length - 1}`
                              : ''}
                          </span>
                        )}
                      </div>
                      {buildingSubtitle(b) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {buildingSubtitle(b)}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}

            {showCreateHint && (
              <>
                <li className="my-1 mx-1 h-px bg-border" role="separator" />
                {canCreate ? (
                  <li
                    id={`${listboxId}-option-${results.length}`}
                    role="option"
                    aria-selected={activeIndex === results.length}
                    onMouseEnter={() => setActiveIndex(results.length)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={selectCreate}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors text-primary',
                      activeIndex === results.length ? 'bg-muted' : 'hover:bg-muted',
                    )}
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-sm truncate">Create &ldquo;{trimmedQuery}&rdquo; as a new building</span>
                  </li>
                ) : (
                  <li className="px-3 py-2 text-xs text-muted-foreground text-center">
                    Select a subsector to create &ldquo;{trimmedQuery}&rdquo; as a new building
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
