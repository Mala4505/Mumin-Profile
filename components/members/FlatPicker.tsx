'use client'

/**
 * Browse-and-pick list of known flats within a chosen building, for the "move
 * within a building the community already occupies" branch of the move
 * household drawer (`MoveHouseholdPanel`). Fully controlled: selection lives
 * in the parent via `value` / `onChange`, this component only fetches and
 * renders `GET /api/buildings/[id]/flats`.
 *
 * Deviation from the suggested prop shape: adds an optional `className` so
 * the parent panel can control layout spacing without a wrapping div.
 */

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Home, Plus, Check, ShieldAlert, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Chip } from '@/components/members/MemberPrimitives'

export interface SelectedFlat {
  paci_no: string
  floor_no: string | null
  flat_no: string | null
  occupancy: number
}

export interface FlatPickerProps {
  buildingId: number
  value: SelectedFlat | null
  onChange: (flat: SelectedFlat) => void
  /** Parent opens its own building + floor + flat + PACI entry fields. */
  onRegisterNew: () => void
  disabled?: boolean
  className?: string
}

interface FlatsApiResponse {
  building: { building_id: number; building_name: string; subsector_id: number }
  flats: SelectedFlat[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; flats: SelectedFlat[] }

// Reuses the same tone convention as lib/members/display.ts's status chips
// (kept local — this file is scoped not to touch that shared module).
const VACANT_TONE = 'bg-gray-100 text-gray-500 border-gray-200'
const OCCUPIED_TONE = 'bg-green-100 text-green-700 border-green-200'

export function FlatPicker({
  buildingId,
  value,
  onChange,
  onRegisterNew,
  disabled,
  className,
}: FlatPickerProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetch(`/api/buildings/${buildingId}/flats`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const message: string =
            body?.error ?? (res.status === 403 ? 'Forbidden' : 'Failed to load flats')
          setState(
            res.status === 403
              ? { status: 'forbidden', message }
              : { status: 'error', message }
          )
          return
        }
        const data: FlatsApiResponse = await res.json()
        if (cancelled) return
        setState({ status: 'ready', flats: data.flats })
      })
      .catch((e) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Failed to load flats',
        })
      })

    return () => {
      cancelled = true
    }
  }, [buildingId, retryKey])

  return (
    <div className={cn('space-y-2', className)}>
      {state.status === 'loading' && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading flats">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'forbidden' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p>{state.message}</p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {state.status === 'ready' && state.flats.length === 0 && (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Home className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">
              No flats on record for this building yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Register the first one below.
            </p>
          </div>
          <RegisterNewRow onClick={onRegisterNew} disabled={disabled} prominent />
        </div>
      )}

      {state.status === 'ready' && state.flats.length > 0 && (
        <div className="space-y-2">
          <FlatListbox
            flats={state.flats}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          <RegisterNewRow onClick={onRegisterNew} disabled={disabled} />
        </div>
      )}
    </div>
  )
}

// ── Listbox (roving tabindex, arrow/Home/End navigation, click + Enter/Space) ──

function FlatListbox({
  flats,
  value,
  onChange,
  disabled,
}: {
  flats: SelectedFlat[]
  value: SelectedFlat | null
  onChange: (flat: SelectedFlat) => void
  disabled?: boolean
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = flats.findIndex((f) => f.paci_no === value?.paci_no)
  const [focusIndex, setFocusIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0)

  function focusOption(index: number) {
    const next = (index + flats.length) % flats.length
    setFocusIndex(next)
    optionRefs.current[next]?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusOption(focusIndex + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusOption(focusIndex - 1)
        break
      case 'Home':
        e.preventDefault()
        focusOption(0)
        break
      case 'End':
        e.preventDefault()
        focusOption(flats.length - 1)
        break
    }
  }

  return (
    <div
      role="listbox"
      aria-label="Flats in this building"
      className="space-y-2"
      onKeyDown={handleKeyDown}
    >
      {flats.map((flat, index) => (
        <FlatRow
          key={flat.paci_no}
          ref={(el) => {
            optionRefs.current[index] = el
          }}
          flat={flat}
          selected={index === selectedIndex}
          tabIndex={index === focusIndex ? 0 : -1}
          onFocus={() => setFocusIndex(index)}
          onSelect={() => onChange(flat)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

const FlatRow = forwardRef<
  HTMLButtonElement,
  {
    flat: SelectedFlat
    selected: boolean
    tabIndex: number
    onFocus: () => void
    onSelect: () => void
    disabled?: boolean
  }
>(function FlatRow({ flat, selected, tabIndex, onFocus, onSelect, disabled }, ref) {
  const isVacant = flat.occupancy === 0

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={tabIndex}
      disabled={disabled}
      onFocus={onFocus}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-muted/60',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <Home className="h-4 w-4" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-medium text-foreground">
          {flat.paci_no}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          Floor {flat.floor_no ?? '—'} · Flat {flat.flat_no ?? '—'}
        </span>
      </span>

      <Chip size="sm" tone={isVacant ? VACANT_TONE : OCCUPIED_TONE} className="shrink-0">
        {isVacant ? 'Vacant' : `${flat.occupancy} ${flat.occupancy === 1 ? 'family' : 'families'}`}
      </Chip>

      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
    </button>
  )
})

// ── Register-new row ─────────────────────────────────────────────────────────

function RegisterNewRow({
  onClick,
  disabled,
  prominent,
}: {
  onClick: () => void
  disabled?: boolean
  prominent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        prominent
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
          : 'border-border hover:bg-muted/60',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed',
          prominent ? 'border-primary/40 text-primary' : 'border-border text-muted-foreground'
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-medium',
            prominent ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Register a flat we don&apos;t have yet
        </span>
        <span className="block text-xs text-muted-foreground">
          Its PACI is transcribed, never invented.
        </span>
      </span>
    </button>
  )
}
