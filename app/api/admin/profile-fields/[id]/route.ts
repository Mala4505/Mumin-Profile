import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect'] as const
type FieldType = (typeof VALID_FIELD_TYPES)[number]

const ALLOWED_ROLES = ['SuperAdmin', 'Admin', 'UmoorCoordinator'] as const

const FIELD_COLUMNS =
  'id, category_id, caption, field_type, behavior, visibility_level, mumin_can_edit, is_active, sort_order, options'

type FieldRow = {
  id: number
  category_id: number
  caption: string
  field_type: FieldType
  behavior: 'static' | 'historical'
  visibility_level: number
  mumin_can_edit: boolean
  is_active: boolean
  sort_order: number
  options: unknown
}

/** Shared gate: session + role + field lookup + coordinator category scope. */
async function loadFieldWithGuard(idParam: string) {
  const session = await getSession()
  if (!session) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return { errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const fieldId = parseInt(idParam, 10)
  if (isNaN(fieldId)) {
    return { errorResponse: NextResponse.json({ error: 'Invalid field id' }, { status: 400 }) }
  }

  const scopedCategoryIds = resolveUmoorScope(session)
  const admin = createAdminClient()

  const { data: field, error } = await admin
    .from('profile_field')
    .select(FIELD_COLUMNS)
    .eq('id', fieldId)
    .maybeSingle()

  if (error) {
    return { errorResponse: NextResponse.json({ error: error.message }, { status: 500 }) }
  }
  if (!field) {
    return { errorResponse: NextResponse.json({ error: 'Field not found' }, { status: 404 }) }
  }

  // Coordinator scope: the field must belong to one of their umoor categories
  if (scopedCategoryIds && !scopedCategoryIds.includes(field.category_id)) {
    return {
      errorResponse: NextResponse.json({ error: 'Forbidden: field outside your umoor scope' }, { status: 403 }),
    }
  }

  return { admin, field: field as FieldRow, scopedCategoryIds }
}

async function getUsageCounts(admin: ReturnType<typeof createAdminClient>, fieldId: number) {
  const [valuesResult, formRefsResult] = await Promise.all([
    admin.from('profile_value').select('id', { count: 'exact', head: true }).eq('field_id', fieldId),
    admin.from('form_fields').select('id', { count: 'exact', head: true }).eq('field_id', fieldId),
  ])
  return {
    value_count: valuesResult.count ?? 0,
    form_ref_count: formRefsResult.count ?? 0,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await loadFieldWithGuard(id)
  if ('errorResponse' in guard) return guard.errorResponse
  const { admin, field, scopedCategoryIds } = guard

  let body: {
    caption?: unknown
    field_type?: unknown
    options?: unknown
    behavior?: unknown
    category_id?: unknown
    visibility_level?: unknown
    mumin_can_edit?: unknown
    is_active?: unknown
    sort_order?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const update: Database['public']['Tables']['profile_field']['Update'] = {}

  // caption
  if (body.caption !== undefined) {
    if (typeof body.caption !== 'string' || body.caption.trim() === '') {
      return NextResponse.json({ error: 'caption must be a non-empty string' }, { status: 400 })
    }
    update.caption = body.caption.trim()
  }

  // category_id (coordinator may only move fields between their own categories)
  if (body.category_id !== undefined) {
    if (typeof body.category_id !== 'number' || !Number.isInteger(body.category_id)) {
      return NextResponse.json({ error: 'category_id must be a number' }, { status: 400 })
    }
    if (scopedCategoryIds && !scopedCategoryIds.includes(body.category_id)) {
      return NextResponse.json({ error: 'Forbidden: target category outside your umoor scope' }, { status: 403 })
    }
    update.category_id = body.category_id
  }

  // field_type — blocked while values or form references exist (409)
  if (body.field_type !== undefined) {
    if (!VALID_FIELD_TYPES.includes(body.field_type as FieldType)) {
      return NextResponse.json(
        { error: `field_type must be one of: ${VALID_FIELD_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (body.field_type !== field.field_type) {
      const { value_count, form_ref_count } = await getUsageCounts(admin, field.id)
      if (value_count > 0 || form_ref_count > 0) {
        return NextResponse.json(
          {
            error: `Cannot change field type: ${value_count} recorded value(s) and ${form_ref_count} form reference(s) exist for this field.`,
            value_count,
            form_ref_count,
          },
          { status: 409 }
        )
      }
      update.field_type = body.field_type as FieldType
    }
  }

  const effectiveType = (update.field_type ?? field.field_type) as FieldType
  const isSelectType = effectiveType === 'select' || effectiveType === 'multiselect'

  // options
  if (body.options !== undefined) {
    if (!isSelectType) {
      return NextResponse.json(
        { error: 'options is only valid for select and multiselect field types' },
        { status: 400 }
      )
    }
    if (
      !Array.isArray(body.options) ||
      body.options.length === 0 ||
      !body.options.every((o) => typeof o === 'string' && o.trim() !== '')
    ) {
      return NextResponse.json(
        { error: 'options must be a non-empty array of non-empty strings for select/multiselect fields' },
        { status: 400 }
      )
    }
    const trimmedOptions = body.options.map((o: string) => o.trim())
    const uniqueOptions = [...new Set(trimmedOptions)]
    if (uniqueOptions.length !== trimmedOptions.length) {
      return NextResponse.json({ error: 'options must not contain duplicate values' }, { status: 400 })
    }
    update.options = uniqueOptions
  }

  // Changing to a select type requires options (new or pre-existing); leaving one clears them
  if (update.field_type !== undefined) {
    if (isSelectType) {
      const existingOptions = Array.isArray(field.options) ? field.options : null
      if (update.options === undefined && (!existingOptions || existingOptions.length === 0)) {
        return NextResponse.json(
          { error: 'options are required when changing to a select/multiselect field type' },
          { status: 400 }
        )
      }
    } else {
      update.options = null
    }
  }

  // behavior
  if (body.behavior !== undefined) {
    if (body.behavior !== 'static' && body.behavior !== 'historical') {
      return NextResponse.json({ error: 'behavior must be "static" or "historical"' }, { status: 400 })
    }
    update.behavior = body.behavior
  }

  // visibility_level
  if (body.visibility_level !== undefined) {
    if (typeof body.visibility_level !== 'number' || ![1, 2, 3].includes(body.visibility_level)) {
      return NextResponse.json({ error: 'visibility_level must be 1, 2 or 3' }, { status: 400 })
    }
    update.visibility_level = body.visibility_level
  }

  // mumin_can_edit
  if (body.mumin_can_edit !== undefined) {
    if (typeof body.mumin_can_edit !== 'boolean') {
      return NextResponse.json({ error: 'mumin_can_edit must be a boolean' }, { status: 400 })
    }
    update.mumin_can_edit = body.mumin_can_edit
  }

  // is_active
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
    }
    update.is_active = body.is_active
  }

  // sort_order
  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== 'number' || !Number.isInteger(body.sort_order) || body.sort_order < 0) {
      return NextResponse.json({ error: 'sort_order must be a non-negative integer' }, { status: 400 })
    }
    update.sort_order = body.sort_order
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('profile_field')
    .update(update)
    .eq('id', field.id)
    .select(FIELD_COLUMNS)
    .single()

  if (error) {
    console.error('profile_field update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile field', details: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ field: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await loadFieldWithGuard(id)
  if ('errorResponse' in guard) return guard.errorResponse
  const { admin, field } = guard

  const force = request.nextUrl.searchParams.get('force') === '1'
  const { value_count, form_ref_count } = await getUsageCounts(admin, field.id)

  // form_fields.field_id is ON DELETE RESTRICT — the DB will never allow this
  // delete, so it stays a 409 even with force. Remove the field from those forms first.
  if (form_ref_count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: this field is used by ${form_ref_count} form question(s). Remove it from those forms first, or deactivate the field instead.`,
        value_count,
        form_ref_count,
      },
      { status: 409 }
    )
  }

  // profile_value.field_id is ON DELETE CASCADE — deleting silently destroys
  // member data, so it requires the explicit force path.
  if (value_count > 0 && !force) {
    return NextResponse.json(
      {
        error: `This field has ${value_count} recorded value(s) that will be permanently deleted with it. Retry with ?force=1 to confirm, or deactivate the field instead.`,
        value_count,
        form_ref_count,
      },
      { status: 409 }
    )
  }

  const { error } = await admin.from('profile_field').delete().eq('id', field.id)

  if (error) {
    console.error('profile_field delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete profile field', details: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, deleted_values: value_count })
}
