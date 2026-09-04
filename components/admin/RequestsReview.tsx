'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCheck, X, ChevronDown, ChevronUp, AlertTriangle, HelpCircle, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Chip, MemberIdentity } from '@/components/members/MemberPrimitives'
import { TOUCH_TARGET } from '@/lib/members/display'
import { MoveHouseholdPanel } from '@/components/members/MoveHouseholdPanel'
import type { SelectedBuilding } from '@/components/members/BuildingCombobox'

/** Canonical table-header typography, shared with every other table in the app. */
const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'

interface RequestedChange {
  its_no: number
  field: string
  label: string
  old_value: string
  new_value: string
}

/** Typed, possibly-partial address-change report (Phase 4 Step 1) — the other
 *  shape `requested_changes` can hold, alongside the field-edit array above. */
interface AddressChangeRequest {
  type: 'address_change'
  known: 'flag' | 'area' | 'building' | 'full'
  note?: string
  reported_sector_id?: number
  reported_subsector_id?: number
  reported_building_id?: number
  reported_building_name?: string
  paci_no?: string
  floor_no?: string
  flat_no?: string
}

interface ReviewRequest {
  id: number
  sabeel_no: string
  remark: string
  status: 'pending' | 'awaiting_address' | 'done' | 'rejected'
  requested_changes: RequestedChange[] | AddressChangeRequest | null
  reviewer_note: string | null
  created_at: string
  reviewed_at: string | null
  requester: { its_no: number; name: string; phone: string | null } | null
  hof: { head_its_no: number | null; mumin: { its_no: number; name: string } | null } | null
}

interface Props {
  initialRequests: ReviewRequest[]
}

type FilterTab = 'all' | 'pending' | 'awaiting_address' | 'done' | 'rejected'

/** Narrows `requested_changes` to the address-report shape. */
function isAddressChangeReq(rc: ReviewRequest['requested_changes']): rc is AddressChangeRequest {
  return !!rc && !Array.isArray(rc) && (rc as AddressChangeRequest).type === 'address_change'
}

interface FilterOption {
  id: number
  name: string
}

export function RequestsReview({ initialRequests }: Props) {
  const [requests, setRequests] = useState<ReviewRequest[]>(initialRequests)
  const [tab, setTab] = useState<FilterTab>('all')
  const [actioning, setActioning] = useState<number | null>(null)
  const [showMarkAllModal, setShowMarkAllModal] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  // Per-row reject UI state: maps request id → draft note text (undefined = reject UI not open)
  const [rejectDraft, setRejectDraft] = useState<Record<number, string>>({})
  // Per-row "Ask reporter" composer state — same shape/pattern as rejectDraft.
  const [askDraft, setAskDraft] = useState<Record<number, string>>({})
  // Per-row diff expand state
  const [diffExpanded, setDiffExpanded] = useState<Record<number, boolean>>({})
  // id→name lookups for address-report sector/subsector, built once from the
  // same endpoint MemberFiltersBar uses — not worth a dedicated endpoint.
  const [sectorMap, setSectorMap] = useState<Record<number, string>>({})
  const [subsectorMap, setSubsectorMap] = useState<Record<number, string>>({})
  // The single address-report row (if any) whose "Add address and move" panel is open.
  const [activeMovePanelRequestId, setActiveMovePanelRequestId] = useState<number | null>(null)
  // Per-PACI existence check, keyed by paci_no — feeds the dynamic "this will
  // create a new address" vs. "already on file" warning on a pending address
  // report's direct approve action (plan line 795 wants the specific flat
  // named, not a generic "(if new)" hedge).
  const [paciCheck, setPaciCheck] = useState<Record<string, 'loading' | 'error' | { exists: boolean; buildingName: string; floorNo: string | null; flatNo: string | null }>>({})

  useEffect(() => {
    const toCheck = new Set<string>()
    for (const r of requests) {
      if (r.status !== 'pending' || !isAddressChangeReq(r.requested_changes)) continue
      const paci = r.requested_changes.paci_no
      if (paci && !(paci in paciCheck)) toCheck.add(paci)
    }
    if (toCheck.size === 0) return
    toCheck.forEach(paci => {
      setPaciCheck(prev => ({ ...prev, [paci]: 'loading' }))
      fetch(`/api/houses/${encodeURIComponent(paci)}`)
        .then(async res => {
          if (!res.ok) {
            setPaciCheck(prev => ({ ...prev, [paci]: 'error' }))
            return
          }
          const d = await res.json()
          setPaciCheck(prev => ({
            ...prev,
            [paci]: d.exists
              ? { exists: true, buildingName: d.house.building_name, floorNo: d.house.floor_no, flatNo: d.house.flat_no }
              : { exists: false, buildingName: '', floorNo: null, flatNo: null },
          }))
        })
        .catch(() => setPaciCheck(prev => ({ ...prev, [paci]: 'error' })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests])

  useEffect(() => {
    fetch('/api/members/filters')
      .then(r => r.json())
      .then(({ sectors, subsectors }: { sectors?: { sector_id: number; sector_name: string }[]; subsectors?: { subsector_id: number; subsector_name: string }[] }) => {
        setSectorMap(Object.fromEntries((sectors ?? []).map(s => [s.sector_id, s.sector_name])))
        setSubsectorMap(Object.fromEntries((subsectors ?? []).map(s => [s.subsector_id, s.subsector_name])))
      })
      .catch(() => {})
  }, [])

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab)
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const activeMoveRequest = requests.find(r => r.id === activeMovePanelRequestId) ?? null

  async function handleApprove(req: ReviewRequest) {
    setActioning(req.id)
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: updated.status, reviewed_at: updated.reviewed_at, reviewed_by: updated.reviewed_by }
          : r
      ))
      setDiffExpanded(prev => {
        const next = { ...prev }
        delete next[req.id]
        return next
      })
      toast.success('Request approved')
    } else {
      toast.error('Failed to approve request')
    }
    setActioning(null)
  }

  async function handleReject(req: ReviewRequest) {
    const note = rejectDraft[req.id] ?? ''
    setActioning(req.id)
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reviewer_note: note || undefined }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: updated.status, reviewed_at: updated.reviewed_at, reviewer_note: updated.reviewer_note !== undefined ? updated.reviewer_note : (note || null) }
          : r
      ))
      setRejectDraft(prev => {
        const next = { ...prev }
        delete next[req.id]
        return next
      })
      toast.success('Request rejected')
    } else {
      toast.error('Failed to reject request')
    }
    setActioning(null)
  }

  function openRejectUI(id: number) {
    setRejectDraft(prev => ({ ...prev, [id]: '' }))
  }

  function closeRejectUI(id: number) {
    setRejectDraft(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function openAskUI(id: number) {
    setAskDraft(prev => ({ ...prev, [id]: '' }))
  }

  function closeAskUI(id: number) {
    setAskDraft(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  /** Secondary action available on both `pending` and `awaiting_address` address
   *  reports — records a note for the reporter without touching `status`. */
  async function handleAsk(req: ReviewRequest) {
    const note = (askDraft[req.id] ?? '').trim()
    if (!note) return
    setActioning(req.id)
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ask', note }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, reviewer_note: updated.reviewer_note ?? note } : r
      ))
      closeAskUI(req.id)
      toast.success('Note saved for the reporter')
    } else {
      toast.error('Failed to save note')
    }
    setActioning(null)
  }

  /** Called after `MoveHouseholdPanel` executes the move for an `awaiting_address`
   *  report — the move itself already happened via the panel's own API call;
   *  this only closes the request's lifecycle out as `done`. */
  async function handleMoveComplete(req: ReviewRequest) {
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: updated.status, reviewed_at: updated.reviewed_at } : r
      ))
      toast.success('Request closed')
    } else {
      toast.error('Move completed, but closing the request failed — refresh to check its status')
    }
    setActiveMovePanelRequestId(null)
  }

  /** Populated fields on an address report, for the Remark/Changes summary — absent fields are skipped entirely. */
  function addressSummaryRows(ac: AddressChangeRequest): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = []
    if (ac.reported_sector_id !== undefined) {
      rows.push({ label: 'Sector', value: sectorMap[ac.reported_sector_id] ?? `#${ac.reported_sector_id}` })
    }
    if (ac.reported_subsector_id !== undefined) {
      rows.push({ label: 'Subsector', value: subsectorMap[ac.reported_subsector_id] ?? `#${ac.reported_subsector_id}` })
    }
    if (ac.reported_building_name || ac.reported_building_id !== undefined) {
      rows.push({ label: 'Building', value: ac.reported_building_name || `Building #${ac.reported_building_id}` })
    }
    if (ac.paci_no) rows.push({ label: 'PACI No', value: ac.paci_no })
    if (ac.floor_no) rows.push({ label: 'Floor', value: ac.floor_no })
    if (ac.flat_no) rows.push({ label: 'Flat', value: ac.flat_no })
    if (ac.note) rows.push({ label: 'Note', value: ac.note })
    return rows
  }

  /** What's still missing before an `awaiting_address` report can be completed,
   *  keyed off the reporter's `known` tier rather than re-deriving it field by field. */
  function missingAddressFields(ac: AddressChangeRequest): string[] {
    switch (ac.known) {
      case 'flag':
        return ['Sector', 'Subsector', 'Building', 'PACI No', 'Floor', 'Flat']
      case 'area':
        return ['Building', 'PACI No', 'Floor', 'Flat']
      case 'building':
        return ['PACI No', 'Floor', 'Flat']
      default:
        return []
    }
  }

  function toggleDiff(id: number) {
    setDiffExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleMarkAllPending() {
    setMarkingAll(true)
    const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.id)

    const results = await Promise.allSettled(
      pendingIds.map(async id => {
        const res = await fetch(`/api/requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
        if (!res.ok) throw new Error(`failed:${id}`)
        return res.json() as Promise<{ id: number; status: string; reviewed_at: string; reviewed_by: number | null }>
      })
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    const succeeded = successful.length
    const failed = results.length - succeeded

    if (succeeded > 0) {
      setRequests(prev =>
        prev.map(r => {
          const upd = successful.find(u => u.id === r.id)
          return upd ? { ...r, status: upd.status, reviewed_at: upd.reviewed_at, reviewed_by: upd.reviewed_by } : r
        })
      )
      // clear diffExpanded for all approved rows
      setDiffExpanded(prev => {
        const next = { ...prev }
        successful.forEach(u => delete next[u.id])
        return next
      })
    }

    setMarkingAll(false)

    if (failed === 0) {
      setShowMarkAllModal(false)
      toast.success(`${succeeded} request${succeeded !== 1 ? 's' : ''} approved`)
    } else {
      // keep modal open so admin can retry
      toast.warning(`${succeeded} approved, ${failed} failed — retry the pending ones`)
    }
  }

  function statusBadge(status: ReviewRequest['status']) {
    // Request status is its own semantic domain, so it keeps its own colours —
    // but it renders through the shared `Chip` so the geometry matches.
    const tone = status === 'done'
      ? 'bg-green-100 text-green-700 border-green-200'
      : status === 'rejected'
        ? 'bg-red-100 text-red-700 border-red-200'
        : status === 'awaiting_address'
          ? 'bg-blue-100 text-blue-700 border-blue-200'
          : 'bg-amber-100 text-amber-700 border-amber-200'
    const label = status === 'done'
      ? 'Done'
      : status === 'rejected'
        ? 'Rejected'
        : status === 'awaiting_address'
          ? 'Awaiting Address'
          : 'Pending'
    return <Chip size="md" tone={tone}>{label}</Chip>
  }

  /** Tab labels for the two-word status don't read well under `capitalize`. */
  function tabLabel(t: FilterTab): string {
    return t === 'awaiting_address' ? 'Awaiting Address' : t
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + Mark All button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit">
          {(['all', 'pending', 'awaiting_address', 'done', 'rejected'] as FilterTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                t === 'awaiting_address' ? '' : 'capitalize'
              } ${
                tab === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tabLabel(t)}
              {t === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {pendingCount > 0 && (
          <button
            onClick={() => setShowMarkAllModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Pending as Done
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-sm text-muted-foreground">
          No requests found.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className={TH}>Requested By</th>
                  <th className={TH}>Timestamp</th>
                  <th className={TH}>Head of Family</th>
                  <th className={TH}>Remark / Changes</th>
                  <th className={TH}>Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => {
                  const hasChanges = Array.isArray(r.requested_changes) && r.requested_changes.length > 0
                  const isRejectOpen = rejectDraft[r.id] !== undefined
                  const isAskOpen = askDraft[r.id] !== undefined
                  const isDiffOpen = !!diffExpanded[r.id]
                  const isActioning = actioning === r.id
                  const isAddressChange = isAddressChangeReq(r.requested_changes)
                  const addressReq = isAddressChange ? (r.requested_changes as AddressChangeRequest) : null
                  const fieldChanges = Array.isArray(r.requested_changes) ? r.requested_changes : null

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors align-top">
                      <td className="px-4 py-3">
                        <MemberIdentity
                          name={r.requester?.name}
                          itsNo={r.requester?.its_no ?? null}
                          size="sm"
                        />
                        {r.requester?.phone && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{r.requester.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString()}<br />
                        <span className="text-[11px] sm:text-[10px]">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <MemberIdentity
                          name={r.hof?.mumin?.name}
                          itsNo={r.hof?.mumin?.its_no ?? null}
                          sabeelNo={r.sabeel_no}
                          size="sm"
                        />
                      </td>

                      {/* Remark + diff panel */}
                      <td className="px-4 py-3 max-w-xs">
                        {r.remark && (
                          <p className="text-foreground text-sm">{r.remark}</p>
                        )}
                        {addressReq && (
                          <div className="mt-1.5 border border-border rounded-md overflow-hidden text-xs">
                            <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/60 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              Reported address
                            </div>
                            <table className="w-full">
                              <tbody className="divide-y divide-border bg-card">
                                {addressSummaryRows(addressReq).map((row, i) => (
                                  <tr key={i}>
                                    <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap">{row.label}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{row.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {hasChanges && (
                          <div className="mt-1.5">
                            <button
                              onClick={() => toggleDiff(r.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {isDiffOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isDiffOpen ? 'Hide' : 'Show'} {fieldChanges!.length} change{fieldChanges!.length !== 1 ? 's' : ''}
                            </button>
                            {isDiffOpen && (
                              <div className="mt-2 ml-1 border border-border rounded-md overflow-hidden text-xs">
                                <table className="w-full">
                                  <thead className="bg-muted/60">
                                    <tr>
                                      <th className="text-left px-2 py-1.5 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Field</th>
                                      <th className="text-left px-2 py-1.5 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Before</th>
                                      <th className="text-left px-2 py-1.5 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">After</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border bg-card">
                                    {fieldChanges!.map((ch, i) => (
                                      <tr key={i}>
                                        <td className="px-2 py-1.5 font-medium text-foreground">{ch.label}</td>
                                        <td className="px-2 py-1.5 text-muted-foreground line-through">{ch.old_value || '—'}</td>
                                        <td className="px-2 py-1.5 text-green-700 font-semibold">{ch.new_value || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status / Action cell */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="space-y-2">
                          {/* Field-edit rows: unchanged from the original approve/reject flow. */}
                          {!isAddressChange && r.status === 'pending' && (
                            !isRejectOpen ? (
                              <div className="flex items-center gap-2">
                                {/* Approve */}
                                <button
                                  onClick={() => handleApprove(r)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors"
                                >
                                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                  Approve
                                </button>
                                {/* Open reject UI */}
                                <button
                                  onClick={() => openRejectUI(r.id)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              /* Inline reject form */
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  placeholder="Reason (optional)"
                                  value={rejectDraft[r.id]}
                                  onChange={e => setRejectDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleReject(r)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => closeRejectUI(r.id)}
                                    disabled={isActioning}
                                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )
                          )}

                          {/* Address-change rows, full address known: approve executes the move directly. */}
                          {isAddressChange && r.status === 'pending' && (
                            isRejectOpen ? (
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  placeholder="Reason (optional)"
                                  value={rejectDraft[r.id]}
                                  onChange={e => setRejectDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleReject(r)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => closeRejectUI(r.id)}
                                    disabled={isActioning}
                                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : isAskOpen ? (
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  placeholder="What do you need from the reporter?"
                                  value={askDraft[r.id]}
                                  onChange={e => setAskDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleAsk(r)}
                                    disabled={isActioning || !(askDraft[r.id] ?? '').trim()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
                                    Send Note
                                  </button>
                                  <button
                                    onClick={() => closeAskUI(r.id)}
                                    disabled={isActioning}
                                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="flex items-start gap-1 text-[11px] text-amber-700">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                  {(() => {
                                    const paci = addressReq?.paci_no
                                    const check = paci ? paciCheck[paci] : undefined
                                    if (!paci || check === undefined || check === 'loading' || check === 'error') {
                                      return 'Approving will record this address (if new) and move the family immediately.'
                                    }
                                    if (!check.exists) {
                                      const buildingLabel = addressReq!.reported_building_name || (addressReq!.reported_building_id !== undefined ? `Building #${addressReq!.reported_building_id}` : 'the reported building')
                                      const parts = [buildingLabel]
                                      if (addressReq!.floor_no) parts.push(`floor ${addressReq!.floor_no}`)
                                      if (addressReq!.flat_no) parts.push(`flat ${addressReq!.flat_no}`)
                                      return `This will create a new address. Flat ${paci} is not on file. Approving records it as ${parts.join(', ')}, then moves the family.`
                                    }
                                    return `PACI ${paci} is already on file — ${check.buildingName}. Approving moves the family there immediately.`
                                  })()}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleApprove(r)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                    Approve and move
                                  </button>
                                  <button
                                    onClick={() => openRejectUI(r.id)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => openAskUI(r.id)}
                                    disabled={isActioning}
                                    title="Ask reporter for more detail"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                    Ask reporter
                                  </button>
                                </div>
                              </div>
                            )
                          )}

                          {/* Address-change rows, address still incomplete: opens the Phase 3 move panel. */}
                          {isAddressChange && r.status === 'awaiting_address' && (
                            isRejectOpen ? (
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  placeholder="Reason (optional)"
                                  value={rejectDraft[r.id]}
                                  onChange={e => setRejectDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleReject(r)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => closeRejectUI(r.id)}
                                    disabled={isActioning}
                                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : isAskOpen ? (
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  placeholder="What do you need from the reporter?"
                                  value={askDraft[r.id]}
                                  onChange={e => setAskDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleAsk(r)}
                                    disabled={isActioning || !(askDraft[r.id] ?? '').trim()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
                                    Send Note
                                  </button>
                                  <button
                                    onClick={() => closeAskUI(r.id)}
                                    disabled={isActioning}
                                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="text-[11px] text-muted-foreground">
                                  <p className="font-medium text-foreground mb-0.5">Missing before this can run:</p>
                                  <ul className="space-y-0.5">
                                    {missingAddressFields(addressReq!).map(f => (
                                      <li key={f} className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 inline-block shrink-0" />
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => setActiveMovePanelRequestId(r.id)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    Add address and move
                                  </button>
                                  <button
                                    onClick={() => openRejectUI(r.id)}
                                    disabled={isActioning}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => openAskUI(r.id)}
                                    disabled={isActioning}
                                    title="Ask reporter for more detail"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                    Ask reporter
                                  </button>
                                </div>
                              </div>
                            )
                          )}

                          {/* Terminal states: read-only badge. */}
                          {(r.status === 'done' || r.status === 'rejected') && statusBadge(r.status)}

                          {/* Reviewer note — shown whenever set, regardless of status (was rejected-only). */}
                          {r.reviewer_note && !isAskOpen && (
                            <p className="text-[11px] text-muted-foreground italic">
                              Note: {r.reviewer_note}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark All Confirmation Modal */}
      {showMarkAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !markingAll && setShowMarkAllModal(false)} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-sm p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCheck className="w-5 h-5 text-green-600" />
              </div>
              <button
                onClick={() => !markingAll && setShowMarkAllModal(false)}
                aria-label="Close"
                className={`${TOUCH_TARGET} rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-bold text-foreground mb-1">Mark All Pending as Done?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will approve <span className="font-semibold text-foreground">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span> and apply their changes. This action can be reversed individually.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMarkAllModal(false)}
                disabled={markingAll}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAllPending}
                disabled={markingAll}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {markingAll ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</>
                ) : (
                  <><CheckCheck className="w-4 h-4" /> Confirm</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Add address and move" — the Phase 3 move panel, opened for one awaiting_address row at a time,
          pre-filled with whatever the reporter already knew (plan line 797). */}
      {activeMoveRequest && (() => {
        const ac = isAddressChangeReq(activeMoveRequest.requested_changes) ? activeMoveRequest.requested_changes : null
        let initialBuilding: SelectedBuilding | undefined
        if (ac?.reported_building_id !== undefined && ac.reported_subsector_id !== undefined) {
          initialBuilding = {
            building_id: ac.reported_building_id,
            building_name: ac.reported_building_name || `Building #${ac.reported_building_id}`,
            subsector_id: ac.reported_subsector_id,
            subsector_name: subsectorMap[ac.reported_subsector_id] ?? '',
            street: null,
            landmark: null,
          }
        } else if (ac?.reported_building_name && ac.reported_subsector_id !== undefined) {
          initialBuilding = {
            building_id: null,
            building_name: ac.reported_building_name,
            subsector_id: ac.reported_subsector_id,
            isNew: true,
          }
        }
        return (
          <MoveHouseholdPanel
            open
            onOpenChange={(open) => {
              if (!open) setActiveMovePanelRequestId(null)
            }}
            source={{ type: 'sabeel', sabeelNo: activeMoveRequest.sabeel_no }}
            onMoved={() => handleMoveComplete(activeMoveRequest)}
            initialReason={ac?.note}
            initialBuilding={initialBuilding}
            initialSubsectorId={ac?.reported_subsector_id}
          />
        )
      })()}
    </div>
  )
}
