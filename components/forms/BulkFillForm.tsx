'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  History,
  UserCircle,
  ChevronLeft,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Form } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LumaSpin } from '@/components/ui/luma-spin'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface FormField {
  profile_field_id: number
  question_text: string
  sort_order: number
  field_type: string
  behavior: 'static' | 'historical'
}

interface AudienceMember {
  its_no: number
  name: string
}

// progress[memberItsNo][profileFieldId] = answer
// progress[memberItsNo]['_remarks'] = remarks text
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

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setLoadError(null)

      try {
        // 1. Fetch form metadata
        const formRes = await fetch(`/api/forms/${formId}`)
        if (!formRes.ok) {
          const b = await formRes.json().catch(() => ({}))
          throw new Error(b.error ?? `Failed to load form (${formRes.status})`)
        }
        const { form: formData } = await formRes.json()
        setForm(formData)

        // 2. Fetch questions from form_fields (the relational table)
        const fieldsRes = await fetch(`/api/forms/${formId}/fields`)
        if (!fieldsRes.ok) {
          const b = await fieldsRes.json().catch(() => ({}))
          throw new Error(b.error ?? `Failed to load form fields (${fieldsRes.status})`)
        }
        const { fields } = await fieldsRes.json()
        setQuestions(
          (fields ?? []).sort((a: FormField, b: FormField) => a.sort_order - b.sort_order)
        )

        // 3. Fetch audience from form_audience JOIN mumin
        const { data: audienceData, error: audErr } = await (supabase as any)
          .from('form_audience')
          .select('its_no, mumin!inner(name)')
          .eq('form_id', formId)

        if (audErr) {
          // form_audience might not exist yet — show a warning but don't crash
          console.warn('form_audience query failed:', audErr.message)
          setLoadError(
            'Audience could not be loaded. Ensure the form_audience migration has been run in Supabase.'
          )
        } else {
          setMembers(
            (audienceData ?? []).map((a: any) => ({
              its_no: a.its_no,
              name: a.mumin?.name ?? `ITS ${a.its_no}`,
            }))
          )
        }
      } catch (err: any) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [formId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellChange = (memberItsNo: number, fieldKey: string, value: string) => {
    setProgress((prev) => ({
      ...prev,
      [memberItsNo]: {
        ...(prev[memberItsNo] ?? {}),
        [fieldKey]: value,
      },
    }))
  }

  async function handleSubmitConfirmed() {
    if (!form) return
    setSubmitting(true)
    setSubmitError(null)

    // Build relational payload: one entry per (member × field) answer
    const payload = Object.entries(progress).flatMap(([memberItsNo, fields]) =>
      Object.entries(fields)
        .filter(([key]) => key !== '_remarks')
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
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.its_no.toString().includes(searchQuery)
  )
  const filledCount = Object.keys(progress).length

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

      <div className="space-y-6 pb-20">
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
            {isExpired ? (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
                <XCircle className="w-4 h-4" /> Form Expired
              </div>
            ) : (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={submitting || filledCount === 0}
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
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filter members by name or ITS…"
            className="pl-10 h-11 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
                        className="p-4 font-semibold text-foreground min-w-[180px]"
                      >
                        <div className="flex flex-col gap-1">
                          <span>{q.question_text}</span>
                          <div
                            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md w-fit ${
                              q.behavior === 'static'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {q.behavior === 'static' ? (
                              <UserCircle className="w-3 h-3" />
                            ) : (
                              <History className="w-3 h-3" />
                            )}
                            {q.behavior === 'static' ? 'Profile' : 'Timeline'}
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="p-4 font-semibold text-foreground min-w-[180px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.its_no}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="p-4 sticky left-0 bg-card group-hover:bg-muted/20 z-10 border-r border-border/50">
                        <div className="font-semibold text-foreground">{member.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {member.its_no}
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
                      {/* Remarks */}
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
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td
                        colSpan={questions.length + 2}
                        className="p-12 text-center text-muted-foreground"
                      >
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                        No members match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-4">
          <CheckCircle className="w-3 h-3 text-primary" />
          {filledCount} of {members.length} members have at least one answer entered.
        </div>
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
}: {
  fieldType: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
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

  // text / select / multiselect — plain text input (select options not yet in schema)
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
