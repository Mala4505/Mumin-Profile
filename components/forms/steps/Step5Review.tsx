'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/app'
import type { FormDraft } from '../FormBuilder'

interface Props {
  draft: Partial<FormDraft>
  onBack: () => void
  onComplete: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-32">{children}</dt>
  )
}

function SectionValue({ children }: { children: React.ReactNode }) {
  return <dd className="text-sm text-foreground">{children}</dd>
}

function audienceSummary(filters: FormDraft['audience_filters'] | undefined): string {
  if (!filters || filters.all !== false) return 'All members'

  const parts: string[] = []
  if (filters.gender) parts.push(filters.gender === 'male' ? 'Male only' : 'Female only')
  if (filters.balig_status) parts.push('Balig members only')
  if (filters.age_from != null || filters.age_to != null) {
    const from = filters.age_from ?? 0
    const to = filters.age_to ?? '∞'
    parts.push(`Age ${from}–${to}`)
  }
  if (filters.sector_ids?.length) parts.push(`${filters.sector_ids.length} sector(s)`)
  if (filters.subsector_ids?.length) parts.push(`${filters.subsector_ids.length} subsector(s)`)

  return parts.length > 0 ? parts.join(' · ') : 'Custom criteria (no restrictions set)'
}

function accessSummary(filler_access: FormDraft['filler_access'] | undefined): string[] {
  if (!filler_access || filler_access.fillers.length === 0) return ['No access configured']
  return filler_access.fillers.map((f) => {
    if (f.type === 'role') return `All ${f.value}s`
    if (f.type === 'specific_masool') return `${f.value.length} specific Masool(s)`
    if (f.type === 'specific_musaid') return `${f.value.length} specific Musaid(s)`
    if (f.type === 'self') return 'Members (self-fill)'
    return 'Unknown'
  })
}

export function Step5Review({ draft, onBack, onComplete }: Props) {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setRole((user?.app_metadata?.role as Role) ?? null)
    })
  }, [])

  const isAdmin = role === 'SuperAdmin' || role === 'Admin'
  const targetStatus = isAdmin ? 'published' : 'pending_approval'
  const actionLabel = isAdmin ? 'Publish' : 'Submit for Approval'

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      // POST to create the form
      const createRes = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          umoor_category_id: draft.umoor_category_id || null,
          form_type: draft.form_type ?? 'simple',
          questions: draft.questions ?? [],
          audience_filters: draft.audience_filters ?? { all: true },
          filler_access: draft.filler_access ?? { fillers: [] },
          expires_at: draft.expires_at || null,
        }),
      })

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to create form (${createRes.status})`)
      }

      const { form } = await createRes.json()

      // PUT to update status
      const updateRes = await fetch(`/api/forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })

      if (!updateRes.ok) {
        const body = await updateRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to update form status (${updateRes.status})`)
      }

      onComplete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Check the details before submitting.</p>
      </div>

      <div className="space-y-0 divide-y divide-border border border-border rounded-lg overflow-hidden">
        {/* Title & Type */}
        <div className="px-4 py-3 bg-background">
          <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <SectionLabel>Title</SectionLabel>
            <SectionValue>{draft.title || <span className="text-muted-foreground italic">Not set</span>}</SectionValue>
          </dl>
        </div>

        <div className="px-4 py-3 bg-background">
          <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <SectionLabel>Form Type</SectionLabel>
            <SectionValue>
              <span className="capitalize">{draft.form_type ?? 'simple'}</span>
            </SectionValue>
          </dl>
        </div>

        {draft.description && (
          <div className="px-4 py-3 bg-background">
            <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <SectionLabel>Description</SectionLabel>
              <SectionValue>{draft.description}</SectionValue>
            </dl>
          </div>
        )}

        {draft.expires_at && (
          <div className="px-4 py-3 bg-background">
            <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <SectionLabel>Expires</SectionLabel>
              <SectionValue>
                {new Date(draft.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </SectionValue>
            </dl>
          </div>
        )}

        {/* Audience */}
        <div className="px-4 py-3 bg-background">
          <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <SectionLabel>Audience</SectionLabel>
            <SectionValue>{audienceSummary(draft.audience_filters)}</SectionValue>
          </dl>
        </div>

        {/* Questions */}
        <div className="px-4 py-3 bg-background">
          <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <SectionLabel>Questions</SectionLabel>
            <dd>
              {!draft.questions?.length ? (
                <span className="text-sm text-muted-foreground italic">None added</span>
              ) : (
                <ol className="space-y-1 list-decimal list-inside">
                  {draft.questions.map((q, i) => (
                    <li key={i} className="text-sm text-foreground">
                      {q.question_text || <span className="italic text-muted-foreground">Unnamed question</span>}
                    </li>
                  ))}
                </ol>
              )}
            </dd>
          </dl>
        </div>

        {/* Access */}
        <div className="px-4 py-3 bg-background">
          <dl className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <SectionLabel>Access</SectionLabel>
            <dd className="space-y-1">
              {accessSummary(draft.filler_access).map((line, i) => (
                <div key={i} className="text-sm text-foreground flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                  {line}
                </div>
              ))}
            </dd>
          </dl>
        </div>
      </div>

      {/* Status badge preview */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Will be submitted as:</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          targetStatus === 'published'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        }`}>
          {targetStatus === 'published' ? 'Published' : 'Pending Approval'}
        </span>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Submitting...
            </span>
          ) : actionLabel}
        </Button>
      </div>
    </div>
  )
}
