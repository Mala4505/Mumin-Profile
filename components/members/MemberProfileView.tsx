'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MemberProfile } from '@/lib/members/getMemberProfile'
import type { SessionUser } from '@/lib/types/app'
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

interface Props {
  profile: MemberProfile
  session: SessionUser
  initialResponses?: InitialResponse[]
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

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  deceased: 'bg-gray-100 text-gray-500 border border-gray-200',
  relocated: 'bg-blue-100 text-blue-700 border border-blue-200',
  left_community: 'bg-red-100 text-red-700 border border-red-200',
  inactive: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  deceased: 'Deceased',
  relocated: 'Relocated',
  left_community: 'Left Community',
  inactive: 'Inactive',
}

const UMOOR_CATEGORIES = [
  'Deeniyah', 'Talimiyah', 'Kharejiyah', 'Dakheliyah',
  'Sehhat', 'Faizul Mawaidil Burhaniyah', 'Mawarid Bashariyah',
  'Iqtesaadiyah', 'Maliyah', 'Amlaak', 'Marafiq Burhaniyah', 'Qaza',
]

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground mb-0.5">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  )
}

function GenderPill({ gender }: { gender: 'M' | 'F' }) {
  const isMale = gender === 'M'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isMale
          ? 'bg-blue-100 text-blue-700 border border-blue-200'
          : 'bg-pink-100 text-pink-700 border border-pink-200'
      }`}
    >
      {isMale ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="14" r="5" /><line x1="19" y1="5" x2="14.14" y2="9.86" /><polyline points="15 5 19 5 19 9" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="9" r="5" /><line x1="12" y1="14" x2="12" y2="22" /><line x1="9" y1="19" x2="15" y2="19" />
        </svg>
      )}
      {isMale ? 'Male' : 'Female'}
    </span>
  )
}

function BaligPill({ status }: { status: string }) {
  if (status === 'Balig')
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        Balig
      </span>
    )
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
      Ghair Balig
    </span>
  )
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
            className="flex-1 h-8 text-sm"
          />
          <button
            onClick={save}
            disabled={saving}
            className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={cancel}
            className="p-1 rounded text-muted-foreground hover:bg-muted/40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{field.value ?? '—'}</span>
          {canEdit && (
            <button
              onClick={() => {
                setVal(field.value ?? '')
                setEditing(true)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
            >
              <Pencil className="w-3 h-3" />
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
                <span className="text-sm font-semibold text-foreground">{entry.answer}</span>
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                  {new Date(entry.submitted_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {entry.event_title ?? 'Record'}
              </p>
            </div>
          ))}
        </div>
      )}

      {history.length > 3 && (
        <button
          onClick={onViewAll}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
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
}: {
  fields: MemberProfile['values']
  historicalData: Record<number, HistoryEntry[]>
  canEditField: (field: MemberProfile['values'][number]) => boolean
  onSaveField: (fieldId: number, value: string) => Promise<void>
  onViewAllHistory: (fieldId: number, caption: string) => void
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
export function MemberProfileView({ profile, session, initialResponses = [] }: Props) {
  const router = useRouter()
  const isStaff =
    session.role === 'SuperAdmin' ||
    session.role === 'Admin' ||
    session.role === 'Masool' ||
    session.role === 'Musaid'
  const isOwnProfile = session.its_no === profile.its_no

  const [contactEditOpen, setContactEditOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    phone: profile.phone ?? '',
    alternate_phone: profile.alternate_phone ?? '',
    email: profile.email ?? '',
    status: profile.status,
  })
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState('')
  const [displayProfile, setDisplayProfile] = useState(profile)
  const [activeTab, setActiveTab] = useState<string>(UMOOR_CATEGORIES[0])
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

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
    if (session.role === 'SuperAdmin') return true
    if (isStaff) return true
    if (isOwnProfile && field.mumin_can_edit) return true
    return false
  }

  // Filter and group profile values
  const visibleValues = displayProfile.values
    .filter((pv) => {
      if (session.role === 'SuperAdmin') return true
      if (isStaff) return pv.visibility_level <= 2
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

  const orderedCategories = [
    ...UMOOR_CATEGORIES.filter(() => true),
    ...Object.keys(categoriesMap).filter((cat) => !UMOOR_CATEGORIES.includes(cat)),
  ]

  const initials = displayProfile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  const statusCls =
    STATUS_STYLES[displayProfile.status] ?? 'bg-gray-100 text-gray-500 border border-gray-200'
  const statusLabel = STATUS_LABELS[displayProfile.status] ?? displayProfile.status


  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex gap-3 items-start">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold select-none">
              {initials}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                displayProfile.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {displayProfile.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ITS {displayProfile.its_no}
                  <span className="mx-1.5">·</span>
                  Sabeel {displayProfile.sabeel_no}
                </p>
              </div>
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
                  className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="Edit contact info"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}
              >
                {statusLabel}
              </span>
              <GenderPill gender={displayProfile.gender} />
              <BaligPill status={displayProfile.balig_status} />
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-4 pt-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          {displayProfile.date_of_birth && (
            <InfoField label="Date of Birth" value={displayProfile.date_of_birth} />
          )}
          <InfoField label="Phone" value={displayProfile.phone ?? '—'} />
          {isStaff && (
            <InfoField label="Alt. Phone" value={displayProfile.alternate_phone ?? '—'} />
          )}
          {isStaff && <InfoField label="Email" value={displayProfile.email ?? '—'} />}
        </div>
      </div>

      {/* Contact Edit Dialog */}
      <Dialog
        open={contactEditOpen}
        onOpenChange={(open) => {
          if (!open) setContactError('')
          setContactEditOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
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
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-amber-500 shrink-0" />
              {historyModal?.caption}
              <span className="font-normal text-muted-foreground">— Full History</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.name} · ITS {profile.its_no}
            </p>
          </SheetHeader>

          {/* Filters */}
          <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by Date Range
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8 h-8 text-xs"
                  value={historyFrom}
                  onChange={e => setHistoryFrom(e.target.value)}
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <div className="flex-1 relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8 h-8 text-xs"
                  value={historyTo}
                  onChange={e => setHistoryTo(e.target.value)}
                  placeholder="To"
                />
              </div>
              {(historyFrom || historyTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-2"
                  onClick={() => { setHistoryFrom(''); setHistoryTo('') }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Entry count */}
          {!historyLoading && (
            <div className="px-5 py-2 shrink-0 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {fullHistory.length} record{fullHistory.length !== 1 ? 's' : ''}
                {(historyFrom || historyTo) ? ' (filtered)' : ''}
              </span>
            </div>
          )}

          {/* Timeline entries */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
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
                          <p className="text-sm font-bold text-foreground leading-snug">
                            {entry.answer ?? '—'}
                          </p>
                          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
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
                            className="text-[10px] h-5 px-1.5 mb-2 font-normal text-muted-foreground border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
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
                            <User className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-[10px] text-muted-foreground">
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Location</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
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
        </div>
      )}

      {/* 12 Umoor Section */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">12 Umoor Profile</h2>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <div className="px-4 pt-4 pb-0">
            <div className="flex gap-1 overflow-x-auto bg-muted rounded-xl p-1">
              {orderedCategories.map((cat) => {
                const hasData = (categoriesMap[cat]?.length ?? 0) > 0
                const isActive = activeTab === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`relative flex-shrink-0 px-3 py-1.5 text-sm rounded-lg transition-all whitespace-nowrap ${
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
          <div className="p-5">
            <UmoorSection
              fields={categoriesMap[activeTab] ?? []}
              historicalData={historicalData}
              canEditField={canEditField}
              onSaveField={saveProfileField}
              onViewAllHistory={(fieldId, caption) => setHistoryModal({ fieldId, caption })}
            />
          </div>
        </div>

        {/* Mobile Accordion */}
        <div className="md:hidden divide-y divide-border">
          {orderedCategories.map((cat) => {
            const hasData = (categoriesMap[cat]?.length ?? 0) > 0
            const isOpen = openAccordion === cat
            return (
              <div key={cat}>
                <button
                  onClick={() => setOpenAccordion(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cat}</span>
                    {hasData && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
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
      </div>
    </div>
  )
}
