'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus,
  Loader2, CheckCircle, XCircle, Save, History, UserCircle,
  PlusCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/app'

const QUESTION_TYPES = [
  { value: 'text',         label: 'Short Text'     },
  { value: 'paragraph',   label: 'Paragraph'       },
  { value: 'number',      label: 'Number'          },
  { value: 'date',        label: 'Date'            },
  { value: 'select',      label: 'Single Choice'   },
  { value: 'multiselect', label: 'Multiple Choice' },
] as const

interface FormField {
  id: string
  field_id: number
  sort_order: number
  is_required: boolean
  question_text?: string | null
  field_type_override?: string | null
  options_override?: string[] | null
  profile_field: {
    id: number
    caption: string
    field_type: string
    behavior: string
    options: string[] | null
  }
}

interface ProfileField {
  id: number
  caption: string
  field_type: string
  behavior: string
  options: string[] | null
  category_id?: number
}


interface Props {
  form: {
    id: string
    title: string
    description: string
    status: string
    form_type: string
    created_by: number
    created_at: string
  }
  fields: FormField[]
  role: Role
  itsNo: number
  umoorIds?: number[]
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:            { label: 'Draft',            className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  published:        { label: 'Published',        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed:           { label: 'Closed',           className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
  expired:          { label: 'Expired',          className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

export function FormEditClient({ form, fields: initialFields, role, itsNo, umoorIds }: Props) {
  const isCoordinator = role === 'UmoorCoordinator'
  const router = useRouter()
  const [title, setTitle] = useState(form.title)
  const [description, setDescription] = useState(form.description)
  const [status, setStatus] = useState(form.status)
  const [fields, setFields] = useState<FormField[]>(initialFields)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [editingTypeIdx, setEditingTypeIdx] = useState<number | null>(null)

  const [profileFields, setProfileFields] = useState<ProfileField[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [fieldSearch, setFieldSearch] = useState('')

  // Create New Question modal state
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
      .select('id, caption, field_type, behavior, options, category_id')
      .eq('is_active', true)
      .order('caption')
    // Coordinators only pick from fields within their assigned umoors
    if (isCoordinator) {
      query = query.in('category_id', (umoorIds?.length ? umoorIds : [-1]))
    }
    query.then(({ data }) => setProfileFields((data ?? []) as ProfileField[]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openCreate() {
    setCreateCaption('')
    setCreateType('text')
    setCreateOptions([''])
    setCreateBehavior('static')
    setCreateCategoryId('')
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
        // Coordinators may only create questions inside their own umoors
        const cats = (data ?? []) as { id: number; name: string }[]
        setCategories(isCoordinator ? cats.filter(c => (umoorIds ?? []).includes(c.id)) : cats)
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
    if (createCategoryId === '') {
      setCreateError('Please select a category.')
      return
    }
    const nonEmpty = createOptions.filter(o => o.trim())
    if (createType === 'select' || createType === 'multiselect') {
      if (nonEmpty.length === 0) { setCreateError('At least one option is required.'); return }
      const unique = new Set(nonEmpty.map(o => o.trim()))
      if (unique.size !== nonEmpty.length) {
        setCreateError('Options must be unique.')
        return
      }
    }
    setCreateSaving(true)
    try {
      const body: Record<string, unknown> = {
        caption: createCaption.trim(),
        field_type: createType,
        behavior: createBehavior,
        category_id: createCategoryId,
      }
      if (createType === 'select' || createType === 'multiselect') {
        body.options = nonEmpty
      }
      const res = await fetch('/api/admin/profile-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to create question')
      const field = json.field as ProfileField
      addField(field)
      setProfileFields(prev => [...prev, field])
      closeCreate()
      showToast('success', 'Question created and added to form.')
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create question')
    } finally {
      setCreateSaving(false)
    }
  }

  const fieldIds = new Set(fields.map(f => f.field_id))

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function addField(pf: ProfileField) {
    if (fieldIds.has(pf.id)) return
    setFields(prev => [
      ...prev,
      {
        id: `new-${pf.id}`,
        field_id: pf.id,
        sort_order: prev.length,
        is_required: false,
        question_text: null,
        field_type_override: null,
        options_override: null,
        profile_field: { id: pf.id, caption: pf.caption, field_type: pf.field_type, behavior: pf.behavior, options: pf.options },
      },
    ])
    setShowAdd(false)
    setFieldSearch('')
  }

  function updateFieldType(index: number, type: string) {
    setFields(prev => prev.map((f, i) =>
      i === index
        ? {
            ...f,
            field_type_override: type,
            options_override:
              type === 'select' || type === 'multiselect'
                ? (f.options_override?.length ? f.options_override : [''])
                : null,
          }
        : f
    ))
  }

  function updateFieldOptions(index: number, opts: string[]) {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, options_override: opts } : f))
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setFields(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next.map((f, i) => ({ ...f, sort_order: i }))
    })
  }

  function moveDown(index: number) {
    setFields(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next.map((f, i) => ({ ...f, sort_order: i }))
    })
  }

  async function save(overrideStatus?: string) {
    setSaving(true)
    try {
      const [metaRes, fieldsRes] = await Promise.all([
        fetch(`/api/forms/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            ...(overrideStatus ? { status: overrideStatus } : {}),
          }),
        }),
        fetch(`/api/forms/${form.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: fields.map((f, i) => ({
              field_id: f.field_id,
              sort_order: i,
              is_required: f.is_required,
              question_text: f.question_text ?? null,
              field_type_override: f.field_type_override ?? null,
              options_override: f.options_override?.filter(o => o.trim()).length
                ? f.options_override.filter(o => o.trim())
                : null,
            })),
          }),
        }),
      ])

      if (!metaRes.ok) {
        const b = await metaRes.json().catch(() => ({}))
        throw new Error(b.error ?? 'Failed to save form')
      }
      if (!fieldsRes.ok) {
        const b = await fieldsRes.json().catch(() => ({}))
        throw new Error(b.error ?? 'Failed to save fields')
      }

      if (overrideStatus) setStatus(overrideStatus)
      showToast('success', overrideStatus === 'pending_approval' ? 'Submitted for approval.' : 'Form saved.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const isAdmin = role === 'SuperAdmin' || role === 'Admin'
  const filteredProfileFields = profileFields.filter(
    pf =>
      !fieldIds.has(pf.id) &&
      (fieldSearch === '' || pf.caption.toLowerCase().includes(fieldSearch.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/forms')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Forms
        </button>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
          <button
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Form Details</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Type:{' '}
              <span className="text-foreground font-medium">
                {form.form_type === 'simple' ? 'Profile Form' : 'Historical Form'}
              </span>
            </span>
            <span>·</span>
            <span>
              Created:{' '}
              <span className="text-foreground font-medium">
                {new Date(form.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Form Fields</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isCoordinator) && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create New Question
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No fields yet. Add fields to your form.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === fields.length - 1}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.question_text || f.profile_field.caption}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {QUESTION_TYPES.find(t => t.value === (f.field_type_override ?? f.profile_field.field_type))?.label
                        ?? (f.field_type_override ?? f.profile_field.field_type)}
                    </span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.is_required}
                        onChange={e => setFields(prev =>
                          prev.map((ff, idx) => idx === i ? { ...ff, is_required: e.target.checked } : ff)
                        )}
                        className="rounded"
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingTypeIdx(editingTypeIdx === i ? null : i)}
                      className="text-xs text-primary hover:underline"
                    >
                      {editingTypeIdx === i ? 'done' : 'edit type'}
                    </button>
                  </div>

                  {editingTypeIdx === i && (
                    <div className="mt-2 space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Question Type</label>
                        <select
                          value={f.field_type_override ?? f.profile_field.field_type}
                          onChange={e => updateFieldType(i, e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                        >
                          {QUESTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      {((f.field_type_override ?? f.profile_field.field_type) === 'select' ||
                        (f.field_type_override ?? f.profile_field.field_type) === 'multiselect') && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Options</label>
                          {(f.options_override ?? f.profile_field.options ?? ['']).map((opt, oi) => (
                            <div key={oi} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const next = [...(f.options_override ?? f.profile_field.options ?? [''])]
                                  next[oi] = e.target.value
                                  updateFieldOptions(i, next)
                                }}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 h-7 px-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={(f.options_override ?? f.profile_field.options ?? ['']).length <= 1}
                                onClick={() =>
                                  updateFieldOptions(i, (f.options_override ?? f.profile_field.options ?? ['']).filter((_, idx) => idx !== oi))
                                }
                                className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateFieldOptions(i, [...(f.options_override ?? f.profile_field.options ?? ['']), ''])}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                          >
                            <Plus className="w-3 h-3" /> Add option
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeField(i)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Actions */}
      {status === 'draft' && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            This form is a draft. Save your changes, then submit for approval to publish.
          </p>
          <button
            onClick={() => save('pending_approval')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit for Approval
          </button>
        </div>
      )}

      {status === 'pending_approval' && isAdmin && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5">
          <p className="text-sm text-green-800 dark:text-green-300 mb-3">
            This form is awaiting approval. You can publish it directly.
          </p>
          <button
            onClick={() => save('published')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Publish Form
          </button>
        </div>
      )}

      {/* Create New Question Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Create New Question</h3>
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
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select (single choice)</option>
                  <option value="multiselect">Multiselect (multiple choice)</option>
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
                        name="createBehavior"
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

      {/* Add Field Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Field</h3>
              <button
                onClick={() => { setShowAdd(false); setFieldSearch('') }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={e => setFieldSearch(e.target.value)}
                autoFocus
                className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredProfileFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No fields found.</p>
                ) : (
                  filteredProfileFields.map(pf => (
                    <button
                      key={pf.id}
                      onClick={() => addField(pf)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground truncate">{pf.caption}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                          pf.behavior === 'static'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {pf.behavior === 'static' ? 'Profile' : 'Event'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
