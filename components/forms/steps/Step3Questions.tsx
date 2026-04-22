'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Trash2, Plus, History, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FormQuestion } from '@/lib/types/forms'
import type { FormDraft } from '../FormBuilder'

interface ProfileField {
  id: number
  caption: string
  field_type: string
  behavior: 'static' | 'historical' // Added from our DB migration
}

interface Props {
  draft: Partial<FormDraft>
  update: (patch: Partial<FormDraft>) => void
  onNext: () => void
  onBack: () => void
}

const selectClass =
  'appearance-none w-full bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer'

export function Step3Questions({ draft, update, onNext, onBack }: Props) {
  const [fields, setFields] = useState<ProfileField[]>([])
  const [questions, setQuestions] = useState<FormQuestion[]>(draft.questions ?? [])
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profile_field')
      .select('id, caption, field_type, behavior') // Fetching the behavior switch
      .order('caption')
      .then(({ data }) => setFields(data ?? []))
  }, [])

  function sync(updated: FormQuestion[]) {
    setQuestions(updated)
    update({ questions: updated })
  }

  function addQuestion() {
    const newQ: FormQuestion = {
      profile_field_id: 0,
      question_text: '',
      sort_order: questions.length,
    }
    sync([...questions, newQ])
  }

  function removeQuestion(index: number) {
    sync(
      questions
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, sort_order: i }))
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...questions]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    sync(next.map((q, i) => ({ ...q, sort_order: i })))
  }

  function moveDown(index: number) {
    if (index === questions.length - 1) return
    const next = [...questions]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    sync(next.map((q, i) => ({ ...q, sort_order: i })))
  }

  function updateField(index: number, field_id: string) {
    const field = fields.find((f) => f.id === Number(field_id))
    const next = questions.map((q, i) =>
      i === index
        ? {
            ...q,
            profile_field_id: field_id ? Number(field_id) : 0,
            question_text: q.question_text || field?.caption || '',
          }
        : q
    )
    sync(next)
  }

  function updateText(index: number, text: string) {
    sync(questions.map((q, i) => (i === index ? { ...q, question_text: text } : q)))
  }

  function handleNext() {
    setAttempted(true)
    if (questions.length === 0) return
    const allValid = questions.every(
      (q) => q.profile_field_id > 0 && q.question_text.trim()
    )
    if (!allValid) return
    onNext()
  }

  const hasError = attempted && questions.length === 0
  const fieldIds = new Set(questions.map((q) => q.profile_field_id).filter((id) => id > 0))

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Questions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Map questions to profile fields. The system identifies if data is for the profile or an event history.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const isInvalid = attempted && (!q.profile_field_id || !q.question_text.trim())
          const selectedField = fields.find(f => f.id === q.profile_field_id)
          
          return (
            <div
              key={i}
              className={`flex gap-3 items-start p-3.5 rounded-lg border bg-background transition-colors ${
                isInvalid ? 'border-destructive' : 'border-border'
              }`}
            >
              <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => moveDown(i)} disabled={i === questions.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Profile Field</Label>
                    {/* Behavior Badge */}
                    {selectedField && (
                      <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                        selectedField.behavior === 'static' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedField.behavior === 'static' ? <UserCircle className="w-2.5 h-2.5"/> : <History className="w-2.5 h-2.5"/>}
                        {selectedField.behavior === 'static' ? 'Profile' : 'Event'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={q.profile_field_id || ''}
                      onChange={(e) => updateField(i, e.target.value)}
                      className={`${selectClass} ${isInvalid && !q.profile_field_id ? 'border-destructive' : ''}`}
                    >
                      <option value="">Select field...</option>
                      {fields.map((f) => (
                        <option key={f.id} value={f.id} disabled={fieldIds.has(f.id) && f.id !== q.profile_field_id}>
                          {f.caption} {f.behavior === 'historical' ? '(Event)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Question Text</Label>
                  <Input
                    placeholder="Question wording..."
                    value={q.question_text}
                    onChange={(e) => updateText(i, e.target.value)}
                    className={isInvalid && !q.question_text.trim() ? 'border-destructive focus:ring-destructive' : ''}
                  />
                </div>
              </div>

              <button type="button" onClick={() => removeQuestion(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Question
      </button>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleNext} disabled={attempted && questions.length === 0}>
          Next: Access
        </Button>
      </div>
    </div>
  )
}
