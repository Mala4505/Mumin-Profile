'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Save, Send } from 'lucide-react'
import type { Form, FormQuestion } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AudienceMember {
  its_no: string
  name: string
}

// progress[memberItsNo][profileFieldId] = answer
// progress[memberItsNo]['_remarks'] = remarks text
type Progress = Record<string, Record<string, string>>

interface BulkFillFormProps {
  formId: string
  role: Role
}

// ─── Save status indicator ─────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ─── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({
  onConfirm,
  onCancel,
  submitting,
}: {
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-base mb-1">
              Confirm Submission
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure this data is confirmed and accurate? You take
              responsibility for this submission. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function BulkFillForm({ formId, role }: BulkFillFormProps) {
  const router = useRouter()

  // ── Data state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Form | null>(null)
  const [audience, setAudience] = useState<AudienceMember[]>([])
  const [progress, setProgress] = useState<Progress>({})
  const [audienceWarning, setAudienceWarning] = useState(false)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // ── Auto-save timer ref ──────────────────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Ref to always have latest progress in the interval closure without re-scheduling
  const progressRef = useRef<Progress>(progress)
  progressRef.current = progress

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      setLoadError(null)

      // 1. Fetch form
      let fetchedForm: Form | null = null
      try {
        const res = await fetch(`/api/forms/${formId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(body.error ?? `Failed to load form (${res.status})`)
        }
        const json = await res.json()
        fetchedForm = json.form ?? json
        setForm(fetchedForm)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load form')
        setLoading(false)
        return
      }

      // 2. Fetch audience (may not exist yet — fail gracefully)
      try {
        const res = await fetch(`/api/forms/${formId}/audience`)
        if (res.status === 404 || res.status === 501) {
          setAudienceWarning(true)
        } else if (!res.ok) {
          setAudienceWarning(true)
        } else {
          const json = await res.json()
          const members: AudienceMember[] = json.audience ?? json.members ?? []
          setAudience(members)
        }
      } catch {
        setAudienceWarning(true)
      }

      // 3. Fetch saved progress (fail silently — not critical)
      try {
        const res = await fetch(`/api/forms/${formId}/progress`)
        if (res.ok) {
          const json = await res.json()
          if (json.progress && typeof json.progress === 'object') {
            setProgress(json.progress as Progress)
          }
        }
      } catch {
        // Progress restore failed — start fresh, that's fine
      }

      setLoading(false)
    }

    loadAll()
  }, [formId])

  // ── Auto-save interval (every 30 s) ─────────────────────────────────────────
  const saveProgress = useCallback(
    async (currentProgress: Progress) => {
      setSaveStatus('saving')
      try {
        const res = await fetch(`/api/forms/${formId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: currentProgress }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
        // Reset to idle after 2 s
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    },
    [formId]
  )

  useEffect(() => {
    // Only start timer once data is loaded
    if (loading || !form) return

    autoSaveTimerRef.current = setInterval(() => {
      saveProgress(progressRef.current)
    }, 30_000)

    return () => {
      if (autoSaveTimerRef.current !== null) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [loading, form, saveProgress])

  // ── Row completion check ─────────────────────────────────────────────────────
  const isRowComplete = useCallback(
    (memberItsNo: string): boolean => {
      if (!form) return false
      const answers = progress[memberItsNo] ?? {}
      const allAnswered = form.questions.every(
        (q) => answers[q.profile_field_id] != null && answers[q.profile_field_id] !== ''
      )
      const hasRemark = Boolean(answers['_remarks'])
      return allAnswered || hasRemark
    },
    [form, progress]
  )

  const completeCount = audience.filter((m) => isRowComplete(m.its_no)).length
  const isAllComplete = audience.length > 0 && completeCount === audience.length

  // ── Cell change handler ──────────────────────────────────────────────────────
  function handleCellChange(
    memberItsNo: string,
    fieldKey: string,
    value: string
  ) {
    setProgress((prev) => ({
      ...prev,
      [memberItsNo]: {
        ...(prev[memberItsNo] ?? {}),
        [fieldKey]: value,
      },
    }))
  }

  // ── Blur → autosave ──────────────────────────────────────────────────────────
  function handleCellBlur() {
    saveProgress(progressRef.current)
  }

  // ── Manual save ─────────────────────────────────────────────────────────────
  function handleManualSave() {
    saveProgress(progressRef.current)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmitConfirmed() {
    if (!form) return
    setSubmitting(true)
    setSubmitError(null)

    const responses: Array<{
      profile_field_id: string
      its_no: string
      answer: string
      remarks: string
    }> = []

    for (const member of audience) {
      for (const q of form.questions) {
        const answer = progress[member.its_no]?.[q.profile_field_id]
        if (answer != null && answer !== '') {
          responses.push({
            profile_field_id: q.profile_field_id,
            its_no: member.its_no,
            answer,
            remarks: progress[member.its_no]?.['_remarks'] ?? '',
          })
        }
      }
    }

    try {
      const res = await fetch(`/api/forms/${formId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Submission failed (${res.status})`)
      }
      setSubmitSuccess(true)
      setShowConfirm(false)
      // Redirect after brief success display
      setTimeout(() => router.push('/forms'), 2000)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render: loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading form…</p>
      </div>
    )
  }

  // ── Render: load error ────────────────────────────────────────────────────────
  if (loadError || !form) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-6 py-4 text-sm max-w-md text-center">
          <XCircle className="w-6 h-6 mx-auto mb-2" />
          <p className="font-medium mb-1">Failed to load form</p>
          <p className="text-destructive/80">{loadError ?? 'Form not found'}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  // ── Render: submit success ────────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-base font-semibold text-foreground">
          Form submitted successfully!
        </p>
        <p className="text-sm text-muted-foreground">Redirecting to forms…</p>
      </div>
    )
  }

  // ── Render: main ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Confirmation modal ──────────────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          onConfirm={handleSubmitConfirmed}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground text-base truncate">
            {form.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {audience.length > 0
              ? `${completeCount} of ${audience.length} members complete`
              : 'No audience members loaded'}
          </p>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="w-3.5 h-3.5" />
              Save failed
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Save Progress
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!isAllComplete || submitting}
            title={!isAllComplete ? 'Complete all rows before submitting' : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Audience warning */}
        {audienceWarning && (
          <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Audience not loaded — please contact admin.
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Empty audience (no warning, just no rows) */}
        {!audienceWarning && audience.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-5 py-16 text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              No audience members assigned
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your admin to assign audience members to this form.
            </p>
          </div>
        )}

        {/* Table */}
        {audience.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm border-collapse">
              {/* Header */}
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {/* Member name col */}
                  <th className="sticky left-0 z-10 bg-muted/40 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap min-w-[160px]">
                    Member
                  </th>
                  {/* Question cols */}
                  {form.questions
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((q) => (
                      <th
                        key={q.profile_field_id}
                        className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap min-w-[140px]"
                      >
                        {q.question_text}
                      </th>
                    ))}
                  {/* Remarks col */}
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap min-w-[180px]">
                    Remarks
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {audience.map((member, idx) => {
                  const complete = isRowComplete(member.its_no)
                  const rowBorderClass = complete
                    ? 'border-l-4 border-green-500'
                    : 'border-l-4 border-red-400'

                  return (
                    <tr
                      key={member.its_no}
                      className={`${rowBorderClass} border-b border-border last:border-b-0 ${
                        idx % 2 === 1 ? 'bg-muted/20' : ''
                      } transition-colors`}
                    >
                      {/* Member name — sticky */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-1.5 font-medium text-foreground whitespace-nowrap text-xs">
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-muted-foreground font-normal">
                            {member.its_no}
                          </span>
                        </div>
                      </td>

                      {/* Question cells */}
                      {form.questions
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((q) => {
                          const currentValue =
                            progress[member.its_no]?.[q.profile_field_id] ?? ''

                          // Determine field_type from profile_field_id heuristic
                          // (actual field_type lives on ProfileField, not FormQuestion)
                          // We detect via the question metadata if available — fall back to text
                          const fieldType = (q as FormQuestion & { field_type?: string }).field_type

                          return (
                            <td
                              key={q.profile_field_id}
                              className="px-3 py-1.5 align-middle"
                            >
                              {fieldType === 'boolean' ? (
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={currentValue === 'true'}
                                    onChange={(e) =>
                                      handleCellChange(
                                        member.its_no,
                                        q.profile_field_id,
                                        e.target.checked ? 'true' : 'false'
                                      )
                                    }
                                    onBlur={handleCellBlur}
                                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {currentValue === 'true' ? 'Yes' : 'No'}
                                  </span>
                                </label>
                              ) : fieldType === 'number' ? (
                                <input
                                  type="number"
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleCellChange(
                                      member.its_no,
                                      q.profile_field_id,
                                      e.target.value
                                    )
                                  }
                                  onBlur={handleCellBlur}
                                  className="w-24 bg-transparent border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                  placeholder="0"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleCellChange(
                                      member.its_no,
                                      q.profile_field_id,
                                      e.target.value
                                    )
                                  }
                                  onBlur={handleCellBlur}
                                  className="w-32 bg-transparent border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                  placeholder="—"
                                />
                              )}
                            </td>
                          )
                        })}

                      {/* Remarks cell */}
                      <td className="px-3 py-1.5 align-middle">
                        <input
                          type="text"
                          value={progress[member.its_no]?.['_remarks'] ?? ''}
                          onChange={(e) =>
                            handleCellChange(member.its_no, '_remarks', e.target.value)
                          }
                          onBlur={handleCellBlur}
                          className="w-full min-w-[160px] bg-transparent border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                          placeholder="Optional remarks…"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

