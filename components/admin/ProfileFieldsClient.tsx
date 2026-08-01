'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect'] as const
type FieldType = (typeof FIELD_TYPES)[number]

const TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select',
  multiselect: 'Multiselect',
}

const VISIBILITY_LABELS: Record<number, string> = {
  1: 'Everyone',
  2: 'Staff only',
  3: 'SuperAdmin only',
}

interface Category {
  id: number
  name: string
}

interface FieldItem {
  id: number
  category_id: number
  caption: string
  field_type: FieldType
  behavior: 'static' | 'historical'
  visibility_level: number
  mumin_can_edit: boolean
  is_active: boolean
  sort_order: number
  options: string[] | null
  value_count: number
}

interface Props {
  categories: Category[]
}

type ModalState =
  | { mode: 'create'; categoryId: number | '' }
  | { mode: 'edit'; field: FieldItem }

function normalizeOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  return raw.map((o) => String(o))
}

export function ProfileFieldsClient({ categories }: Props) {
  const [fields, setFields] = useState<FieldItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(categories.length > 0 ? [categories[0].id] : [])
  )
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Row action state
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [reorderBusy, setReorderBusy] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<FieldItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create / edit modal
  const [modal, setModal] = useState<ModalState | null>(null)
  const [formCaption, setFormCaption] = useState('')
  const [formType, setFormType] = useState<FieldType>('text')
  const [formOptions, setFormOptions] = useState<string[]>([''])
  const [formBehavior, setFormBehavior] = useState<'static' | 'historical'>('static')
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('')
  const [formVisibility, setFormVisibility] = useState<number>(1)
  const [formMuminEdit, setFormMuminEdit] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/profile-fields')
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Failed to load profile fields')
        if (cancelled) return
        const loaded: FieldItem[] = (json.fields ?? []).map((f: any) => ({
          id: f.id,
          category_id: f.category_id,
          caption: f.caption,
          field_type: f.field_type,
          behavior: f.behavior,
          visibility_level: f.visibility_level,
          mumin_can_edit: f.mumin_can_edit,
          is_active: f.is_active,
          sort_order: f.sort_order,
          options: normalizeOptions(f.options),
          value_count: f.value_count ?? 0,
        }))
        setFields(loaded)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load profile fields')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<number, FieldItem[]>()
    for (const c of categories) map.set(c.id, [])
    for (const f of fields ?? []) {
      const list = map.get(f.category_id)
      if (list) list.push(f)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    }
    return map
  }, [categories, fields])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleCategory(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────
  async function moveField(categoryId: number, fieldId: number, dir: -1 | 1) {
    if (!fields || reorderBusy) return
    const list = grouped.get(categoryId) ?? []
    const idx = list.findIndex((f) => f.id === fieldId)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= list.length) return

    const orderedIds = list.map((f) => f.id)
    ;[orderedIds[idx], orderedIds[target]] = [orderedIds[target], orderedIds[idx]]
    const posById = new Map(orderedIds.map((id, i) => [id, i]))

    const snapshot = fields
    setFields((prev) =>
      (prev ?? []).map((f) => (posById.has(f.id) ? { ...f, sort_order: posById.get(f.id)! } : f))
    )
    setReorderBusy(true)
    try {
      const res = await fetch('/api/admin/profile-fields/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, ordered_ids: orderedIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to reorder')
    } catch (e) {
      setFields(snapshot)
      showToast('error', e instanceof Error ? e.message : 'Failed to reorder')
    } finally {
      setReorderBusy(false)
    }
  }

  // ── Activate / deactivate ───────────────────────────────────────────────────
  async function toggleActive(f: FieldItem) {
    if (togglingId !== null) return
    setTogglingId(f.id)
    try {
      const res = await fetch(`/api/admin/profile-fields/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !f.is_active }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setFields((prev) =>
        (prev ?? []).map((x) => (x.id === f.id ? { ...x, is_active: !f.is_active } : x))
      )
      showToast(
        'success',
        f.is_active
          ? `“${f.caption}” deactivated. Hidden from the portal and form builder; recorded data is preserved.`
          : `“${f.caption}” reactivated.`
      )
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/profile-fields/${deleteTarget.id}?force=1`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      setFields((prev) => (prev ?? []).filter((f) => f.id !== deleteTarget.id))
      showToast(
        'success',
        deleteTarget.value_count > 0
          ? `“${deleteTarget.caption}” deleted along with ${deleteTarget.value_count} recorded value(s).`
          : `“${deleteTarget.caption}” deleted.`
      )
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ── Create / edit modal ─────────────────────────────────────────────────────
  function openCreate(categoryId: number | '') {
    setModal({ mode: 'create', categoryId })
    setFormCaption('')
    setFormType('text')
    setFormOptions([''])
    setFormBehavior('static')
    setFormCategoryId(categoryId)
    setFormVisibility(1)
    setFormMuminEdit(false)
    setFormError(null)
  }

  function openEdit(f: FieldItem) {
    setModal({ mode: 'edit', field: f })
    setFormCaption(f.caption)
    setFormType(f.field_type)
    setFormOptions(f.options && f.options.length > 0 ? [...f.options] : [''])
    setFormBehavior(f.behavior)
    setFormCategoryId(f.category_id)
    setFormVisibility(f.visibility_level)
    setFormMuminEdit(f.mumin_can_edit)
    setFormError(null)
  }

  function closeModal() {
    if (formSaving) return
    setModal(null)
    setFormError(null)
  }

  async function handleFormSave() {
    if (!modal) return
    setFormError(null)

    if (!formCaption.trim()) {
      setFormError('Caption is required.')
      return
    }
    if (formCategoryId === '') {
      setFormError('Please select an umoor category.')
      return
    }
    const isSelect = formType === 'select' || formType === 'multiselect'
    const nonEmpty = formOptions.map((o) => o.trim()).filter(Boolean)
    if (isSelect) {
      if (nonEmpty.length === 0) {
        setFormError('At least one option is required.')
        return
      }
      if (new Set(nonEmpty).size !== nonEmpty.length) {
        setFormError('Options must be unique.')
        return
      }
    }

    setFormSaving(true)
    try {
      if (modal.mode === 'create') {
        const categoryFields = grouped.get(formCategoryId) ?? []
        const nextSort =
          categoryFields.length > 0
            ? Math.max(...categoryFields.map((f) => f.sort_order)) + 1
            : 0
        const body: Record<string, unknown> = {
          caption: formCaption.trim(),
          field_type: formType,
          behavior: formBehavior,
          category_id: formCategoryId,
          visibility_level: formVisibility,
          mumin_can_edit: formMuminEdit,
          sort_order: nextSort,
        }
        if (isSelect) body.options = nonEmpty

        const res = await fetch('/api/admin/profile-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Failed to create field')
        const created = json.field
        setFields((prev) => [
          ...(prev ?? []),
          {
            id: created.id,
            category_id: created.category_id,
            caption: created.caption,
            field_type: created.field_type,
            behavior: created.behavior,
            visibility_level: created.visibility_level,
            mumin_can_edit: created.mumin_can_edit,
            is_active: created.is_active,
            sort_order: created.sort_order,
            options: normalizeOptions(created.options),
            value_count: 0,
          },
        ])
        setExpanded((prev) => new Set(prev).add(created.category_id))
        showToast('success', `“${created.caption}” created.`)
      } else {
        const original = modal.field
        const body: Record<string, unknown> = {
          caption: formCaption.trim(),
          behavior: formBehavior,
          category_id: formCategoryId,
          visibility_level: formVisibility,
          mumin_can_edit: formMuminEdit,
        }
        if (formType !== original.field_type) body.field_type = formType
        if (isSelect) body.options = nonEmpty

        const res = await fetch(`/api/admin/profile-fields/${original.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Failed to update field')
        const updated = json.field
        setFields((prev) =>
          (prev ?? []).map((f) =>
            f.id === original.id
              ? {
                  ...f,
                  category_id: updated.category_id,
                  caption: updated.caption,
                  field_type: updated.field_type,
                  behavior: updated.behavior,
                  visibility_level: updated.visibility_level,
                  mumin_can_edit: updated.mumin_can_edit,
                  is_active: updated.is_active,
                  sort_order: updated.sort_order,
                  options: normalizeOptions(updated.options),
                }
              : f
          )
        )
        if (updated.category_id !== original.category_id) {
          setExpanded((prev) => new Set(prev).add(updated.category_id))
        }
        showToast('success', `“${updated.caption}” saved.`)
      }
      setModal(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setFormSaving(false)
    }
  }

  const totalFields = fields?.length ?? 0
  const activeFields = fields?.filter((f) => f.is_active).length ?? 0
  const typeLocked = modal?.mode === 'edit' && modal.field.value_count > 0
  const isSelectType = formType === 'select' || formType === 'multiselect'

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    )
  }

  if (fields === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded bg-muted/60 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalFields} field{totalFields !== 1 ? 's' : ''}
          {totalFields > 0 && activeFields !== totalFields ? `, ${activeFields} active` : ''}
        </p>
        <button
          onClick={() => openCreate(categories[0]?.id ?? '')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Field
        </button>
      </div>

      {/* Accordion per umoor category */}
      <div className="space-y-3">
        {categories.length === 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
            <p className="text-sm text-muted-foreground">No umoor categories available.</p>
          </div>
        )}

        {categories.map((cat) => {
          const list = grouped.get(cat.id) ?? []
          const activeCount = list.filter((f) => f.is_active).length
          const isOpen = expanded.has(cat.id)

          return (
            <div key={cat.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                aria-expanded={isOpen}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <h2 className="font-semibold text-foreground text-sm truncate">{cat.name}</h2>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {list.length === 0
                      ? 'no fields'
                      : activeCount === list.length
                        ? `${list.length} field${list.length !== 1 ? 's' : ''}`
                        : `${list.length} field${list.length !== 1 ? 's' : ''}, ${activeCount} active`}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-border">
                  {list.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">No fields in this umoor yet.</p>
                      <button
                        onClick={() => openCreate(cat.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add the first field
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-border">
                        {list.map((f, idx) => (
                          <li
                            key={f.id}
                            className={`px-4 py-2.5 flex items-center gap-3 ${f.is_active ? '' : 'bg-muted/20'}`}
                          >
                            {/* Reorder */}
                            <div className="flex flex-col shrink-0 -my-1">
                              <button
                                onClick={() => moveField(cat.id, f.id, -1)}
                                disabled={idx === 0 || reorderBusy}
                                title="Move up"
                                aria-label={`Move ${f.caption} up`}
                                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveField(cat.id, f.id, 1)}
                                disabled={idx === list.length - 1 || reorderBusy}
                                title="Move down"
                                aria-label={`Move ${f.caption} down`}
                                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Caption + badges */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-medium truncate ${f.is_active ? 'text-foreground' : 'text-muted-foreground line-through decoration-muted-foreground/40'}`}
                                >
                                  {f.caption}
                                </span>
                                {!f.is_active && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                  {TYPE_LABELS[f.field_type] ?? f.field_type}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    f.behavior === 'historical'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  }`}
                                >
                                  {f.behavior === 'historical' ? 'Event' : 'Profile'}
                                </span>
                                {f.visibility_level > 1 && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    {VISIBILITY_LABELS[f.visibility_level] ?? `Level ${f.visibility_level}`}
                                  </span>
                                )}
                                {f.mumin_can_edit && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Self-edit
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Value count */}
                            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block tabular-nums">
                              {f.value_count > 0 ? `${f.value_count} value${f.value_count !== 1 ? 's' : ''}` : 'no values'}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center shrink-0">
                              <button
                                onClick={() => toggleActive(f)}
                                disabled={togglingId !== null}
                                title={f.is_active ? 'Deactivate (hide from portal and form builder, keep data)' : 'Reactivate'}
                                aria-label={f.is_active ? `Deactivate ${f.caption}` : `Reactivate ${f.caption}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                              >
                                {togglingId === f.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : f.is_active ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => openEdit(f)}
                                title="Edit field"
                                aria-label={`Edit ${f.caption}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(f)}
                                title="Delete field"
                                aria-label={`Delete ${f.caption}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="px-4 py-2.5 border-t border-border">
                        <button
                          onClick={() => openCreate(cat.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add field
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm — Deactivate is the primary lifecycle action; Delete destroys values */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
        title="Delete field permanently?"
        description={
          deleteTarget
            ? deleteTarget.value_count > 0
              ? `“${deleteTarget.caption}” has ${deleteTarget.value_count} recorded value${deleteTarget.value_count !== 1 ? 's' : ''} across member profiles. Deleting the field permanently erases them. If you only want to hide it, deactivate it instead: that keeps all data.`
              : `“${deleteTarget.caption}” has no recorded values. It will be permanently removed.`
            : ''
        }
        confirmLabel="Delete permanently"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Create / edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-foreground">
                {modal.mode === 'create' ? 'New Profile Field' : 'Edit Profile Field'}
              </h3>
              <button
                onClick={closeModal}
                aria-label="Close"
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
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="e.g. Hifz Level"
                  autoFocus
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Umoor Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="" disabled>
                    Select a category…
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const next = e.target.value as FieldType
                    setFormType(next)
                    if (next !== 'select' && next !== 'multiselect') setFormOptions([''])
                  }}
                  disabled={typeLocked}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select (single choice)</option>
                  <option value="multiselect">Multiselect (multiple choice)</option>
                </select>
                {typeLocked && (
                  <p className="text-xs text-muted-foreground">
                    Type is locked because this field has {modal.mode === 'edit' ? modal.field.value_count : 0} recorded
                    value{modal.mode === 'edit' && modal.field.value_count !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>

              {/* Options builder — only for select / multiselect */}
              {isSelectType && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Options <span className="text-destructive">*</span>
                  </label>
                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...formOptions]
                            next[idx] = e.target.value
                            setFormOptions(next)
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setFormOptions((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={formOptions.length === 1}
                          aria-label={`Remove option ${idx + 1}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormOptions((prev) => [...prev, ''])}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add option
                    </button>
                  </div>
                </div>
              )}

              {/* Behavior */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Behavior</label>
                <div className="flex items-center gap-4">
                  {(['static', 'historical'] as const).map((b) => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fieldBehavior"
                        value={b}
                        checked={formBehavior === b}
                        onChange={() => setFormBehavior(b)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {b === 'static' ? 'Profile (static)' : 'Event (historical)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Visible to</label>
                <select
                  value={formVisibility}
                  onChange={(e) => setFormVisibility(Number(e.target.value))}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value={1}>Everyone (member and staff)</option>
                  <option value={2}>Staff only</option>
                  <option value={3}>SuperAdmin only</option>
                </select>
              </div>

              {/* Mumin can edit */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formMuminEdit}
                  onChange={(e) => setFormMuminEdit(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Member can edit this field from their portal</span>
              </label>

              {/* Error */}
              {formError && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={closeModal}
                disabled={formSaving}
                className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleFormSave}
                disabled={formSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {formSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.mode === 'create' ? 'Create Field' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </>
  )
}
