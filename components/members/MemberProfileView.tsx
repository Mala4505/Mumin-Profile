'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  BookOpen,
  ChevronDown,
  Pencil,
  Check,
  X,
  Loader2,
  History,
  UserCircle,
  Clock,
  User,
  CalendarRange,
  Filter,
  MoveRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MemberProfile } from '@/lib/members/getMemberProfile'
import type { SessionUser, LoginMode } from '@/lib/types/app'
import { EditMemberModal } from '@/components/members/EditMemberModal'
import { MoveHouseholdPanel } from '@/components/members/MoveHouseholdPanel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BaligPill,
  Chip,
  GenderPill,
  InfoField,
  INFO_GRID,
  MemberAvatar,
  MemberIdentity,
  MemberStatusBadge,
  SectionCard,
  SectionHeader,
} from '@/components/members/MemberPrimitives'
import { TOUCH_TARGET } from '@/lib/members/display'

// Distinct from every status/gender/balig chip tone used on this page — see
// the matching constant + comment in MemberTable.tsx.
const MOVE_PENDING_TONE = 'bg-violet-100 text-violet-700 border-violet-200'
const MOVE_PENDING_TITLE = 'An address change request is open for this family.'

interface Props {
  profile: MemberProfile
  session: SessionUser
  initialResponses?: InitialResponse[]
  loginMode?: LoginMode
  allCategories?: string[]
}

interface HistoryEntry {
  answer: string
  submitted_at: string
  event_title: string | null
  remarks: string | null
}

interface FullHistoryEntry {
  id: string
  answer: string | null
  remarks: string | null
  submitted_at: string
  event_title: string | null
  filled_by_its: number | null
  filled_by_name: string | null
}

interface InitialResponse {
  profile_field_id: number
  answer: string
  submitted_at: string
  remarks: string | null
  event_title: string | null
}

// ── Static editable field ────────────────────────────────────────────────────
function EditableField({
  field,
  canEdit,
  onSave,
}: {
  field: MemberProfile['values'][number]
  canEdit: boolean
  onSave: (fieldId: number, value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(field.value ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(field.id, val)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setVal(field.value ?? '')
    setEditing(false)
  }

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/60 group">
      <div className="flex items-center gap-1 mb-1">
        <UserCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{field.caption}</span>
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            type={
              field.field_type === 'date'
                ? 'date'
                : field.field_type === 'number'
                ? 'number'
                : 'text'
            }
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') cancel()
            }}
            className="flex-1 min-w-0 h-11 sm:h-9 text-sm"
          />
          <button
            onClick={save}
            disabled={saving}
            className={`${TOUCH_TARGET} shrink-0 rounded text-green-600 hover:bg-green-50 disabled:opacity-50`}
            title="Save"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={cancel}
            className={`${TOUCH_TARGET} shrink-0 rounded text-muted-foreground hover:bg-muted/40`}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 text-sm font-medium text-foreground break-words">
            {field.value ?? '—'}
          </span>
          {canEdit && (
            <button
              onClick={() => {
                setVal(field.value ?? '')
                setEditing(true)
              }}
              className={`${TOUCH_TARGET} shrink-0 rounded text-muted-foreground opacity-100 transition-all hover:text-foreground hover:bg-muted/40 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
              title="Edit"
            >
              <Pencil className="w-4 h-4 md:w-3 md:h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Historical timeline field ────────────────────────────────────────────────
function HistoricalField({
  field,
  history,
  onViewAll,
}: {
  field: MemberProfile['values'][number]
  history: HistoryEntry[]
  onViewAll: () => void
}) {
  const preview = history.slice(0, 3)

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
      <div className="flex items-center gap-1 mb-2">
        <History className="w-3 h-3 text-amber-500 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{field.caption}</span>
      </div>

      {preview.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No records yet</p>
      ) : (
        <div className="space-y-2 border-l-2 border-primary/20 pl-3">
          {preview.map((entry, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary/40" />
              <div className="flex justify-between items-baseline gap-2">
                <span className="min-w-0 text-sm font-semibold text-foreground break-words">
                  {entry.answer}
                </span>
                <span className="text-[11px] sm:text-[10px] font-mono text-muted-foreground flex-shrink-0">
                  {new Date(entry.submitted_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>
              <p className="text-[11px] sm:text-[10px] text-muted-foreground italic break-words">
                {entry.event_title ?? 'Record'}
              </p>
            </div>
          ))}
        </div>
      )}

      {history.length > 3 && (
        <button
          onClick={onViewAll}
          className="mt-1 inline-flex items-center gap-1 min-h-11 sm:min-h-8 text-xs text-primary hover:underline"
        >
          <Clock className="w-3 h-3" />
          View all {history.length} records
        </button>
      )}
    </div>
  )
}

// ── Umoor section ────────────────────────────────────────────────────────────
function UmoorSection({
  fields,
  historicalData,
  canEditField,
  onSaveField,
  onViewAllHistory,
  /** `wide` for a full-width tab panel (coordinator view); `stacked` for a
   * single narrow card in the per-category grid (everyone else). */
  layout = 'wide',
}: {
  fields: MemberProfile['values']
  historicalData: Record<number, HistoryEntry[]>
  canEditField: (field: MemberProfile['values'][number]) => boolean
  onSaveField: (fieldId: number, value: string) => Promise<void>
  onViewAllHistory: (fieldId: number, caption: string) => void
  layout?: 'wide' | 'stacked'
}) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No data recorded yet</p>
      </div>
    )
  }

  return (
    <div
      className={
        layout === 'wide'
          ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'
          : 'flex flex-col gap-3'
      }
    >
      {fields.map((f) => {
        if (f.behavior === 'historical') {
          return (
            <HistoricalField
              key={f.id}
              field={f}
              history={historicalData[f.id] ?? []}
              onViewAll={() => onViewAllHistory(f.id, f.caption)}
            />
          )
        }
        return (
          <EditableField
            key={f.id}
            field={f}
            canEdit={canEditField(f)}
            onSave={onSaveField}
          />
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function MemberProfileView({ profile, session, initialResponses = [], loginMode = 'admin', allCategories = [] }: Props) {
  const router = useRouter()
  const effectiveRole = loginMode === 'user' ? 'Mumin' : session.role
  const isStaff =
    effectiveRole === 'SuperAdmin' ||
    effectiveRole === 'Admin' ||
    effectiveRole === 'Masool' ||
    effectiveRole === 'Musaid'
  // UmoorCoordinator: sees all members but only their assigned umoors' data;
  // no core/address/contact edit affordances.
  const isCoordinator = effectiveRole === 'UmoorCoordinator'
  const isOwnProfile = session.its_no === profile.its_no

  const canDirectEdit = effectiveRole === 'SuperAdmin' || effectiveRole === 'Admin'
  // Address moves are SuperAdmin-only for now — the write path 403s for
  // everyone else. Masool/Musaid get a request-based flow in a later phase.
  const canMoveHousehold = effectiveRole === 'SuperAdmin'
  const [coreEditOpen, setCoreEditOpen] = useState(false)
  const [contactEditOpen, setContactEditOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    phone: profile.phone ?? '',
    alternate_phone: profile.alternate_phone ?? '',
    email: profile.email ?? '',
    status: profile.status,
  })
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState('')
  const [displayProfile, setDisplayProfile] = useState(profile)
  // Latest address move, for the "Moved <date> from <building>" caption on
  // the Location Card — just the newest entry, not the full history.
  const [latestMove, setLatestMove] = useState<{
    effective_date: string
    from_building_name: string | null
  } | null>(null)
  const [activeTab, setActiveTab] = useState<string>(allCategories[0] ?? '')
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  // Jump-nav for the full-access category grid (desktop/tablet only) — lets
  // someone who knows exactly which umoor they want skip straight to its
  // card without hiding any of the others, unlike the tab strip it replaces.
  const categoryCardRefs = useRef<Record<string, HTMLElement | null>>({})
  const [visibleCategory, setVisibleCategory] = useState<string>('')

  // Historical data
  const [historicalData, setHistoricalData] = useState<Record<number, HistoryEntry[]>>({})

  // "View all records" slide-over
  const [historyModal, setHistoryModal] = useState<{
    fieldId: number
    caption: string
  } | null>(null)
  const [fullHistory, setFullHistory] = useState<FullHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const canEditContact = isStaff || isOwnProfile

  // "Move pending" badge — same fetch-on-mount + swallow-errors pattern as
  // MemberTable.tsx and MemberFiltersBar.tsx's own filter-options fetch.
  const [movePending, setMovePending] = useState(false)
  useEffect(() => {
    fetch('/api/requests/open-address-sabeels')
      .then((r) => r.json())
      .then((d) => setMovePending(new Set(d.sabeel_nos ?? []).has(displayProfile.sabeel_no)))
      .catch(() => {})
  }, [displayProfile.sabeel_no])

  // One-line summary for the Location Card — no need for a fancy data layer,
  // just the most recent entry from the same endpoint the full history uses.
  const fetchLatestMove = useCallback(async () => {
    try {
      const res = await fetch(`/api/families/${encodeURIComponent(displayProfile.sabeel_no)}/address-history`)
      if (!res.ok) return
      const data = await res.json()
      const first = data.history?.[0]
      setLatestMove(
        first ? { effective_date: first.effective_date, from_building_name: first.from_building_name } : null,
      )
    } catch {
      // Non-fatal — this only feeds a small caption line.
    }
  }, [displayProfile.sabeel_no])

  useEffect(() => {
    if (isStaff || isOwnProfile) fetchLatestMove()
  }, [fetchLatestMove, isStaff, isOwnProfile])

  // Process initial responses from server
  useEffect(() => {
    const map: Record<number, HistoryEntry[]> = {}
    for (const row of initialResponses) {
      const fid = row.profile_field_id
      if (!map[fid]) map[fid] = []
      map[fid].push({
        answer: row.answer ?? '',
        submitted_at: row.submitted_at,
        event_title: row.event_title ?? null,
        remarks: row.remarks ?? null,
      })
    }
    setHistoricalData(map)
  }, [initialResponses])

  // Fetch full history when slide-over opens or filters change
  useEffect(() => {
    if (!historyModal) { setFullHistory([]); return }
    setHistoryLoading(true)
    const params = new URLSearchParams({ field_id: historyModal.fieldId.toString() })
    if (historyFrom) params.set('from', historyFrom)
    if (historyTo) params.set('to', historyTo)
    fetch(`/api/members/${profile.its_no}/field-history?${params}`)
      .then(r => r.json())
      .then((data: FullHistoryEntry[]) => setFullHistory(Array.isArray(data) ? data : []))
      .catch(() => setFullHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [historyModal, historyFrom, historyTo, profile.its_no])

  async function saveContact() {
    setContactSaving(true)
    setContactError('')

    const body: Record<string, unknown> = {
      phone: contactForm.phone || null,
      email: contactForm.email || null,
    }
    if (isStaff) {
      body.alternate_phone = contactForm.alternate_phone || null
      body.status = contactForm.status
    }

    const res = await fetch(`/api/members/${profile.its_no}/contact`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setContactError(data.error ?? 'Save failed')
      setContactSaving(false)
      return
    }

    setDisplayProfile((prev) => ({
      ...prev,
      phone: contactForm.phone || null,
      alternate_phone: contactForm.alternate_phone || null,
      email: contactForm.email || null,
      status: contactForm.status,
    }))
    setContactEditOpen(false)
    setContactSaving(false)
    router.refresh()
  }

  async function saveProfileField(fieldId: number, value: string) {
    const res = await fetch(`/api/members/${profile.its_no}/profile-values`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, value }),
    })
    if (res.ok) {
      setDisplayProfile((prev) => ({
        ...prev,
        values: prev.values.map((pv) => (pv.id === fieldId ? { ...pv, value } : pv)),
      }))
      router.refresh()
    }
  }

  function canEditField(field: MemberProfile['values'][number]) {
    if (effectiveRole === 'SuperAdmin') return true
    if (isStaff) return true
    // Coordinator: the values reaching the client are already RLS/app-filtered
    // to their assigned umoors, so anything visible here is editable by them.
    if (isCoordinator) return true
    if (isOwnProfile && field.mumin_can_edit) return true
    return false
  }

  // Filter and group profile values
  const visibleValues = displayProfile.values
    .filter((pv) => {
      if (effectiveRole === 'SuperAdmin') return true
      if (isStaff || isCoordinator) return pv.visibility_level <= 2
      return pv.visibility_level === 1
    })
    .sort(
      (a, b) =>
        a.category_sort_order - b.category_sort_order || a.sort_order - b.sort_order
    )

  const categoriesMap = visibleValues.reduce<Record<string, typeof profile.values>>(
    (acc, pv) => {
      if (!acc[pv.category_name]) acc[pv.category_name] = []
      acc[pv.category_name].push(pv)
      return acc
    },
    {}
  )

  // Categories actually present in the data (already sorted by category_sort_order)
  const dataCategories = Object.keys(categoriesMap)

  // Coordinators only get tabs for the umoors present in their (already scoped)
  // data; other roles keep the full DB taxonomy plus any extra categories.
  const orderedCategories = isCoordinator
    ? dataCategories
    : [
        ...allCategories,
        ...dataCategories.filter((cat) => !allCategories.includes(cat)),
      ]

  // Keep the active tab valid when the derived category list doesn't include it
  // (e.g. coordinator whose first umoor isn't the first DB category)
  useEffect(() => {
    if (orderedCategories.length > 0 && !orderedCategories.includes(activeTab)) {
      setActiveTab(orderedCategories[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedCategories.join('|')])

  // Track which category card is currently in view so the jump-nav strip can
  // highlight it. Coordinators don't use the grid, so skip entirely for them.
  useEffect(() => {
    if (isCoordinator || orderedCategories.length === 0) return
    const cards = orderedCategories
      .map((cat) => categoryCardRefs.current[cat])
      .filter((el): el is HTMLElement => el != null)
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length === 0) return
        const topmost = intersecting.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        const cat = topmost.target.getAttribute('data-category')
        if (cat) setVisibleCategory(cat)
      },
      // Treat a card as "current" once it's within the top ~30% of the
      // scroll container, so the strip updates before the card is fully in view.
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    )
    cards.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoordinator, orderedCategories.join('|')])

  function jumpToCategory(cat: string) {
    categoryCardRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <SectionCard className="p-4 sm:p-5">
        <div className="flex gap-3 items-start">
          <MemberAvatar
            name={displayProfile.name}
            status={displayProfile.status}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <MemberIdentity
                name={displayProfile.name}
                itsNo={displayProfile.its_no}
                sabeelNo={displayProfile.sabeel_no}
                size="lg"
                className="min-w-0 flex-1"
              />
              <div className="flex shrink-0 items-center gap-1">
                {canDirectEdit && (
                  <button
                    onClick={() => setCoreEditOpen(true)}
                    className="flex shrink-0 items-center gap-1 min-h-11 sm:min-h-8 px-3 sm:px-2 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 transition-colors"
                    title="Edit member details"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {canEditContact && (
                  <button
                    onClick={() => {
                      setContactForm({
                        phone: displayProfile.phone ?? '',
                        alternate_phone: displayProfile.alternate_phone ?? '',
                        email: displayProfile.email ?? '',
                        status: displayProfile.status,
                      })
                      setContactEditOpen(true)
                    }}
                    className={`${TOUCH_TARGET} shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors`}
                    title="Edit contact info"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <MemberStatusBadge status={displayProfile.status} size="md" />
              <GenderPill gender={displayProfile.gender} size="md" />
              <BaligPill status={displayProfile.balig_status} size="md" />
              {movePending && (
                <Chip size="md" tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>
                  Move pending
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className={`border-t border-border mt-4 pt-4 ${INFO_GRID}`}>
          {displayProfile.date_of_birth && (
            <InfoField label="Date of Birth" value={displayProfile.date_of_birth} />
          )}
          <InfoField label="Phone" value={displayProfile.phone} />
          {isStaff && (
            <InfoField label="Alt. Phone" value={displayProfile.alternate_phone} />
          )}
          {isStaff && <InfoField label="Email" value={displayProfile.email} />}
        </div>
      </SectionCard>

      {/* Core Edit Modal (SuperAdmin/Admin) */}
      {canDirectEdit && (
        <EditMemberModal
          open={coreEditOpen}
          onOpenChange={setCoreEditOpen}
          itsNo={displayProfile.its_no}
          initial={{
            name: displayProfile.name,
            gender: displayProfile.gender,
            date_of_birth: displayProfile.date_of_birth ?? '',
            balig_status: displayProfile.balig_status,
            phone: displayProfile.phone ?? '',
            alternate_phone: displayProfile.alternate_phone ?? '',
            email: displayProfile.email ?? '',
            status: displayProfile.status,
            notes: (displayProfile as any).notes ?? '',
          }}
          onSaved={() => router.refresh()}
        />
      )}

      {/* Contact Edit Dialog */}
      <Dialog
        open={contactEditOpen}
        onOpenChange={(open) => {
          if (!open) setContactError('')
          setContactEditOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Contact Info</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            {isStaff && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-altphone">Alt. Phone</Label>
                <Input
                  id="edit-altphone"
                  type="tel"
                  value={contactForm.alternate_phone}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, alternate_phone: e.target.value }))
                  }
                />
              </div>
            )}
            {isStaff && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            )}
            {isStaff && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={contactForm.status}
                  onChange={(e) => setContactForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-border rounded-lg h-9 px-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="deceased">Deceased</option>
                  <option value="relocated">Relocated</option>
                  <option value="left_community">Left Community</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
          {contactError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {contactError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContactEditOpen(false)}
              disabled={contactSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveContact} disabled={contactSaving}>
              {contactSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* "View All Records" — Full History Slide-over */}
      <Sheet
        open={!!historyModal}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModal(null)
            setHistoryFrom('')
            setHistoryTo('')
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-xl flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="pb-4 border-b border-border shrink-0 space-y-1">
            <SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base">
              <History className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="min-w-0 break-words">{historyModal?.caption}</span>
              <span className="font-normal text-muted-foreground">— Full History</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground break-words">
              {profile.name} · ITS {profile.its_no}
            </p>
          </SheetHeader>

          {/* Filters */}
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by Date Range
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[7.5rem]">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className="pl-8 h-11 sm:h-9 text-xs"
                  value={historyFrom}
                  onChange={e => setHistoryFrom(e.target.value)}
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <div className="relative flex-1 min-w-[7.5rem]">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className="pl-8 h-11 sm:h-9 text-xs"
                  value={historyTo}
                  onChange={e => setHistoryTo(e.target.value)}
                  placeholder="To"
                />
              </div>
              {(historyFrom || historyTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 sm:h-9 text-xs px-3 ml-auto"
                  onClick={() => { setHistoryFrom(''); setHistoryTo('') }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Entry count */}
          {!historyLoading && (
            <div className="px-4 sm:px-6 py-2 shrink-0 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {fullHistory.length} record{fullHistory.length !== 1 ? 's' : ''}
                {(historyFrom || historyTo) ? ' (filtered)' : ''}
              </span>
            </div>
          )}

          {/* Timeline entries */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6">
            {historyLoading ? (
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-px bg-muted self-stretch ml-2 mt-2 shrink-0" />
                    <div className="flex-1 pb-4">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-3 bg-muted rounded w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fullHistory.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No records found
                {(historyFrom || historyTo) ? ' for this date range.' : '.'}
              </div>
            ) : (
              <div className="relative pt-2">
                {/* Vertical timeline line */}
                <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />

                <div className="space-y-0">
                  {fullHistory.map((entry, i) => (
                    <div key={entry.id ?? i} className="relative pl-6 pb-5">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-card" />

                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        {/* Answer */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="min-w-0 text-sm font-bold text-foreground leading-snug break-words">
                            {entry.answer ?? '—'}
                          </p>
                          <span className="text-[11px] sm:text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                            {new Date(entry.submitted_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Event */}
                        {entry.event_title && (
                          <Badge
                            variant="outline"
                            className="text-[11px] sm:text-[10px] h-auto py-0.5 px-1.5 mb-2 font-normal text-muted-foreground border-amber-200 bg-amber-50 whitespace-normal break-words"
                          >
                            {entry.event_title}
                          </Badge>
                        )}

                        {/* Remarks */}
                        {entry.remarks && (
                          <p className="text-xs text-muted-foreground italic mt-1.5 border-l-2 border-border pl-2">
                            "{entry.remarks}"
                          </p>
                        )}

                        {/* Filled by */}
                        {entry.filled_by_name && (
                          <div className="flex items-center gap-1.5 mt-2.5">
                            <User className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span className="min-w-0 text-[11px] sm:text-[10px] text-muted-foreground break-words">
                              Filled by{' '}
                              <span className="font-medium text-foreground">
                                {entry.filled_by_name}
                              </span>
                              {entry.filled_by_its && (
                                <span className="ml-1 font-mono">({entry.filled_by_its})</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Location Card */}
      {(isStaff || isOwnProfile) && (
        <SectionCard className="p-4 sm:p-5">
          <SectionHeader
            icon={<MapPin className="w-4 h-4 shrink-0 text-primary" />}
            title="Location"
            action={
              <div className="flex shrink-0 items-center gap-2">
                {movePending && (
                  <Chip tone={MOVE_PENDING_TONE} title={MOVE_PENDING_TITLE}>
                    Move pending
                  </Chip>
                )}
                {canMoveHousehold && (
                  <button
                    onClick={() => setMoveOpen(true)}
                    className="flex shrink-0 items-center gap-1 min-h-11 sm:min-h-8 px-3 sm:px-2 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 transition-colors"
                    title="Move this household to a new address"
                  >
                    <MoveRight className="w-3 h-3" />
                    Change address
                  </button>
                )}
              </div>
            }
            className="mb-4"
          />
          <div className={INFO_GRID}>
            <InfoField label="Sector" value={displayProfile.sector_name} />
            <InfoField label="Subsector" value={displayProfile.subsector_name} />
            <InfoField label="Building" value={displayProfile.building_name} />
            {displayProfile.landmark && (
              <InfoField label="Landmark" value={displayProfile.landmark} />
            )}
            <InfoField label="PACI No" value={displayProfile.paci_no} />
            {displayProfile.floor_no && (
              <InfoField label="Floor" value={displayProfile.floor_no} />
            )}
            {displayProfile.flat_no && (
              <InfoField label="Flat" value={displayProfile.flat_no} />
            )}
          </div>
          {latestMove?.from_building_name && (
            <p className="mt-3 text-xs text-muted-foreground">
              Moved{' '}
              {new Date(latestMove.effective_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              from {latestMove.from_building_name}
            </p>
          )}
        </SectionCard>
      )}

      {/* Move Household Panel (SuperAdmin) */}
      {canMoveHousehold && (
        <MoveHouseholdPanel
          open={moveOpen}
          onOpenChange={setMoveOpen}
          source={{ type: 'sabeel', sabeelNo: displayProfile.sabeel_no }}
          onMoved={() => {
            router.refresh()
            fetchLatestMove()
          }}
        />
      )}

      {/* 12 Umoor Section */}
      {isCoordinator ? (
        // Coordinators only ever see their own assigned subset of umoors —
        // a small enough set that a tab strip / accordion stays quick to
        // navigate, unlike the full 12-card wall shown to everyone else.
        <SectionCard className="overflow-hidden">
          <SectionHeader
            icon={<BookOpen className="w-4 h-4 shrink-0 text-primary" />}
            title="12 Umoor Profile"
            className="px-4 sm:px-5 pt-5 pb-4 border-b border-border"
          />

          {/* Desktop Tabs */}
          <div className="hidden lg:block">
            <div className="px-4 pt-4 pb-0">
              <div className="flex gap-1 overflow-x-auto scroll-smooth snap-x bg-muted rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {orderedCategories.map((cat) => {
                  const hasData = (categoriesMap[cat]?.length ?? 0) > 0
                  const isActive = activeTab === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={`relative flex-shrink-0 snap-start inline-flex items-center min-h-11 sm:min-h-9 px-3 py-1.5 text-sm rounded-lg transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-card shadow-sm text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                      {hasData && !isActive && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <UmoorSection
                fields={categoriesMap[activeTab] ?? []}
                historicalData={historicalData}
                canEditField={canEditField}
                onSaveField={saveProfileField}
                onViewAllHistory={(fieldId, caption) => setHistoryModal({ fieldId, caption })}
              />
            </div>
          </div>

          {/* Mobile / tablet Accordion */}
          <div className="lg:hidden divide-y divide-border">
            {orderedCategories.map((cat) => {
              const hasData = (categoriesMap[cat]?.length ?? 0) > 0
              const isOpen = openAccordion === cat
              return (
                <div key={cat}>
                  <button
                    onClick={() => setOpenAccordion(isOpen ? null : cat)}
                    className="w-full flex items-center justify-between gap-2 min-h-11 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-sm font-medium text-foreground break-words">{cat}</span>
                      {hasData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1">
                      <UmoorSection
                        fields={categoriesMap[cat] ?? []}
                        historicalData={historicalData}
                        canEditField={canEditField}
                        onSaveField={saveProfileField}
                        onViewAllHistory={(fieldId, caption) =>
                          setHistoryModal({ fieldId, caption })
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      ) : (
        // Full access (staff / own profile): every category visible at once
        // as its own card — no tab click needed to see what's there. 12
        // categories lay out 4x3 on desktop, 3x4 on a laptop, 2x6 on tablet.
        <div>
          <SectionHeader
            icon={<BookOpen className="w-4 h-4 shrink-0 text-primary" />}
            title="12 Umoor Profile"
            className="mb-3"
          />

          {/* Jump-nav — desktop/tablet only. Every card is already on the
              page; this is a shortcut for people who know where they're
              going, not a second gate in front of the content. */}
          {orderedCategories.length > 1 && (
            <div className="sticky top-0 z-10 mb-3 hidden lg:block">
              <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
                {orderedCategories.map((cat) => {
                  const hasData = (categoriesMap[cat]?.length ?? 0) > 0
                  const isActive = visibleCategory === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => jumpToCategory(cat)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`relative inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat}
                      {hasData && !isActive && (
                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {orderedCategories.map((cat) => {
              const hasData = (categoriesMap[cat]?.length ?? 0) > 0
              return (
                <SectionCard
                  key={cat}
                  ref={(el) => { categoryCardRefs.current[cat] = el }}
                  data-category={cat}
                  className="flex flex-col overflow-hidden scroll-mt-28"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {cat}
                    </h3>
                    {hasData && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 p-3">
                    <UmoorSection
                      fields={categoriesMap[cat] ?? []}
                      historicalData={historicalData}
                      canEditField={canEditField}
                      onSaveField={saveProfileField}
                      onViewAllHistory={(fieldId, caption) =>
                        setHistoryModal({ fieldId, caption })
                      }
                      layout="stacked"
                    />
                  </div>
                </SectionCard>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
