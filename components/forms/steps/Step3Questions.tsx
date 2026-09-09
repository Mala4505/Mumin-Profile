'use client'

import { useEffect, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  History,
  UserCircle,
  MoreVertical,
  Eye,
  EyeOff,
  Loader2,
  PlusCircle,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FormQuestion } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import type { FormDraft } from '../FormBuilder'

interface ProfileField {
  id: number
  caption: string
  field_type: string
  behavior: 'static' | 'historical'
  options?: string[] | null
}

interface Props {
  draft: Partial<FormDraft>
  update: (patch: Partial<FormDraft>) => void
  onNext: () => void
  onBack: () => void
  role: Role
  umoorIds?: number[]
}

const selectClass =
  'appearance-none w-full bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer'

const QUESTION_TYPES = [
  { value: 'text',         label: 'Short Text'     },
  { value: 'paragraph',   label: 'Paragraph'       },
  { value: 'number',      label: 'Number'          },
  { value: 'date',        label: 'Date'            },
  { value: 'select',      label: 'Single Choice'   },
  { value: 'multiselect', label: 'Multiple Choice' },
] as const

const CREATE_FIELD_TYPES = [
  { value: 'text',        label: 'Text' },
  { value: 'number',      label: 'Number' },
  { value: 'date',        label: 'Date' },
  { value: 'select',      label: 'Select (single choice)' },
  { value: 'multiselect', label: 'Multiselect (multiple choice)' },
] as const

const VISIBILITY_ROLES: { role: Role; label: string; desc: string }[] = [
  { role: 'Mumin',  label: 'Mumin',  desc: 'Mumineen' },
  { role: 'Musaid', label: 'Musaid', desc: 'Sub-sector'  },
  { role: 'Masool', label: 'Masool', desc: 'Sector'     },
]

function VisibilityDropdown({
  hidden,
  onChange,
  onClose,
}: {
  hidden: Role[]
  onChange: (roles: Role[]) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function toggle(role: Role) {
    onChange(
      hidden.includes(role) ? hidden.filter(r => r !== role) : [...hidden, role]
    )
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 bg-card border border-border rounded-xl shadow-lg p-3 space-y-2"
      style={{ animation: 'visDropIn 140ms cubic-bezier(0.23,1,0.32,1) both' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1 border-b border-border">
        Hide this question from
      </p>
      {VISIBILITY_ROLES.map(({ role, label, desc }) => (
        <label
          key={role}
          className="flex items-start gap-2.5 cursor-pointer group px-1 py-0.5 rounded-lg hover:bg-muted/40"
        >
          <div
            className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              hidden.includes(role)
                ? 'bg-destructive border-destructive'
                : 'border-border group-hover:border-muted-foreground'
            }`}
            onClick={() => toggle(role)}
          >
            {hidden.includes(role) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={hidden.includes(role)}
            onChange={() => toggle(role)}
          />
          <div>
            <span className="text-sm text-foreground">{label}</span>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </label>
      ))}
    </div>
  )
}

export function Step3Questions({ draft, update, onNext, onBack, role, umoorIds }: Props) {
  const isCoordinator = role === 'UmoorCoordinator'
  const canCreateField =
    role === 'SuperAdmin' || role === 'Admin' || role === 'UmoorCoordinator'

  const [fields, setFields] = useState<ProfileField[]>([])
  const [questions, setQuestions] = useState<FormQuestion[]>(draft.questions ?? [])
  const [attempted, setAttempted] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [scopedEmpty, setScopedEmpty] = useState(false)

  // Create-new-field modal state (mirrors FormEditClient)
  const [showCreate, setShowCreate] = useState(false)
  const [createCaption, setCreateCaption] = useState('')
  const [createType, setCreateType] = useState('text')
  const [createOptions, setCreateOptions] = useState<string[]>([''])
  const [createBehavior, setCreateBehavior] = useState<'static' | 'historical'>('static')
  const [createCategoryId, setCreateCategoryId] = useState<number | ''>('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let query = supabase
      .from('profile_field')
      .select('id, caption, field_type, behavior, options')
      .eq('is_active', true)
      .order('caption')
    // Scope the picker to the selected Umoor when one is set (it's optional).
    if (draft.umoor_category_id) {
      query = query.eq('category_id', draft.umoor_category_id)
    }
    query.then(async ({ data }) => {
      const scoped = (data ?? []) as ProfileField[]
      setScopedEmpty(Boolean(draft.umoor_category_id) && scoped.length === 0)
      // Keep any already-selected fields available even if they now fall outside
      // the Umoor scope (e.g. user picked an Umoor after adding a question).
      const missingIds = (draft.questions ?? [])
        .map((q) => q.profile_field_id)
        .filter((id) => id > 0 && !scoped.some((f) => f.id === id))
      if (missingIds.length === 0) {
        setFields(scoped)
        return
      }
      const { data: extra } = await supabase
        .from('profile_field')
        .select('id, caption, field_type, behavior, options')
        .in('id', missingIds)
      setFields([...scoped, ...((extra ?? []) as ProfileField[])])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.umoor_category_id])

  function sync(updated: FormQuestion[]) {
    setQuestions(updated)
    update({ questions: updated })
  }

  function addQuestion() {
    sync([...questions, {
      profile_field_id: 0,
      question_text: '',
      sort_order: questions.length,
      field_type_override: 'text',
      options_override: null,
      hidden_from_roles: [],
    }])
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
    sync(questions.map((q, i) =>
      i === index
        ? {
            ...q,
            profile_field_id: field_id ? Number(field_id) : 0,
            question_text: q.question_text || field?.caption || '',
            field_type_override: q.field_type_override || field?.field_type || 'text',
          }
        : q
    ))
  }

  function updateText(index: number, text: string) {
    sync(questions.map((q, i) => (i === index ? { ...q, question_text: text } : q)))
  }

  function updateType(index: number, type: string) {
    sync(questions.map((q, i) =>
      i === index
        ? {
            ...q,
            field_type_override: type,
            options_override: type === 'select' || type === 'multiselect'
              ? (q.options_override?.length ? q.options_override : [''])
              : null,
          }
        : q
    ))
  }

  function updateOptions(index: number, opts: string[]) {
    sync(questions.map((q, i) => i === index ? { ...q, options_override: opts } : q))
  }

  function updateHiddenRoles(index: number, roles: Role[]) {
    sync(questions.map((q, i) => i === index ? { ...q, hidden_from_roles: roles } : q))
  }

  function openCreate() {
    setCreateCaption('')
    setCreateType('text')
    setCreateOptions([''])
    setCreateBehavior('static')
    setCreateCategoryId(draft.umoor_category_id ?? '')
    setCreateError(null)
    setShowCreate(true)
    setCategoriesLoading(true)
    const supabase = createClient()
    supabase
      .from('profile_category')
      .select('id, name')
      .order('name')
      .then(({ data, error: catErr }) => {
        setCategoriesLoading(false)
        if (catErr) { setCreateError('Failed to load categories.'); return }
        // Coordinators may only create fields inside their own umoors.
        const cats = (data ?? []) as { id: number; name: string }[]
        setCategories(isCoordinator ? cats.filter((c) => (umoorIds ?? []).includes(c.id)) : cats)
      })
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateCaption('')
    setCreateType('text')
    setCreateOptions([''])
    setCreateBehavior('static')
    setCreateCategoryId('')
    setCreateError(null)
  }

  async function handleCreateSave() {
    setCreateError(null)
    if (!createCaption.trim()) { setCreateError('Caption is required.'); return }
    if (createCategoryId === '') { setCreateError('Please select a category.'); return }
    const nonEmpty = createOptions.map((o) => o.trim()).filter(Boolean)
    if (createType === 'select' || createType === 'multiselect') {
      if (nonEmpty.length === 0) { setCreateError('At least one option is required.'); return }
      if (new Set(nonEmpty).size !== nonEmpty.length) { setCreateError('Options must be unique.'); return }
    }
    setCreateSaving(true)
    try {
      const body: Record<string, unknown> = {
        caption: createCaption.trim(),
        field_type: createType,
        behavior: createBehavior,
        category_id: createCategoryId,
      }
      if (createType === 'select' || createType === 'multiselect') body.options = nonEmpty
      const res = await fetch('/api/admin/profile-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to create field')
      const field = json.field as ProfileField
      setFields((prev) => (prev.some((f) => f.id === field.id) ? prev : [...prev, field]))
      if (draft.umoor_category_id && Number(createCategoryId) === draft.umoor_category_id) {
        setScopedEmpty(false)
      }
      const isChoice = field.field_type === 'select' || field.field_type === 'multiselect'
      sync([...questions, {
        profile_field_id: field.id,
        question_text: field.caption,
        sort_order: questions.length,
        field_type_override: field.field_type,
        options_override: isChoice ? (field.options?.length ? field.options : ['']) : null,
        hidden_from_roles: [],
      }])
      closeCreate()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create field')
    } finally {
      setCreateSaving(false)
    }
  }

  function handleNext() {
    setAttempted(true)
    if (questions.length === 0) return
    const allValid = questions.every((q) => {
      if (!q.profile_field_id || !q.question_text.trim()) return false
      if (q.field_type_override === 'select' || q.field_type_override === 'multiselect') {
        const nonEmpty = (q.options_override ?? []).filter(o => o.trim())
        if (nonEmpty.length < 1) return false
      }
      return true
    })
    if (!allValid) return
    onNext()
  }

  const hasError = attempted && questions.length === 0
  const fieldIds = new Set(questions.map((q) => q.profile_field_id).filter((id) => id > 0))

  return (
    <>
      <style>{`
        @keyframes visDropIn {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

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
            const hidden = q.hidden_from_roles ?? []

            return (
              <div
                key={i}
                className={`flex gap-3 items-start p-3.5 rounded-lg border bg-background transition-colors ${
                  isInvalid ? 'border-destructive' : 'border-border'
                }`}
              >
                {/* Move buttons */}
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

                  {/* Question Type row */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Question Type</Label>
                    <div className="relative">
                      <select
                        value={q.field_type_override ?? 'text'}
                        onChange={(e) => updateType(i, e.target.value)}
                        className={selectClass}
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Restriction badge */}
                  {hidden.length > 0 && (
                    <div className="flex items-center col-span-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                        <EyeOff className="w-3 h-3" />
                        Hidden from: {hidden.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Options builder — single/multiple choice only */}
                  {(q.field_type_override === 'select' || q.field_type_override === 'multiselect') && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground">Options</Label>
                      <div className="space-y-1.5">
                        {(q.options_override ?? ['']).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <Input
                              placeholder={`Option ${oi + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const next = [...(q.options_override ?? [''])]
                                next[oi] = e.target.value
                                updateOptions(i, next)
                              }}
                              className="h-8 text-sm"
                            />
                            <button
                              type="button"
                              disabled={(q.options_override ?? ['']).length <= 1}
                              onClick={() => updateOptions(i, (q.options_override ?? ['']).filter((_, idx) => idx !== oi))}
                              className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateOptions(i, [...(q.options_override ?? ['']), ''])}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add option
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row actions: delete + visibility ⋮ */}
                <div className="flex items-center gap-1 mt-1 shrink-0">
                  <button type="button" onClick={() => removeQuestion(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        openDropdown === i
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title="Visibility settings"
                    >
                      {hidden.length > 0 ? (
                        <Eye className="w-4 h-4 text-red-500" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </button>

                    {openDropdown === i && (
                      <VisibilityDropdown
                        hidden={hidden}
                        onChange={(roles) => {
                          updateHiddenRoles(i, roles)
                        }}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          {canCreateField && (
            <button
              type="button"
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/40 text-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create new field
            </button>
          )}

          {scopedEmpty && (
            <p className="text-xs text-muted-foreground">
              No profile fields exist for this Umoor yet.
              {canCreateField ? ' Create one to get started.' : ''}
            </p>
          )}
        </div>

        {hasError && (
          <p className="text-sm text-destructive">Add at least one question to continue.</p>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={handleNext} disabled={attempted && questions.length === 0}>
            Next: Access
          </Button>
        </div>
      </div>

      {/* Create New Field Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Create New Field</h3>
              <button
                onClick={closeCreate}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Caption <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={createCaption}
                  onChange={e => setCreateCaption(e.target.value)}
                  placeholder="e.g. Date of Birth"
                  autoFocus
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={createType}
                  onChange={e => {
                    setCreateType(e.target.value)
                    if (e.target.value !== 'select' && e.target.value !== 'multiselect') {
                      setCreateOptions([''])
                    }
                  }}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  {CREATE_FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Options builder — only for select / multiselect */}
              {(createType === 'select' || createType === 'multiselect') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Options <span className="text-destructive">*</span>
                  </label>
                  <div className="space-y-2">
                    {createOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const next = [...createOptions]
                            next[idx] = e.target.value
                            setCreateOptions(next)
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setCreateOptions(prev => prev.filter((_, i) => i !== idx))}
                          disabled={createOptions.length === 1}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCreateOptions(prev => [...prev, ''])}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add option
                    </button>
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={createCategoryId}
                  onChange={e => setCreateCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={categoriesLoading}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60"
                >
                  {categoriesLoading ? (
                    <option value="" disabled>Loading categories…</option>
                  ) : (
                    <option value="" disabled>Select a category…</option>
                  )}
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Behavior */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Behavior</label>
                <div className="flex items-center gap-4">
                  {(['static', 'historical'] as const).map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="createFieldBehavior"
                        value={b}
                        checked={createBehavior === b}
                        onChange={() => setCreateBehavior(b)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground capitalize flex items-center gap-1">
                        {b === 'static' ? <UserCircle className="w-3.5 h-3.5 text-blue-500" /> : <History className="w-3.5 h-3.5 text-amber-500" />}
                        {b === 'static' ? 'Profile (static)' : 'Event (historical)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {createError && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{createError}</p>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={closeCreate}
                disabled={createSaving}
                className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSave}
                disabled={createSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {createSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Create &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
