'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, BookOpen, ChevronDown, Pencil, Check, X, Loader2 } from 'lucide-react'
import type { MemberProfile } from '@/lib/members/getMemberProfile'
import type { SessionUser } from '@/lib/types/app'

interface Props {
  profile: MemberProfile
  session: SessionUser
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isMale ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-pink-100 text-pink-700 border border-pink-200'}`}>
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
  if (status === 'Balig') return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">Balig</span>
  )
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">Ghair Balig</span>
  )
}

// Editable inline field for Umoor values
function EditableField({
  field,
  canEdit,
  onSave,
}: {
  field: MemberProfile['profile_values'][number]
  canEdit: boolean
  onSave: (fieldId: number, value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(field.value ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(field.field_id, val)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setVal(field.value ?? '')
    setEditing(false)
  }

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/60 group">
      <span className="block text-xs text-muted-foreground mb-1">{field.caption}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            className="flex-1 text-sm bg-white border border-primary/40 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={save} disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={cancel} className="p-1 rounded text-muted-foreground hover:bg-muted/40">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{field.value ?? '—'}</span>
          {canEdit && (
            <button
              onClick={() => { setVal(field.value ?? ''); setEditing(true) }}
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

function UmoorSection({
  fields,
  canEditField,
  onSaveField,
}: {
  fields: MemberProfile['profile_values']
  canEditField: (field: MemberProfile['profile_values'][number]) => boolean
  onSaveField: (fieldId: number, value: string) => Promise<void>
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
      {fields.map(f => (
        <EditableField key={f.field_id} field={f} canEdit={canEditField(f)} onSave={onSaveField} />
      ))}
    </div>
  )
}

export function MemberProfileView({ profile, session }: Props) {
  const router = useRouter()
  const isStaff = session.role === 'SuperAdmin' || session.role === 'Masool' || session.role === 'Musaid'
  const isOwnProfile = session.its_no === profile.its_no

  // All state at the top — hooks must never be declared after computations
  const [editingContact, setEditingContact] = useState(false)
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

  const canEditContact = isStaff || isOwnProfile

  async function saveContact() {
    setContactSaving(true)
    setContactError('')

    const body: Record<string, unknown> = { phone: contactForm.phone || null, email: contactForm.email || null }
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

    setDisplayProfile(prev => ({
      ...prev,
      phone: contactForm.phone || null,
      alternate_phone: contactForm.alternate_phone || null,
      email: contactForm.email || null,
      status: contactForm.status,
    }))
    setEditingContact(false)
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
      setDisplayProfile(prev => ({
        ...prev,
        profile_values: prev.profile_values.map(pv =>
          pv.field_id === fieldId ? { ...pv, value } : pv
        ),
      }))
      router.refresh()
    }
  }

  function canEditField(field: MemberProfile['profile_values'][number]) {
    if (session.role === 'SuperAdmin') return true
    if (isStaff) return true
    if (isOwnProfile && field.mumin_can_edit) return true
    return false
  }

  // Filter and group profile values
  const visibleValues = displayProfile.profile_values
    .filter(pv => {
      if (session.role === 'SuperAdmin') return true
      if (isStaff) return pv.visibility_level <= 2
      return pv.visibility_level === 1
    })
    .sort((a, b) => a.category_sort_order - b.category_sort_order || a.sort_order - b.sort_order)

  const categoriesMap = visibleValues.reduce<Record<string, typeof profile.profile_values>>((acc, pv) => {
    if (!acc[pv.category_name]) acc[pv.category_name] = []
    acc[pv.category_name].push(pv)
    return acc
  }, {})

  const orderedCategories = [
    ...UMOOR_CATEGORIES.filter(cat => categoriesMap[cat] !== undefined || true),
    ...Object.keys(categoriesMap).filter(cat => !UMOOR_CATEGORIES.includes(cat)),
  ]

  const initials = displayProfile.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const statusCls = STATUS_STYLES[displayProfile.status] ?? 'bg-gray-100 text-gray-500 border border-gray-200'
  const statusLabel = STATUS_LABELS[displayProfile.status] ?? displayProfile.status

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">{displayProfile.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ITS {displayProfile.its_no}
                  <span className="mx-1.5">·</span>
                  Sabeel {displayProfile.sabeel_no}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCls}`}>
                  {statusLabel}
                </span>
                {canEditContact && !editingContact && (
                  <button
                    onClick={() => { setContactForm({ phone: displayProfile.phone ?? '', alternate_phone: displayProfile.alternate_phone ?? '', email: displayProfile.email ?? '', status: displayProfile.status }); setEditingContact(true) }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    title="Edit contact info"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <GenderPill gender={displayProfile.gender} />
              <BaligPill status={displayProfile.balig_status} />
            </div>
          </div>
        </div>

        <div className="border-t border-border my-5" />

        {/* Contact view */}
        {!editingContact && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {displayProfile.date_of_birth && <InfoField label="Date of Birth" value={displayProfile.date_of_birth} />}
            <InfoField label="Phone" value={displayProfile.phone ?? '—'} />
            {isStaff && <InfoField label="Alt. Phone" value={displayProfile.alternate_phone ?? '—'} />}
            {isStaff && <InfoField label="Email" value={displayProfile.email ?? '—'} />}
          </div>
        )}

        {/* Contact edit form */}
        {editingContact && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-border rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              {isStaff && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Alt. Phone</label>
                  <input
                    type="tel"
                    value={contactForm.alternate_phone}
                    onChange={e => setContactForm(f => ({ ...f, alternate_phone: e.target.value }))}
                    className="w-full border border-border rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}
              {isStaff && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-border rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}
              {isStaff && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Status</label>
                  <select
                    value={contactForm.status}
                    onChange={e => setContactForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-border rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{contactError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditingContact(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveContact}
                disabled={contactSaving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-1.5"
              >
                {contactSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Location Card — staff only */}
      {isStaff && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Location</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <InfoField label="Sector" value={displayProfile.sector_name} />
            <InfoField label="Subsector" value={displayProfile.subsector_name} />
            <InfoField label="Building" value={displayProfile.building_name} />
            <InfoField label="PACI No" value={displayProfile.paci_no} />
            {displayProfile.floor_no && <InfoField label="Floor" value={displayProfile.floor_no} />}
            {displayProfile.flat_no && <InfoField label="Flat" value={displayProfile.flat_no} />}
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
              {orderedCategories.map(cat => {
                const hasData = (categoriesMap[cat]?.length ?? 0) > 0
                const isActive = activeTab === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`relative flex-shrink-0 px-3 py-1.5 text-sm rounded-lg transition-all whitespace-nowrap ${isActive ? 'bg-card shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
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
              canEditField={canEditField}
              onSaveField={saveProfileField}
            />
          </div>
        </div>

        {/* Mobile Accordion */}
        <div className="md:hidden divide-y divide-border">
          {orderedCategories.map(cat => {
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
                    {hasData && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1">
                    <UmoorSection
                      fields={categoriesMap[cat] ?? []}
                      canEditField={canEditField}
                      onSaveField={saveProfileField}
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
