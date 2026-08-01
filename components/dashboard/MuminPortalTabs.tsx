'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Pencil, Check, X, Loader2, FileText, Clock, CheckCircle2, XCircle, Activity, Calendar } from 'lucide-react'
import Link from 'next/link'
import { LumaSpin } from '@/components/ui/luma-spin'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InfoField } from '@/components/members/MemberPrimitives'
import { UmoorChipNav } from './UmoorChipNav'

interface ProfileValue {
  field_id: number
  caption: string
  category_name: string
  category_sort_order: number
  value: string | null
  visibility_level: number
  is_data_entry: boolean
  mumin_can_edit: boolean
  field_type: string
  sort_order: number
}

interface Form {
  id: string
  title: string
  description: string | null
  status: string
  expires_at: string | null
  is_expired: boolean
  event: { title: string; event_date: string; end_date: string | null } | null
}

interface ActivityItem {
  form_id: string
  form_title: string
  submitted_at: string
}

interface HistoricalEntry {
  answer: string
  submitted_at: string
  label: string | null
}

interface HistoricalField {
  field_id: number
  caption: string
  field_type: string
  category_name: string
  category_sort_order: number
  entries: HistoricalEntry[]
}

interface Props {
  itsNo: number
}

function groupByCategory(values: ProfileValue[]) {
  const map = new Map<string, { sort_order: number; fields: ProfileValue[] }>()
  for (const v of values) {
    if (!map.has(v.category_name)) {
      map.set(v.category_name, { sort_order: v.category_sort_order, fields: [] })
    }
    map.get(v.category_name)!.fields.push(v)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[1].sort_order - b[1].sort_order)
    .map(([name, { fields }]) => ({
      name,
      fields: fields.sort((a, b) => a.sort_order - b.sort_order),
    }))
}

function groupAllByCategory(staticFields: ProfileValue[], historicalFields: HistoricalField[]) {
  const map = new Map<string, { sort_order: number; static: ProfileValue[]; historical: HistoricalField[] }>()

  for (const f of staticFields) {
    if (!map.has(f.category_name)) {
      map.set(f.category_name, { sort_order: f.category_sort_order, static: [], historical: [] })
    }
    map.get(f.category_name)!.static.push(f)
  }

  for (const f of historicalFields) {
    if (!map.has(f.category_name)) {
      map.set(f.category_name, { sort_order: f.category_sort_order, static: [], historical: [] })
    }
    map.get(f.category_name)!.historical.push(f)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[1].sort_order - b[1].sort_order)
    .map(([name, { static: sf, historical: hf }]) => ({
      name,
      staticFields: sf.sort((a, b) => a.sort_order - b.sort_order),
      historicalFields: hf,
    }))
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const ms = new Date(expiresAt).getTime() - Date.now()
  return ms > 0 && ms < 24 * 60 * 60 * 1000
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function localISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function formatDob(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ageFromDob(iso: string): number | null {
  const dob = new Date(iso)
  if (isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age >= 0 ? age : null
}

interface ToastMsg {
  id: number
  type: 'success' | 'error'
  message: string
}

function DobRow({
  dob,
  saving,
  onSave,
}: {
  dob: string | null
  saving: boolean
  onSave: (newDob: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const today = localISODate(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const maxDate = localISODate(yesterday)

  const startEdit = () => {
    setDraft(dob ?? '')
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(null)
  }

  const submit = () => {
    if (!draft) {
      setError('Select a date')
      return
    }
    if (draft >= today) {
      setError('Date of birth must be in the past')
      return
    }
    setEditing(false)
    setError(null)
    onSave(draft)
  }

  const age = dob ? ageFromDob(dob) : null

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Date of Birth</p>
          {editing ? (
            <div className="mt-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setError(null)
                  }}
                  min="1900-01-01"
                  max={maxDate}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                    if (e.key === 'Escape') cancel()
                  }}
                  className="text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={submit} aria-label="Save date of birth" className="p-1 rounded hover:bg-muted text-green-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancel} aria-label="Cancel" className="p-1 rounded hover:bg-muted text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
          ) : dob ? (
            <p className="text-sm font-medium text-foreground">
              {formatDob(dob)}
              {age !== null && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">{age} years</span>
              )}
              {saving && <Loader2 className="ml-2 inline w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </p>
          ) : (
            <button onClick={startEdit} className="text-sm font-medium text-primary hover:underline">
              Add your date of birth
            </button>
          )}
        </div>
      </div>
      {!editing && dob && (
        <button
          onClick={startEdit}
          disabled={saving}
          aria-label="Edit date of birth"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0 disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function EditableProfileField({
  field,
  itsNo,
  onSaved,
}: {
  field: ProfileValue
  itsNo: number
  onSaved: (fieldId: number, newValue: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(field.value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/members/${itsNo}/profile-values`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: field.field_id, value: draft }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
        return
      }
      onSaved(field.field_id, draft)
      setEditing(false)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(field.value ?? '')
    setEditing(false)
    setError(null)
  }

  return (
    <div className="group rounded-lg border border-border/60 bg-muted/30 p-3">
      {editing ? (
        <div className="min-w-0">
          <span className="mb-1 block text-xs text-muted-foreground">{field.caption}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') cancel()
              }}
            />
            <button
              onClick={save}
              disabled={saving}
              aria-label={`Save ${field.caption}`}
              className="shrink-0 p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={cancel}
              aria-label="Cancel"
              className="shrink-0 p-1 rounded hover:bg-muted text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <InfoField label={field.caption} value={field.value} />
          {field.mumin_can_edit && (
            <button
              onClick={() => setEditing(true)}
              aria-label={`Edit ${field.caption}`}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function MuminPortalTabs({ itsNo }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'forms' | 'activity'>('profile')

  // Profile tab state
  const [profileValues, setProfileValues] = useState<ProfileValue[]>([])
  const [historyValues, setHistoryValues] = useState<HistoricalField[]>([])
  const [profileLoading, setProfileLoading] = useState(true)

  // Date of birth (self-service, saved via /core)
  const [dob, setDob] = useState<string | null>(null)
  const [dobSaving, setDobSaving] = useState(false)

  // Umoor section navigation
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const sectionRefs = useRef(new Map<string, HTMLElement>())
  // While a chip-triggered smooth scroll is in flight, hold that chip active
  // so intermediate sections don't flicker through the highlight.
  const scrollLockRef = useRef<{ until: number } | null>(null)

  // Toasts (same idiom as FormsClient)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const toastCounter = useRef(0)

  function pushToast(type: 'success' | 'error', message: string) {
    const id = ++toastCounter.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  // Forms + Activity tab state (loaded together on first forms/activity tab visit)
  const [forms, setForms] = useState<Form[]>([])
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(new Set())
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [formsLoaded, setFormsLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${itsNo}/profile-values`).then((r) => r.json()),
      fetch(`/api/members/${itsNo}/profile-history`).then((r) => r.json()),
    ])
      .then(([pvData, phData]) => {
        setProfileValues(pvData.profile_values ?? [])
        setHistoryValues(phData.history ?? [])
        // Defensive: `member` lands with the Phase 3 API change
        setDob(pvData.member?.date_of_birth ?? null)
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [itsNo])

  useEffect(() => {
    if ((activeTab === 'forms' || activeTab === 'activity') && !formsLoaded) {
      setFormsLoading(true)

      Promise.all([
        fetch('/api/forms').then((r) => r.json()),
        fetch(`/api/members/${itsNo}/submissions`).then((r) => r.json()),
      ])
        .then(([formsData, submissionsData]) => {
          const allForms: Form[] = formsData.forms ?? []
          const published = allForms.filter((f) => f.status === 'published')
          setForms(published)

          const ids: string[] = submissionsData.submittedFormIds ?? []
          setSubmittedFormIds(new Set(ids))
          setRecentActivity(submissionsData.recentActivity ?? [])
        })
        .catch(() => {})
        .finally(() => {
          setFormsLoading(false)
          setFormsLoaded(true)
        })
    }
  }, [activeTab, formsLoaded, itsNo])

  const handleFieldSaved = (fieldId: number, newValue: string) => {
    setProfileValues((prev) =>
      prev.map((v) => (v.field_id === fieldId ? { ...v, value: newValue } : v))
    )
  }

  const mergedCategories = useMemo(() => {
    const cats = groupAllByCategory(profileValues, historyValues)
    const seen = new Set<string>()
    return cats.map((c) => {
      const base = slugify(c.name) || 'umoor'
      let id = base
      let n = 2
      while (seen.has(id)) id = `${base}-${n++}`
      seen.add(id)
      const filled =
        c.staticFields.filter((f) => f.value !== null && f.value !== '').length +
        c.historicalFields.filter((f) => f.entries.length > 0).length
      const total = c.staticFields.length + c.historicalFields.length
      return { ...c, id, filled, total }
    })
  }, [profileValues, historyValues])

  // ── Sticky chip nav geometry ────────────────────────────────────────────────
  // The Mumin layout branch scrolls the WINDOW; the only fixed overlay is the
  // portal header (MobileHeader, a 56px row plus env(safe-area-inset-top) —
  // `main` clears it with pt-[calc(5rem+inset)]). The chip bar sticks below the
  // header; sections need header (56) + chip bar (~48) + breathing room ≈ 112px.
  const ACTIVATION_LINE_PX = 120

  // Track which section is currently in view (rAF-throttled window scroll).
  useEffect(() => {
    if (activeTab !== 'profile' || mergedCategories.length === 0) return
    let raf = 0
    const compute = () => {
      raf = 0
      const lock = scrollLockRef.current
      if (lock && Date.now() < lock.until) return
      const ids = mergedCategories.map((c) => c.id)
      let current = ids[0]
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        // Sections near the end can never reach the activation line
        current = ids[ids.length - 1]
      } else {
        for (const id of ids) {
          const el = sectionRefs.current.get(id)
          if (el && el.getBoundingClientRect().top <= ACTIVATION_LINE_PX) current = id
        }
      }
      setActiveSectionId((prev) => (prev === current ? prev : current))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [activeTab, mergedCategories])

  const handleChipClick = (id: string) => {
    const el = sectionRefs.current.get(id)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setActiveSectionId(id)
    scrollLockRef.current = { until: Date.now() + (reduced ? 150 : 1000) }
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const handleDobSave = async (newDob: string) => {
    const prev = dob
    setDob(newDob) // optimistic
    setDobSaving(true)
    try {
      const res = await fetch(`/api/members/${itsNo}/core`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: newDob }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to update date of birth')
      }
      pushToast('success', 'Date of birth updated.')
    } catch (e) {
      setDob(prev)
      pushToast('error', e instanceof Error ? e.message : 'Failed to update date of birth')
    } finally {
      setDobSaving(false)
    }
  }

  const now = new Date()
  const pendingForms = forms.filter(
    (f) => f.status === 'published' && (!f.expires_at || new Date(f.expires_at) >= now) && !submittedFormIds.has(f.id)
  )
  const completedForms = forms.filter((f) => submittedFormIds.has(f.id))

  return (
    // NOTE: no overflow-hidden here — it would break position:sticky for the
    // chip bar inside the profile tab. TabsList clips its own top corners.
    <div className="bg-card border border-border rounded-xl shadow-sm">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
                t.type === 'success'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-destructive text-destructive-foreground'
              }`}
            >
              {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {t.message}
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'profile' | 'forms' | 'activity')}>
        <TabsList className="w-full rounded-none rounded-t-xl overflow-hidden border-b border-border h-auto p-0">
          <TabsTrigger
            value="profile"
            className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5"
          >
            My Profile
          </TabsTrigger>
          <TabsTrigger
            value="forms"
            className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5"
          >
            My Forms
            {pendingForms.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {pendingForms.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="p-4 mt-0">
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <LumaSpin size={36} />
            </div>
          ) : (
            <>
              <DobRow dob={dob} saving={dobSaving} onSave={handleDobSave} />

              {mergedCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No profile data available yet.</p>
              )}

              {mergedCategories.length > 1 && (
                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mb-4 border-b border-border bg-card px-4 py-2">
                  <UmoorChipNav
                    chips={mergedCategories.map((c) => ({
                      id: c.id,
                      name: c.name,
                      filled: c.filled,
                      total: c.total,
                    }))}
                    activeId={activeSectionId}
                    onChipClick={handleChipClick}
                  />
                </div>
              )}

              <div className="space-y-4">
                {mergedCategories.map((cat) => (
                  <section
                    key={cat.id}
                    id={`umoor-section-${cat.id}`}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(cat.id, el)
                      else sectionRefs.current.delete(cat.id)
                    }}
                    className="scroll-mt-[calc(7rem+env(safe-area-inset-top))] overflow-hidden rounded-xl border border-border"
                  >
                    <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                      <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                        {cat.filled}/{cat.total} filled
                      </span>
                    </header>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {cat.staticFields.map((f) => (
                        <EditableProfileField
                          key={f.field_id}
                          field={f}
                          itsNo={itsNo}
                          onSaved={handleFieldSaved}
                        />
                      ))}
                      {cat.historicalFields.map((f) => (
                        <div
                          key={f.field_id}
                          className="rounded-lg border border-border/60 bg-muted/30 p-3"
                        >
                          <span className="mb-2 block text-xs text-muted-foreground">{f.caption}</span>
                          {f.entries.length === 0 ? (
                            <span className="block text-sm font-medium text-foreground">—</span>
                          ) : (
                            <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                              {f.entries.map((e, i) => (
                                <div key={`${e.submitted_at}-${i}`} className="relative">
                                  <div
                                    className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary/40"
                                    aria-hidden
                                  />
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="min-w-0 break-words text-sm font-medium text-foreground">
                                      {e.answer}
                                    </span>
                                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                      {e.label ?? new Date(e.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="p-4 mt-0">
          {formsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LumaSpin size={36} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending forms */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-foreground">Pending</h3>
                  {pendingForms.length > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                      {pendingForms.length}
                    </span>
                  )}
                </div>
                {pendingForms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending forms.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingForms.map((form) => (
                      <div
                        key={form.id}
                        className="border border-border rounded-lg p-3 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <p className="text-sm font-medium text-foreground truncate">{form.title}</p>
                            {isExpiringSoon(form.expires_at) && (
                              <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          {form.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>
                          )}
                          {form.event && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {form.event.title}
                            </span>
                          )}
                          {form.expires_at && (
                            <p className={`text-xs mt-1 ${isExpiringSoon(form.expires_at) ? 'text-red-600 font-medium' : 'text-orange-600'}`}>
                              Due: {new Date(form.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/forms/${form.id}/self-fill`}
                          className="shrink-0 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
                        >
                          Fill Form
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed forms */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-foreground">Completed</h3>
                </div>
                {completedForms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed forms yet.</p>
                ) : (
                  <div className="space-y-2">
                    {completedForms.map((form) => (
                      <div
                        key={form.id}
                        className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-center gap-3"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{form.title}</p>
                          {form.event && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {form.event.title}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="p-4 mt-0">
          {formsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LumaSpin size={36} />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Your form activity will appear here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Your recent form submissions</p>
              <div className="border-l-2 border-border ml-1 space-y-0">
                {recentActivity.map((item, i) => (
                  <div key={`${item.form_id}-${i}`} className="relative pl-5 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary/30 border-2 border-background" />
                    <p className="text-sm font-medium text-foreground leading-tight">{item.form_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted · {formatRelative(item.submitted_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
