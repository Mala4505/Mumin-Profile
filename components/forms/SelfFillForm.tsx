'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Send } from 'lucide-react'
import type { Form } from '@/lib/types/forms'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Props {
  form: Form
  itsNo: number
}

export function SelfFillForm({ form, itsNo }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const questions = form.questions ?? []

  const handleChange = (profileFieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [profileFieldId]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const responses = questions
      .filter((q) => answers[q.profile_field_id] != null && answers[q.profile_field_id] !== '')
      .map((q) => ({
        profile_field_id: q.profile_field_id,
        its_no: String(itsNo),
        answer: answers[q.profile_field_id],
        remarks,
      }))

    try {
      const res = await fetch(`/api/forms/${form.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Submission failed. Please try again.')
        return
      }

      setSubmitted(true)
      setConfirmOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Form Submitted</h2>
        <p className="text-sm text-muted-foreground">Your responses have been recorded successfully.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Submission"
        description="Once submitted, your answers cannot be changed. Are you sure?"
        confirmLabel="Submit"
        onConfirm={handleSubmit}
        loading={submitting}
      />

      <div className="space-y-6">
        {/* Form header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
          )}
          {form.expires_at && (
            <p className="text-xs text-orange-600 mt-2">
              Due by: {new Date(form.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Questions */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {questions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">This form has no questions.</p>
          ) : (
            <div className="divide-y divide-border">
              {questions
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((q) => (
                  <div key={q.profile_field_id} className="p-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {q.question_text}
                    </label>
                    <input
                      type="text"
                      value={answers[q.profile_field_id] ?? ''}
                      onChange={(e) => handleChange(q.profile_field_id, e.target.value)}
                      placeholder="Your answer"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                ))}

              {/* Remarks */}
              <div className="p-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Remarks <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional remarks..."
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={questions.length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Submit Form
          </button>
        </div>
      </div>
    </>
  )
}
