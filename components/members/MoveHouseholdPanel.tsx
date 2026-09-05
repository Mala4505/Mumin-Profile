'use client'

/**
 * Phase 3 — the move screen. A right-side drawer, deliberately NOT built on
 * `components/ui/sheet.tsx`: Sheet wraps Radix Dialog, which renders a
 * blocking `bg-black/50` overlay and traps focus — i.e. it IS a modal. The
 * plan calls for the members table underneath to stay visible and usable
 * while this is open, so this is a plain fixed-position panel with its own
 * slide transform and no backdrop. Close via the X button or Escape; there's
 * no overlay to click outside of.
 *
 * ── Destination state machine ────────────────────────────────────────────
 * The destination field accepts either a PACI or a building name, told apart
 * by shape (all-digits → PACI). `DestinationResolver` below owns that whole
 * sub-flow and reports a single `ResolvedDestination | null` upward; it's
 * mounted twice — once for the address-move destination, once for a
 * household-change that issues a brand new sabeel_no — reset between panel
 * opens via a `key` on the source, since it manages its own multi-step
 * internal state (query → PACI lookup or building search → flat pick or
 * manual floor/flat/PACI entry) that a single `value` prop can't express.
 *
 * The swap from "typing into our input" to "typing into BuildingCombobox"
 * happens on the first non-digit keystroke (shape flips to 'building'
 * immediately). Whatever was already typed into the front-door field at that
 * instant is handed to BuildingCombobox via its `initialQuery` prop (read
 * once, on mount) so the keystroke that triggered the swap isn't dropped —
 * this also covers a building name starting with digits (e.g. "221B"), since
 * the full string typed so far survives the swap, not just the first char.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { X, Loader2, Search, ArrowRight, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BuildingCombobox, type SelectedBuilding } from '@/components/members/BuildingCombobox'
import { FlatPicker, type SelectedFlat } from '@/components/members/FlatPicker'

// ── Public types ─────────────────────────────────────────────────────────

export type MoveResult =
  | { type: 'move'; to_paci_no: string; sabeel_nos: string[] }
  | {
      type: 'household_change'
      destination_sabeel_no: string
      created_new_family: boolean
      member_its_nos: number[]
    }

export type MoveSource =
  | { type: 'sabeel'; sabeelNo: string }
  | { type: 'paci'; paciNo: string }
  /** Part 4 bulk selection — multiple flat-view rows moved to one destination in a single address-move write. Household-change mode is out of scope for this source type. */
  | { type: 'bulk'; sabeelNos: string[] }

export interface MoveHouseholdPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: MoveSource
  /** Parent decides refresh strategy (router.refresh(), reload, etc.) — called on success, before closing. */
  onMoved?: (result: MoveResult) => void
  /** Phase 4 "Add address and move" — pre-fills the reason field from the reporter's note. */
  initialReason?: string
  /** Phase 4 "Add address and move" — pre-selects the reported building (existing or new) in the address destination resolver, so the approver only fills in what the reporter didn't know. */
  initialBuilding?: SelectedBuilding
  /** Phase 4 "Add address and move" — used as the create-building default subsector when only an area (not a building) was reported. Ignored once `initialBuilding` resolves a subsector on its own. */
  initialSubsectorId?: number
}

// ── Internal shapes (decoupled from DB types — these mirror API JSON) ─────

interface HouseRecord {
  paci_no: string
  building_id: number
  building_name: string
  subsector_id: number
  subsector_name: string
  floor_no: string | null
  flat_no: string | null
  occupant_family_count: number
}

interface FamilyRecord {
  sabeel_no: string
  paci_no: string | null
  subsector_id: number | null
  building_name: string | null
  head_its_no: number | null
  head_name: string | null
  member_count: number
}

interface RosterMember {
  its_no: number
  name: string
}

type ResolvedDestination =
  | {
      kind: 'existing'
      paci_no: string
      building_name: string
      subsector_id: number
      subsector_name?: string
      floor_no: string | null
      flat_no: string | null
      occupant_family_count: number
    }
  | {
      kind: 'new'
      paci_no: string
      building_id: number | null
      new_building?: { building_name: string; subsector_id: number; street?: string; landmark?: string }
      building_name: string
      subsector_id: number
      subsector_name?: string
      floor_no: string
      flat_no: string
    }

// ── Small presentational leaves ────────────────────────────────────────────

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function WarningBox({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function NewAddressSummary({
  dest,
  pointLine,
}: {
  dest: Extract<ResolvedDestination, { kind: 'new' }>
  /** The second numbered line — differs for sabeel-source / paci-source / issue-new-sabeel. */
  pointLine: string
}) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
      <p className="mb-1.5 font-medium">This move will</p>
      <ol className="space-y-1 text-muted-foreground">
        <li>
          1 · Record flat <span className="font-mono text-foreground">{dest.paci_no}</span> —{' '}
          {dest.building_name}, floor {dest.floor_no}, flat {dest.flat_no}
        </li>
        <li>2 · {pointLine}</li>
      </ol>
    </div>
  )
}

function ResolvedDestinationSummary({
  resolved,
  onChange,
  disabled,
}: {
  resolved: ResolvedDestination
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-foreground">{resolved.building_name}</p>
          <p className="text-xs text-muted-foreground">
            Floor {resolved.floor_no ?? '—'} · Flat {resolved.flat_no ?? '—'} · PACI{' '}
            <span className="font-mono">{resolved.paci_no}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {resolved.kind === 'existing' ? 'On file' : 'New registration'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        Change
      </button>
    </div>
  )
}

// ── Destination resolver (the search-a-PACI-or-building sub-flow) ─────────

type PaciLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; house: HouseRecord }
  | { status: 'not-found' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }

interface DestinationResolverProps {
  /** The source household's/flat's current subsector, offered as a default for `BuildingCombobox`'s new-building create option. */
  subsectorHint?: number
  /** Phase 4 prefill — a building already known from a reporter's request, seeded straight into the 'building' branch so the approver isn't re-searching what's already been told. */
  initialBuilding?: SelectedBuilding
  onResolved: (d: ResolvedDestination | null) => void
  disabled?: boolean
}

function DestinationResolver({ subsectorHint, initialBuilding, onResolved, disabled }: DestinationResolverProps) {
  const uid = useId()

  const [query, setQuery] = useState('')
  const [shape, setShape] = useState<'unset' | 'paci' | 'building'>(initialBuilding ? 'building' : 'unset')
  const [paciLookup, setPaciLookup] = useState<PaciLookupState>({ status: 'idle' })

  const [chosenBuilding, setChosenBuilding] = useState<SelectedBuilding | null>(initialBuilding ?? null)
  const [chosenFlat, setChosenFlat] = useState<SelectedFlat | null>(null)
  const [registeringNew, setRegisteringNew] = useState(false)

  const [manualFloor, setManualFloor] = useState('')
  const [manualFlat, setManualFlat] = useState('')
  const [manualPaci, setManualPaci] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  // Disambiguate + (for the PACI branch) debounce-resolve, ~300ms — same cadence as BuildingCombobox.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()

    if (trimmed === '') {
      requestIdRef.current++
      setShape('unset')
      setPaciLookup({ status: 'idle' })
      return
    }

    const isAllDigits = /^\d+$/.test(trimmed)
    if (!isAllDigits) {
      requestIdRef.current++
      setShape('building')
      setPaciLookup({ status: 'idle' })
      return
    }

    setShape('paci')
    setPaciLookup({ status: 'idle' })
    const requestId = ++requestIdRef.current
    debounceRef.current = setTimeout(async () => {
      setPaciLookup({ status: 'loading' })
      try {
        const res = await fetch(`/api/houses/${encodeURIComponent(trimmed)}`)
        if (requestId !== requestIdRef.current) return
        if (res.status === 403) {
          const d = await res.json().catch(() => ({}))
          setPaciLookup({ status: 'forbidden', message: d.error ?? 'Forbidden' })
          return
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setPaciLookup({ status: 'error', message: d.error ?? 'Lookup failed' })
          return
        }
        const d = await res.json()
        if (requestId !== requestIdRef.current) return
        setPaciLookup(d.exists ? { status: 'found', house: d.house } : { status: 'not-found' })
      } catch (e) {
        if (requestId !== requestIdRef.current) return
        setPaciLookup({ status: 'error', message: e instanceof Error ? e.message : 'Lookup failed' })
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const paciAlreadyFixed = shape === 'paci' && paciLookup.status === 'not-found' ? query.trim() : null
  const showBuildingCombobox = shape === 'building' || paciAlreadyFixed !== null
  const offerFlatPicker =
    shape === 'building' && chosenBuilding !== null && chosenBuilding.building_id !== null && !registeringNew
  const needsManualEntry =
    chosenBuilding !== null &&
    (paciAlreadyFixed !== null || (shape === 'building' && (chosenBuilding.building_id === null || registeringNew)))

  const resolved = useMemo<ResolvedDestination | null>(() => {
    if (shape === 'paci' && paciLookup.status === 'found') {
      const h = paciLookup.house
      return {
        kind: 'existing',
        paci_no: h.paci_no,
        building_name: h.building_name,
        subsector_id: h.subsector_id,
        subsector_name: h.subsector_name,
        floor_no: h.floor_no,
        flat_no: h.flat_no,
        occupant_family_count: h.occupant_family_count,
      }
    }

    if (chosenFlat && chosenBuilding && chosenBuilding.building_id !== null) {
      return {
        kind: 'existing',
        paci_no: chosenFlat.paci_no,
        building_name: chosenBuilding.building_name,
        subsector_id: chosenBuilding.subsector_id,
        subsector_name: chosenBuilding.subsector_name,
        floor_no: chosenFlat.floor_no,
        flat_no: chosenFlat.flat_no,
        occupant_family_count: chosenFlat.occupancy,
      }
    }

    if (chosenBuilding) {
      const paci = paciAlreadyFixed ?? manualPaci.trim()
      const floor = manualFloor.trim()
      const flat = manualFlat.trim()
      if (paci && floor && flat) {
        return {
          kind: 'new',
          paci_no: paci,
          building_id: chosenBuilding.building_id,
          new_building:
            chosenBuilding.building_id === null
              ? { building_name: chosenBuilding.building_name, subsector_id: chosenBuilding.subsector_id }
              : undefined,
          building_name: chosenBuilding.building_name,
          subsector_id: chosenBuilding.subsector_id,
          subsector_name: chosenBuilding.building_id !== null ? chosenBuilding.subsector_name : undefined,
          floor_no: floor,
          flat_no: flat,
        }
      }
    }

    return null
  }, [shape, paciLookup, chosenBuilding, chosenFlat, manualPaci, manualFloor, manualFlat, paciAlreadyFixed])

  useEffect(() => {
    onResolved(resolved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved])

  function resetAll() {
    setQuery('')
    setShape('unset')
    setPaciLookup({ status: 'idle' })
    setChosenBuilding(null)
    setChosenFlat(null)
    setRegisteringNew(false)
    setManualFloor('')
    setManualFlat('')
    setManualPaci('')
  }

  if (resolved) {
    return <ResolvedDestinationSummary resolved={resolved} onChange={resetAll} disabled={disabled} />
  }

  return (
    <div className="space-y-2">
      {shape === 'unset' && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="PACI number or building name…"
            disabled={disabled}
            aria-label="Destination — PACI or building name"
            className={cn(
              'h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            )}
          />
        </div>
      )}

      {shape !== 'unset' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={resetAll}
            disabled={disabled}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          >
            Search a different destination
          </button>

          {shape === 'paci' && (
            <>
              {paciLookup.status === 'loading' && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Looking up PACI {query.trim()}…
                </p>
              )}
              {paciLookup.status === 'not-found' && (
                <p className="text-xs text-muted-foreground">
                  PACI <span className="font-mono text-foreground">{query.trim()}</span> isn&apos;t on file yet —
                  pick its building below.
                </p>
              )}
              {paciLookup.status === 'forbidden' && <InlineError>{paciLookup.message}</InlineError>}
              {paciLookup.status === 'error' && <InlineError>{paciLookup.message}</InlineError>}
            </>
          )}

          {showBuildingCombobox && (
            <div className="space-y-2">
              <BuildingCombobox
                subsectorId={subsectorHint}
                scopeSearchToSubsector={false}
                value={chosenBuilding}
                initialQuery={shape === 'building' ? query : undefined}
                onChange={(b) => {
                  setChosenBuilding(b)
                  setChosenFlat(null)
                  setRegisteringNew(false)
                  setManualFloor('')
                  setManualFlat('')
                  setManualPaci('')
                }}
                placeholder="Search buildings…"
                disabled={disabled}
              />

              {offerFlatPicker && chosenBuilding && chosenBuilding.building_id !== null && (
                <FlatPicker
                  buildingId={chosenBuilding.building_id}
                  value={chosenFlat}
                  onChange={setChosenFlat}
                  onRegisterNew={() => setRegisteringNew(true)}
                  disabled={disabled}
                />
              )}

              {needsManualEntry && (
                <div className="grid grid-cols-2 gap-2">
                  {paciAlreadyFixed === null && (
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor={`${uid}-paci`}>PACI no.</Label>
                      <Input
                        id={`${uid}-paci`}
                        value={manualPaci}
                        onChange={(e) => setManualPaci(e.target.value)}
                        placeholder="Transcribed, never invented"
                        disabled={disabled}
                        className="h-10"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor={`${uid}-floor`}>Floor</Label>
                    <Input
                      id={`${uid}-floor`}
                      value={manualFloor}
                      onChange={(e) => setManualFloor(e.target.value)}
                      disabled={disabled}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${uid}-flat`}>Flat</Label>
                    <Input
                      id={`${uid}-flat`}
                      value={manualFlat}
                      onChange={(e) => setManualFlat(e.target.value)}
                      disabled={disabled}
                      className="h-10"
                    />
                  </div>
                  {paciAlreadyFixed !== null && (
                    <p className="col-span-2 text-xs text-muted-foreground">
                      Registering PACI <span className="font-mono text-foreground">{paciAlreadyFixed}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ──────────────────────────────────────────────────────────

type HeaderState =
  | { status: 'loading' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready-sabeel'; family: FamilyRecord; currentSubsectorId: number | null }
  | { status: 'ready-paci'; house: HouseRecord | null }
  | { status: 'ready-bulk'; families: FamilyRecord[] }

type ChangeSabeelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'join'; family: FamilyRecord }
  | { status: 'issue' }
  | { status: 'same-household' }
  | { status: 'error'; message: string }

type RosterState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; members: RosterMember[] }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }

function destinationPayload(d: ResolvedDestination): Record<string, unknown> {
  if (d.kind === 'existing') {
    return { paci_no: d.paci_no }
  }
  return {
    paci_no: d.paci_no,
    ...(d.building_id !== null ? { building_id: d.building_id } : {}),
    ...(d.new_building ? { new_building: d.new_building } : {}),
    floor_no: d.floor_no,
    flat_no: d.flat_no,
  }
}

export function MoveHouseholdPanel({
  open,
  onOpenChange,
  source,
  onMoved,
  initialReason,
  initialBuilding,
  initialSubsectorId,
}: MoveHouseholdPanelProps) {
  const sourceKey =
    source.type === 'sabeel'
      ? `sabeel:${source.sabeelNo}`
      : source.type === 'paci'
        ? `paci:${source.paciNo}`
        : `bulk:${source.sabeelNos.join(',')}`

  const [header, setHeader] = useState<HeaderState>({ status: 'loading' })
  const [mode, setMode] = useState<'address' | 'household'>('address')

  const [addressDestination, setAddressDestination] = useState<ResolvedDestination | null>(null)

  const [changeSabeelNo, setChangeSabeelNo] = useState('')
  const [changeSabeelState, setChangeSabeelState] = useState<ChangeSabeelState>({ status: 'idle' })
  const [newHouseholdDestination, setNewHouseholdDestination] = useState<ResolvedDestination | null>(null)

  const [rosterState, setRosterState] = useState<RosterState>({ status: 'idle' })
  const [checkedIts, setCheckedIts] = useState<Set<number>>(new Set())

  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)

  // Load the header identity, and reset every other piece of form state —
  // this fires on open and whenever the source changes, which is exactly
  // when a stale in-progress edit from a previous move must not carry over.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    setHeader({ status: 'loading' })
    setMode('address')
    setAddressDestination(null)
    setChangeSabeelNo('')
    setChangeSabeelState({ status: 'idle' })
    setNewHouseholdDestination(null)
    setRosterState({ status: 'idle' })
    setCheckedIts(new Set())
    setEffectiveDate(new Date().toISOString().slice(0, 10))
    setReason(initialReason ?? '')
    setSubmitError('')

    async function load() {
      try {
        if (source.type === 'sabeel') {
          const res = await fetch(`/api/families/${encodeURIComponent(source.sabeelNo)}`)
          if (cancelled) return
          if (res.status === 403) {
            const d = await res.json().catch(() => ({}))
            setHeader({ status: 'forbidden', message: d.error ?? 'Forbidden' })
            return
          }
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            setHeader({ status: 'error', message: d.error ?? 'Failed to load household' })
            return
          }
          const d = await res.json()
          if (!d.exists) {
            setHeader({ status: 'error', message: `Sabeel ${source.sabeelNo} not found` })
            return
          }
          const family: FamilyRecord = d.family
          // `family.subsector_id` already carries the resolveFamilyLocation
          // fallback (house→building subsector, or mumin.subsector_id when
          // paci_no is null / stale) — no secondary /api/houses/ call needed.
          if (cancelled) return
          setHeader({ status: 'ready-sabeel', family, currentSubsectorId: family.subsector_id })
        } else if (source.type === 'bulk') {
          // Reuse the same single-family fetch the 'sabeel' branch uses, once
          // per source household — no bulk-specific endpoint exists or is needed.
          const results = await Promise.all(
            source.sabeelNos.map(async (sabeelNo) => {
              try {
                const r = await fetch(`/api/families/${encodeURIComponent(sabeelNo)}`)
                if (!r.ok) return null
                const d = await r.json()
                return d.exists ? (d.family as FamilyRecord) : null
              } catch {
                return null
              }
            }),
          )
          if (cancelled) return
          const families = results.filter((f): f is FamilyRecord => f !== null)
          if (families.length === 0) {
            setHeader({ status: 'error', message: 'Failed to load the selected households' })
            return
          }
          setHeader({ status: 'ready-bulk', families })
        } else {
          const res = await fetch(`/api/houses/${encodeURIComponent(source.paciNo)}`)
          if (cancelled) return
          if (res.status === 403) {
            const d = await res.json().catch(() => ({}))
            setHeader({ status: 'forbidden', message: d.error ?? 'Forbidden' })
            return
          }
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            setHeader({ status: 'error', message: d.error ?? 'Failed to load address' })
            return
          }
          const d = await res.json()
          setHeader({ status: 'ready-paci', house: d.exists ? d.house : null })
        }
      } catch (e) {
        if (cancelled) return
        setHeader({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' })
      }
    }
    void load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceKey])

  // Escape closes — there's no backdrop to click outside of.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Household-change roster — fetched once per mode-entry via the existing
  // GET /api/members?sabeel_no= endpoint (lib/members reads it by sabeel_no
  // already, per app/api/members/route.ts — no new endpoint needed here).
  useEffect(() => {
    if (mode !== 'household' || source.type !== 'sabeel' || rosterState.status !== 'idle') return
    setRosterState({ status: 'loading' })
    fetch(`/api/members?sabeel_no=${encodeURIComponent(source.sabeelNo)}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setRosterState(
            res.status === 403
              ? { status: 'forbidden', message: d.error ?? 'Forbidden' }
              : { status: 'error', message: d.error ?? 'Failed to load members' },
          )
          return
        }
        const d = await res.json()
        const members: RosterMember[] = (d.members ?? []).map((m: { its_no: number; name: string }) => ({
          its_no: m.its_no,
          name: m.name,
        }))
        setRosterState({ status: 'ready', members })
        setCheckedIts(new Set(members.map((m) => m.its_no))) // default: whole household
      })
      .catch((e) => {
        setRosterState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load members' })
      })
  }, [mode, source, rosterState.status])

  // Destination-sabeel_no validation for the household-change branch.
  useEffect(() => {
    if (mode !== 'household') return
    const trimmed = changeSabeelNo.trim()
    if (!trimmed) {
      setChangeSabeelState({ status: 'idle' })
      return
    }
    const sourceSabeel = source.type === 'sabeel' ? source.sabeelNo : null
    if (sourceSabeel && trimmed === sourceSabeel) {
      setChangeSabeelState({ status: 'same-household' })
      return
    }
    setChangeSabeelState({ status: 'loading' })
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/families/${encodeURIComponent(trimmed)}`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setChangeSabeelState({ status: 'error', message: d.error ?? 'Lookup failed' })
          return
        }
        const d = await res.json()
        setChangeSabeelState(d.exists ? { status: 'join', family: d.family } : { status: 'issue' })
      } catch (e) {
        setChangeSabeelState({ status: 'error', message: e instanceof Error ? e.message : 'Lookup failed' })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mode, changeSabeelNo, source])

  const currentSubsectorHint =
    header.status === 'ready-sabeel'
      ? (header.currentSubsectorId ?? initialSubsectorId)
      : header.status === 'ready-paci'
        ? (header.house?.subsector_id ?? initialSubsectorId)
        : initialSubsectorId

  const headerReady =
    header.status === 'ready-sabeel' || header.status === 'ready-paci' || header.status === 'ready-bulk'

  const canSubmit = useMemo(() => {
    if (submitting || !headerReady) return false
    if (mode === 'address') return addressDestination !== null
    if (checkedIts.size === 0) return false
    if (changeSabeelState.status === 'join') return true
    if (changeSabeelState.status === 'issue') return newHouseholdDestination !== null
    return false
  }, [submitting, headerReady, mode, addressDestination, checkedIts, changeSabeelState, newHouseholdDestination])

  let buttonLabel: string
  if (mode === 'household') {
    buttonLabel = `Move ${checkedIts.size} member${checkedIts.size === 1 ? '' : 's'}`
  } else if (source.type === 'sabeel' && header.status === 'ready-sabeel') {
    const n = header.family.member_count
    buttonLabel = `Move ${n} member${n === 1 ? '' : 's'}`
  } else if (source.type === 'bulk' && header.status === 'ready-bulk') {
    const n = header.families.reduce((sum, f) => sum + f.member_count, 0)
    buttonLabel = `Move ${n} member${n === 1 ? '' : 's'}`
  } else {
    buttonLabel = 'Move this household'
  }

  function buildPayload(): Record<string, unknown> {
    const base: Record<string, unknown> = {}
    if (effectiveDate) base.effective_date = effectiveDate
    if (reason.trim()) base.reason = reason.trim()

    if (mode === 'address') {
      const sources =
        source.type === 'sabeel'
          ? [{ sabeel_no: source.sabeelNo }]
          : source.type === 'paci'
            ? [{ paci_no: source.paciNo }]
            : source.sabeelNos.map((s) => ({ sabeel_no: s }))
      return { ...base, sources, destination: destinationPayload(addressDestination!) }
    }

    const payload: Record<string, unknown> = {
      ...base,
      member_its_nos: Array.from(checkedIts),
      destination_sabeel_no: changeSabeelNo.trim(),
    }
    if (changeSabeelState.status === 'issue' && newHouseholdDestination) {
      payload.destination = destinationPayload(newHouseholdDestination)
    }
    return payload
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/address/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(d.error ?? 'Move failed')
      }
      onMoved?.(d.result as MoveResult)
      onOpenChange(false)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Move failed')
    } finally {
      setSubmitting(false)
    }
  }

  function renderAddressConsequences() {
    if (!headerReady || !addressDestination) return null

    const isFirstAssignment = header.status === 'ready-sabeel' && header.family.paci_no === null
    const fromBuildingName =
      header.status === 'ready-sabeel'
        ? header.family.building_name
        : header.status === 'ready-paci'
          ? (header.house?.building_name ?? null)
          : null
    const fromLabel =
      fromBuildingName ?? (header.status === 'ready-sabeel' ? header.family.paci_no : source.type === 'paci' ? source.paciNo : null)
    const currentSubsectorId =
      header.status === 'ready-sabeel'
        ? header.currentSubsectorId
        : header.status === 'ready-paci'
          ? (header.house?.subsector_id ?? null)
          : null

    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
          {isFirstAssignment && header.status === 'ready-sabeel' ? (
            <p>
              <span className="text-muted-foreground">Assigning</span>{' '}
              <span className="font-medium text-foreground">Sabeel {header.family.sabeel_no}</span>{' '}
              <span className="text-muted-foreground">to</span>{' '}
              <span className="font-medium text-foreground">{addressDestination.building_name}</span>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">{fromLabel ?? 'Current address'}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-medium text-foreground">{addressDestination.building_name}</span>
            </p>
          )}
        </div>

        {currentSubsectorId !== null && currentSubsectorId !== addressDestination.subsector_id && (
          <WarningBox>
            This moves the family into a different subsector
            {addressDestination.subsector_name ? ` (${addressDestination.subsector_name})` : ''}.
          </WarningBox>
        )}

        {addressDestination.kind === 'existing' && addressDestination.occupant_family_count > 0 && (
          <WarningBox>
            {addressDestination.occupant_family_count} other famil
            {addressDestination.occupant_family_count === 1 ? 'y' : 'ies'} currently live
            {addressDestination.occupant_family_count === 1 ? 's' : ''} at this address.
          </WarningBox>
        )}

        {addressDestination.kind === 'new' && (
          <NewAddressSummary
            dest={addressDestination}
            pointLine={
              source.type === 'sabeel'
                ? `Point Sabeel ${source.sabeelNo} at it`
                : source.type === 'paci'
                  ? `Point Flat ${source.paciNo}'s families at it`
                  : `Point ${source.sabeelNos.length} household${source.sabeelNos.length === 1 ? '' : 's'} at it`
            }
          />
        )}
      </div>
    )
  }

  function renderHouseholdChangeConsequences() {
    if (changeSabeelState.status === 'join') {
      const f = changeSabeelState.family
      return (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Join {f.head_name ?? 'this household'}&apos;s household (Sabeel{' '}
            <span className="font-mono">{f.sabeel_no}</span>, {f.member_count} member
            {f.member_count === 1 ? '' : 's'})
          </p>
        </div>
      )
    }
    if (changeSabeelState.status === 'issue') {
      return (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground">
            Sabeel <span className="font-mono">{changeSabeelNo.trim()}</span> is available — a new household will
            be issued.
          </div>
          {newHouseholdDestination?.kind === 'existing' && newHouseholdDestination.occupant_family_count > 0 && (
            <WarningBox>
              {newHouseholdDestination.occupant_family_count} other famil
              {newHouseholdDestination.occupant_family_count === 1 ? 'y' : 'ies'} currently live
              {newHouseholdDestination.occupant_family_count === 1 ? 's' : ''} at this address.
            </WarningBox>
          )}
          {newHouseholdDestination?.kind === 'new' && (
            <NewAddressSummary
              dest={newHouseholdDestination}
              pointLine={`Point the new Sabeel ${changeSabeelNo.trim()} at it`}
            />
          )}
        </div>
      )
    }
    if (changeSabeelState.status === 'same-household') {
      return <InlineError>That&apos;s this household&apos;s current sabeel_no — pick a different one.</InlineError>
    }
    if (changeSabeelState.status === 'error') {
      return <InlineError>{changeSabeelState.message}</InlineError>
    }
    return null
  }

  function renderRosterChecklist() {
    if (rosterState.status === 'loading') {
      return (
        <div className="space-y-1.5" aria-busy="true" aria-label="Loading members">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )
    }
    if (rosterState.status === 'forbidden' || rosterState.status === 'error') {
      return <InlineError>{rosterState.message}</InlineError>
    }
    if (rosterState.status !== 'ready') return null
    return (
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1.5">
        {rosterState.members.map((m) => {
          const checked = checkedIts.has(m.its_no)
          return (
            <label
              key={m.its_no}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  setCheckedIts((prev) => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(m.its_no)
                    else next.delete(m.its_no)
                    return next
                  })
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
              />
              <span className="flex-1 truncate text-foreground">{m.name}</span>
              <span className="font-mono text-xs text-muted-foreground">ITS {m.its_no}</span>
            </label>
          )
        })}
      </div>
    )
  }

  const destinationDisabled = submitting || !headerReady

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Move household"
      tabIndex={-1}
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-card border-l border-border shadow-2xl',
        'transition-transform duration-300 ease-out sm:w-[560px]',
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          {header.status === 'loading' && (
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          )}
          {(header.status === 'forbidden' || header.status === 'error') && (
            <div className="max-w-xs">
              <InlineError>{header.message}</InlineError>
            </div>
          )}
          {header.status === 'ready-sabeel' && (
            <>
              <h2 className="truncate text-base font-semibold text-foreground">
                {header.family.head_name ?? 'Household'}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sabeel <span className="font-mono">{header.family.sabeel_no}</span>
                <span className="mx-1.5">·</span>
                {header.family.member_count} member{header.family.member_count === 1 ? '' : 's'}
              </p>
            </>
          )}
          {header.status === 'ready-paci' && (
            <>
              <h2 className="truncate text-base font-semibold text-foreground">
                Flat <span className="font-mono">{source.type === 'paci' ? source.paciNo : ''}</span>
              </h2>
              {header.house && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {header.house.building_name}
                  <span className="mx-1.5">·</span>
                  {header.house.occupant_family_count} famil{header.house.occupant_family_count === 1 ? 'y' : 'ies'}
                </p>
              )}
            </>
          )}

          {/* Grouped multi-source header — Phase 4 bulk selection. A simple
              list of the selected sabeel_nos, not a collapsible tree; the
              plan explicitly warns against over-building this. */}
          {header.status === 'ready-bulk' && (
            <>
              <h2 className="truncate text-base font-semibold text-foreground">
                {header.families.length} household{header.families.length === 1 ? '' : 's'}
                <span className="mx-1.5">·</span>
                {header.families.reduce((sum, f) => sum + f.member_count, 0)} members
              </h2>
              <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                {header.families.map((f) => `Sabeel ${f.sabeel_no}`).join(' · ')}
              </p>
            </>
          )}

          {mode === 'address' && source.type === 'sabeel' && header.status === 'ready-sabeel' && (
            <button
              type="button"
              onClick={() => setMode('household')}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Not everyone?
            </button>
          )}
          {mode === 'household' && source.type === 'sabeel' && (
            <button
              type="button"
              onClick={() => setMode('address')}
              className="mt-2 text-xs font-medium text-muted-foreground hover:underline"
            >
              ← Move the whole household instead
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="shrink-0 rounded-lg p-2 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {mode === 'address' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Destination</p>
            <DestinationResolver
              key={sourceKey}
              subsectorHint={currentSubsectorHint}
              initialBuilding={initialBuilding}
              onResolved={setAddressDestination}
              disabled={destinationDisabled}
            />
            {renderAddressConsequences()}
          </div>
        )}

        {mode === 'household' && source.type === 'sabeel' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Members moving</p>
              {renderRosterChecklist()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="move-dest-sabeel">Destination sabeel_no</Label>
              <Input
                id="move-dest-sabeel"
                value={changeSabeelNo}
                onChange={(e) => setChangeSabeelNo(e.target.value)}
                placeholder="Existing or newly issued sabeel_no"
                className="h-10"
                disabled={submitting}
              />
              {changeSabeelState.status === 'loading' && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Checking…
                </p>
              )}
              {renderHouseholdChangeConsequences()}
            </div>

            {changeSabeelState.status === 'issue' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">New address</p>
                <DestinationResolver
                  key={`${sourceKey}-new-household`}
                  subsectorHint={currentSubsectorHint}
                  onResolved={setNewHouseholdDestination}
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-3 border-t border-border px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="move-effective-date">Effective date</Label>
            <Input
              id="move-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="h-10"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="move-reason">
              Reason <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="move-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family relocated"
              className="h-10"
              disabled={submitting}
            />
          </div>
        </div>

        {submitError && <InlineError>{submitError}</InlineError>}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 w-3.5 h-3.5 animate-spin" />
                Moving…
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
