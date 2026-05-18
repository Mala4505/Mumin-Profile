'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  History,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Filter,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Form } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LumaSpin } from '@/components/ui/luma-spin'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const PAGE_SIZE = 30

interface FormField {
  profile_field_id: number
  question_text: string
  sort_order: number
  field_type: string
  behavior: 'static' | 'historical'
  options: string[] | null
}

interface AudienceMember {
  its_no: number
  name: string
}

type Progress = Record<number, Record<string, string>>

interface BulkFillFormProps {
  formId: string
  role: Role
  itsNo: number
}

export function BulkFillForm({ formId, role, itsNo }: BulkFillFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<Form | null>(null)
  const [questions, setQuestions] = useState<FormField[]>([])
  const [members, setMembers] = useState<AudienceMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [progress, setProgress] = useState<Progress>({})

  const [dbValues, setDbValues] = useState<Progress>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pagination + filter state
  const [showUnfilledOnly, setShowUnfilledOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Column quick-fill state
  const [quickFillFieldId, setQuickFillFieldId] = useState<number | null>(null)
  const [quickFillValue, setQuickFillValue] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setLoadError(null)

      try {
        const formRes = await fetch(`/api/forms/${formId}`)
        if (!formRes.ok) {
          const b = await formRes.json().catch(() => ({}))
          throw new Error(b.error ?? `Failed to load form (${formRes.status})`)
        }
        const { form: formData } = await formRes.json()
        setForm(formData)

        const fieldsRes = await fetch(`/api/forms/${formId}/fields`)
        if (!fieldsRes.ok) {
          const b = await fieldsRes.json().catch(() => ({}))
          throw new Error(b.error ?? `Failed to load form fields (${fieldsRes.status})`)
        }
        const { fields } = await fieldsRes.json()
        const mapped: FormField[] = (fields ?? []).map((f: any) => ({
          profile_field_id: f.field_id,
          question_text: f.question_text ?? f.profile_field?.caption ?? '',
          sort_order: f.sort_order,
          field_type: f.field_type_override ?? f.profile_field?.field_type ?? 'text',
          behavior: f.profile_field?.behavior ?? 'historical',
          options: f.options_override ?? f.profile_field?.options ?? null,
        }))
        setQuestions(mapped.sort((a, b) => a.sort_order - b.sort_order))

        const audRes = await fetch(`/api/forms/${formId}/audience`)
        if (!audRes.ok) {
          const b = await audRes.json().catch(() => ({}))
          console.warn('audience API failed:', b.error)
          setLoadError(
            b.error ?? 'Audience could not be loaded. Check your permissions for this form.'
          )
        } else {
          const { audience } = await audRes.json()
          setMembers(audience ?? [])
        }

        // Load DB values then overlay any saved draft
        try {
          let existingBase: Progress = {}

          const pvRes = await fetch(`/api/forms/${formId}/existing-values`)
          if (pvRes.ok) {
            const { values } = await pvRes.json()
            for (const { its_no, field_id, value } of (values ?? [])) {
              if (!existingBase[its_no]) existingBase[its_no] = {}
              existingBase[its_no][field_id] = value
            }
            setDbValues(existingBase)
          }

          const saved = localStorage.getItem(`form-draft-${formId}`)
          if (saved) {
            const parsed = JSON.parse(saved) as Progress
            if (Object.keys(parsed).length > 0) {
              // Merge: DB base first, draft on top; mark draft entries dirty
              const merged: Progress = { ...existingBase }
              const newDirtyKeys = new Set<string>()
              for (const [itsNoStr, draftFields] of Object.entries(parsed)) {
                const itsNo = Number(itsNoStr)
                merged[itsNo] = { ...(existingBase[itsNo] ?? {}), ...draftFields }
                for (const key of Object.keys(draftFields)) {
                  if (key !== '_remarks') newDirtyKeys.add(`${itsNo}:${key}`)
                }
              }
              setProgress(merged)
              setDirtyKeys(newDirtyKeys)
              setDraftRestored(true)
            } else {
              if (Object.keys(existingBase).length > 0) setProgress(existingBase)
            }
          } else {
            if (Object.keys(existingBase).length > 0) setProgress(existingBase)
          }
        } catch {}
      } catch (err: any) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [formId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave draft with debounce + visual indicator
  useEffect(() => {
    if (loading) return
    if (Object.keys(progress).length === 0) return

    setSaveStatus('saving')
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`form-draft-${formId}`, JSON.stringify(progress))
        setSaveStatus('saved')
        resetTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
      } catch {
        setSaveStatus('idle')
      }
    }, 600)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [progress, formId, loading])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, showUnfilledOnly])

  const isMemberFilled = (m: AudienceMember): boolean => {
    if (questions.length === 0) return false
    const fields = progress[m.its_no]
    if (!fields) return false
    return questions.every(q => {
      const v = fields[q.profile_field_id]
      return v !== undefined && v !== ''
    })
  }

  const handleCellChange = (memberItsNo: number, fieldKey: string, value: string) => {
    setDirtyKeys((prev) => new Set(prev).add(`${memberItsNo}:${fieldKey}`))
    setProgress((prev) => ({
      ...prev,
      [memberItsNo]: {
        ...(prev[memberItsNo] ?? {}),
        [fieldKey]: value,
      },
    }))
  }

  const handleQuickFill = (fieldId: number, value: string) => {
    if (!value) return
    const filledMembers: number[] = []
    setProgress(prev => {
      const next = { ...prev }
      for (const member of members) {
        const currentVal = prev[member.its_no]?.[fieldId]
        if (!currentVal || currentVal === '') {
          next[member.its_no] = {
            ...(next[member.its_no] ?? {}),
            [fieldId]: value,
          }
          filledMembers.push(member.its_no)
        }
      }
      return next
    })
    setDirtyKeys(prev => {
      const next = new Set(prev)
      for (const itsNo of filledMembers) next.add(`${itsNo}:${fieldId}`)
      return next
    })
    setQuickFillFieldId(null)
    setQuickFillValue('')
  }

  async function handleSubmitConfirmed() {
    if (!form) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = Object.entries(progress).flatMap(([memberItsNo, fields]) =>
      Object.entries(fields)
        .filter(([key]) => key !== '_remarks' && dirtyKeys.has(`${memberItsNo}:${key}`))
        .map(([fieldId, answer]) => ({
          its_no: parseInt(memberItsNo),
          field_id: parseInt(fieldId),
          answer,
          remarks: fields['_remarks'] ?? '',
        }))
    )

    try {
      const { error: rpcErr } = await (supabase.rpc as any)('process_form_submission', {
        p_form_id: formId,
        p_filled_by: itsNo,
        p_responses: payload,
      })

      if (rpcErr) throw rpcErr
      try { localStorage.removeItem(`form-draft-${formId}`) } catch {}
      setSubmitSuccess(true)
      setShowConfirm(false)
      setTimeout(() => router.push('/forms'), 1800)
    } catch (err: any) {
      setSubmitError(err.message ?? 'Submission failed.')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-4">
        <LumaSpin />
        <p className="text-sm text-muted-foreground animate-pulse">Loading audience data…</p>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-base font-semibold text-foreground">Form submitted successfully!</p>
        <p className="text-sm text-muted-foreground">Redirecting to forms…</p>
      </div>
    )
  }

  const isExpired = !!(form?.expires_at && new Date(form.expires_at) < new Date())

  const searchFiltered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.its_no.toString().includes(searchQuery)
  )
  const filteredMembers = showUnfilledOnly
    ? searchFiltered.filter(m => !isMemberFilled(m))
    : searchFiltered

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const pagedMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const filledCount = members.filter(isMemberFilled).length
  const sessionFilledCount = members.filter((m) =>
    Object.keys(progress[m.its_no] ?? {}).some(
      (k) => k !== '_remarks' && dirtyKeys.has(`${m.its_no}:${k}`)
    )
  ).length

  return (
    <>
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Submission"
        description="Are you sure this data is confirmed and accurate? You take responsibility for this submission. This action cannot be undone."
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={handleSubmitConfirmed}
        loading={submitting}
      />

      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="-ml-2 h-8 gap-1 text-xs"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </Button>
              <span className="text-xs">•</span>
              <span className="text-xs font-mono">{formId.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{form?.title}</h1>
            {form?.description && (
              <p className="text-sm text-muted-foreground">{form.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            {saveStatus !== 'idle' && (
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                saveStatus === 'saving' ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'
              }`}>
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                {saveStatus === 'saving' ? 'Saving…' : 'Draft saved'}
              </div>
            )}

            {isExpired ? (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
                <XCircle className="w-4 h-4" /> Form Expired
              </div>
            ) : (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={submitting || sessionFilledCount === 0}
                className="px-6 shadow-lg shadow-primary/20 gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Processing…' : 'Submit All Records'}
              </Button>
            )}
          </div>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-lg px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 shrink-0" />
              Draft restored — your previous progress has been loaded.
            </div>
            <button
              onClick={() => {
                setDraftRestored(false)
                setProgress({})
                try { localStorage.removeItem(`form-draft-${formId}`) } catch {}
              }}
              className="text-xs underline underline-offset-2 shrink-0 hover:no-underline"
            >
              Clear draft
            </button>
          </div>
        )}

        {/* Load error banner */}
        {loadError && (
          <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter members by name or ITS…"
              className="pl-10 h-10 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowUnfilledOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 h-10 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
              showUnfilledOnly
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted/40 bg-card'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Unfilled only
          </button>
        </div>

        {/* Stats bar */}
        {members.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-green-700 dark:text-green-400">{filledCount}</span>
              {' '}/ {members.length} fully filled
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="font-semibold text-foreground">{members.length - filledCount}</span> remaining
            </span>
            {sessionFilledCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-primary font-medium">{sessionFilledCount} entered this session</span>
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loadError && members.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-5 py-16 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No audience members assigned</p>
            <p className="text-xs text-muted-foreground">
              Publish this form first so the audience is materialised.
            </p>
          </div>
        )}

        {/* Data grid */}
        {members.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="p-4 font-semibold text-foreground sticky left-0 bg-muted/40 z-10 backdrop-blur-sm whitespace-nowrap">
                      Member Details
                    </th>
                    {questions.map((q) => (
                      <th
                        key={q.profile_field_id}
                        className="p-4 font-semibold text-foreground min-w-[200px]"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span>{q.question_text}</span>
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md w-fit ${
                                q.behavior === 'static'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}
                            >
                              {q.behavior === 'static' ? (
                                <UserCircle className="w-3 h-3" />
                              ) : (
                                <History className="w-3 h-3" />
                              )}
                              {q.behavior === 'static' ? 'Profile' : 'Timeline'}
                            </div>
                            {!isExpired && (
                              <button
                                onClick={() => {
                                  setQuickFillFieldId(
                                    quickFillFieldId === q.profile_field_id ? null : q.profile_field_id
                                  )
                                  setQuickFillValue('')
                                }}
                                className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                  quickFillFieldId === q.profile_field_id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                }`}
                                title="Fill all unfilled members in this column at once"
                              >
                                <Zap className="w-2.5 h-2.5" />
                                Fill all
                              </button>
                            )}
                          </div>
                          {/* Quick-fill inline form */}
                          {quickFillFieldId === q.profile_field_id && (
                            <div className="flex items-center gap-1.5 mt-0.5 p-2 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="flex-1">
                                <FieldInput
                                  fieldType={q.field_type}
                                  value={quickFillValue}
                                  disabled={false}
                                  options={q.options}
                                  onChange={setQuickFillValue}
                                />
                              </div>
                              <button
                                onClick={() => handleQuickFill(q.profile_field_id, quickFillValue)}
                                disabled={!quickFillValue}
                                className="px-2 py-1.5 bg-primary text-primary-foreground rounded-md text-[10px] font-semibold disabled:opacity-40 whitespace-nowrap hover:bg-primary/90 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-4 font-semibold text-foreground min-w-[180px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedMembers.map((member) => {
                    const filled = isMemberFilled(member)
                    return (
                      <tr
                        key={member.its_no}
                        className={`hover:bg-muted/20 transition-colors group ${filled ? 'bg-green-50/30 dark:bg-green-900/5' : ''}`}
                      >
                        <td className={`p-4 sticky left-0 z-10 border-r border-border/50 group-hover:bg-muted/20 ${filled ? 'bg-green-50/30 dark:bg-green-900/5' : 'bg-card'}`}>
                          <div className="flex items-center gap-2">
                            {filled && <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />}
                            <div>
                              <div className="font-semibold text-foreground">{member.name}</div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {member.its_no}
                              </div>
                            </div>
                          </div>
                        </td>
                        {questions.map((q) => {
                          const val = progress[member.its_no]?.[q.profile_field_id] ?? ''
                          return (
                            <td key={q.profile_field_id} className="p-3">
                              <FieldInput
                                fieldType={q.field_type}
                                value={val}
                                disabled={isExpired}
                                options={q.options}
                                onChange={(v) =>
                                  handleCellChange(
                                    member.its_no,
                                    q.profile_field_id.toString(),
                                    v
                                  )
                                }
                              />
                            </td>
                          )
                        })}
                        <td className="p-3">
                          <input
                            type="text"
                            disabled={isExpired}
                            value={progress[member.its_no]?.['_remarks'] ?? ''}
                            onChange={(e) =>
                              handleCellChange(member.its_no, '_remarks', e.target.value)
                            }
                            placeholder="Optional…"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {pagedMembers.length === 0 && (
                    <tr>
                      <td
                        colSpan={questions.length + 2}
                        className="p-12 text-center text-muted-foreground"
                      >
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                        {showUnfilledOnly
                          ? 'All members on this page are filled!'
                          : 'No members match your filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {members.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground py-2">
            <span>
              Showing {filteredMembers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}
              {showUnfilledOnly ? ' unfilled' : ''} members
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-border disabled:opacity-30 hover:bg-muted/40 transition-colors text-xs"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-border disabled:opacity-30 hover:bg-muted/40 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-1 font-medium text-foreground">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-border disabled:opacity-30 hover:bg-muted/40 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-border disabled:opacity-30 hover:bg-muted/40 transition-colors text-xs"
                >
                  »
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Field input renderer ───────────────────────────────────────────────────────
function FieldInput({
  fieldType,
  value,
  disabled,
  onChange,
  options,
}: {
  fieldType: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
  options?: string[] | null
}) {
  const base =
    'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed'

  if (fieldType === 'number') {
    return (
      <input
        type="number"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`${base} w-28`}
      />
    )
  }

  if (fieldType === 'paragraph') {
    return (
      <textarea
        value={value}
        disabled={disabled}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={`${base} resize-none`}
      />
    )
  }

  if (fieldType === 'date') {
    return (
      <input
        type="date"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${base} w-40`}
      />
    )
  }

  if (fieldType === 'select' && options && options.length > 0) {
    return (
      <select
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={base}
      >
        <option value="">— Select —</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (fieldType === 'multiselect' && options && options.length > 0) {
    const selected: string[] = (() => {
      if (!value) return []
      try { return JSON.parse(value) as string[] } catch { return [] }
    })()
    return (
      <div className="flex flex-col gap-1 min-w-[140px]">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(opt)}
              onChange={e => {
                const next = e.target.checked
                  ? [...selected, opt]
                  : selected.filter(s => s !== opt)
                onChange(JSON.stringify(next))
              }}
              className="rounded"
            />
            {opt}
          </label>
        ))}
      </div>
    )
  }

  return (
    <input
      type="text"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type response…"
      className={`${base} w-36`}
    />
  )
}
