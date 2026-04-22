'use client'

import { useState, useEffect } from 'react'
import { Pencil, Check, X, Loader2, FileText, Clock, CheckCircle2, Activity } from 'lucide-react'
import Link from 'next/link'
import { LumaSpin } from '@/components/ui/luma-spin'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
}

interface ActivityItem {
  form_id: string
  form_title: string
  submitted_at: string
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
    <div className="group flex items-start justify-between gap-2 py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{field.caption}</p>
        {editing ? (
          <div className="space-y-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') cancel()
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">{field.value || <span className="text-muted-foreground italic">Not set</span>}</p>
        )}
      </div>
      {field.mumin_can_edit && (
        <div className="flex items-center gap-1 shrink-0 pt-4">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={cancel} className="p-1 rounded hover:bg-muted text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
  const [profileLoading, setProfileLoading] = useState(true)

  // Forms + Activity tab state (loaded together on first forms/activity tab visit)
  const [forms, setForms] = useState<Form[]>([])
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(new Set())
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [formsLoaded, setFormsLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/members/${itsNo}/profile-values`)
      .then((r) => r.json())
      .then((d) => setProfileValues(d.profile_values ?? []))
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

  const categories = groupByCategory(profileValues)

  const now = new Date()
  const pendingForms = forms.filter(
    (f) => f.status === 'published' && (!f.expires_at || new Date(f.expires_at) >= now) && !submittedFormIds.has(f.id)
  )
  const completedForms = forms.filter((f) => submittedFormIds.has(f.id))

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'profile' | 'forms' | 'activity')}>
        <TabsList className="w-full rounded-none border-b border-border h-auto p-0">
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
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No profile data available yet.</p>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {cat.name}
                  </h3>
                  <div>
                    {cat.fields.map((f) => (
                      <EditableProfileField
                        key={f.field_id}
                        field={f}
                        itsNo={itsNo}
                        onSaved={handleFieldSaved}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                        <p className="text-sm font-medium text-foreground">{form.title}</p>
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
