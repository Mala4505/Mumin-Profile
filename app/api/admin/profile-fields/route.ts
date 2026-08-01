import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { NextRequest, NextResponse } from 'next/server'

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect'] as const
type FieldType = (typeof VALID_FIELD_TYPES)[number]

const ALLOWED_ROLES = ['SuperAdmin', 'Admin', 'UmoorCoordinator'] as const

const FIELD_COLUMNS =
  'id, category_id, caption, field_type, behavior, visibility_level, mumin_can_edit, is_active, sort_order, options'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // null = unrestricted; number[] = coordinator's allowed profile_category ids
  const scopedCategoryIds = resolveUmoorScope(session)

  try {
    const admin = createAdminClient()

    let categoryQuery = admin
      .from('profile_category')
      .select('id, name, sort_order')
      .order('sort_order')
      .order('name')
    if (scopedCategoryIds) categoryQuery = categoryQuery.in('id', scopedCategoryIds)

    let fieldQuery = admin
      .from('profile_field')
      .select(FIELD_COLUMNS)
      .order('sort_order')
      .order('id')
    if (scopedCategoryIds) fieldQuery = fieldQuery.in('category_id', scopedCategoryIds)

    const [categoriesResult, fieldsResult] = await Promise.all([categoryQuery, fieldQuery])

    if (categoriesResult.error) {
      return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 })
    }
    if (fieldsResult.error) {
      return NextResponse.json({ error: fieldsResult.error.message }, { status: 500 })
    }

    const categories = categoriesResult.data ?? []
    const fields = fieldsResult.data ?? []
    const categoryById = new Map(categories.map((c) => [c.id, c]))

    // Per-field value counts (head-only count queries, run in parallel)
    const counts = await Promise.all(
      fields.map((f) =>
        admin
          .from('profile_value')
          .select('id', { count: 'exact', head: true })
          .eq('field_id', f.id)
      )
    )

    const result = fields.map((f, i) => ({
      id: f.id,
      category_id: f.category_id,
      category: {
        id: f.category_id,
        name: categoryById.get(f.category_id)?.name ?? '',
      },
      caption: f.caption,
      field_type: f.field_type,
      behavior: f.behavior,
      visibility_level: f.visibility_level,
      mumin_can_edit: f.mumin_can_edit,
      is_active: f.is_active,
      sort_order: f.sort_order,
      options: f.options,
      value_count: counts[i].count ?? 0,
    }))

    return NextResponse.json({ categories, fields: result })
  } catch (error) {
    console.error('GET /api/admin/profile-fields error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const scopedCategoryIds = resolveUmoorScope(session)

  let body: {
    caption?: unknown
    field_type?: unknown
    options?: unknown
    behavior?: unknown
    category_id?: unknown
    visibility_level?: unknown
    mumin_can_edit?: unknown
    sort_order?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate caption
  if (!body.caption || typeof body.caption !== 'string' || body.caption.trim() === '') {
    return NextResponse.json(
      { error: 'caption is required and must be a non-empty string' },
      { status: 400 }
    )
  }

  // Validate field_type
  if (!body.field_type || !VALID_FIELD_TYPES.includes(body.field_type as FieldType)) {
    return NextResponse.json(
      { error: `field_type must be one of: ${VALID_FIELD_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const fieldType = body.field_type as FieldType

  // Fix 2: options must not be sent for non-select types
  if (body.options !== undefined && body.field_type !== 'select' && body.field_type !== 'multiselect') {
    return NextResponse.json(
      { error: 'options is only valid for select and multiselect field types' },
      { status: 400 }
    )
  }

  // Validate options for select/multiselect; build trimmed+deduped list for insert
  let uniqueOptions: string[] | null = null
  if (fieldType === 'select' || fieldType === 'multiselect') {
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

    // Fix 3 & 4: trim and deduplicate options
    const trimmedOptions = body.options.map((o: string) => o.trim())
    uniqueOptions = [...new Set(trimmedOptions)]
    if (uniqueOptions.length !== trimmedOptions.length) {
      return NextResponse.json({ error: 'options must not contain duplicate values' }, { status: 400 })
    }
  }

  // Validate behavior if provided
  if (body.behavior !== undefined && body.behavior !== 'static' && body.behavior !== 'historical') {
    return NextResponse.json(
      { error: 'behavior must be "static" or "historical"' },
      { status: 400 }
    )
  }

  // Fix 1: category_id is NOT NULL in DB — must be present and a number
  if (!body.category_id || typeof body.category_id !== 'number') {
    return NextResponse.json({ error: 'category_id is required and must be a number' }, { status: 400 })
  }

  // Coordinator scope: may only create fields inside their own umoor categories
  if (scopedCategoryIds && !scopedCategoryIds.includes(body.category_id)) {
    return NextResponse.json({ error: 'Forbidden: category outside your umoor scope' }, { status: 403 })
  }

  // Validate visibility_level if provided (1 = everyone, 2 = staff, 3 = SuperAdmin only)
  if (
    body.visibility_level !== undefined &&
    (typeof body.visibility_level !== 'number' || ![1, 2, 3].includes(body.visibility_level))
  ) {
    return NextResponse.json({ error: 'visibility_level must be 1, 2 or 3' }, { status: 400 })
  }

  // Validate mumin_can_edit if provided
  if (body.mumin_can_edit !== undefined && typeof body.mumin_can_edit !== 'boolean') {
    return NextResponse.json({ error: 'mumin_can_edit must be a boolean' }, { status: 400 })
  }

  // Validate sort_order if provided
  if (
    body.sort_order !== undefined &&
    (typeof body.sort_order !== 'number' || !Number.isInteger(body.sort_order) || body.sort_order < 0)
  ) {
    return NextResponse.json({ error: 'sort_order must be a non-negative integer' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('profile_field')
      .insert({
        caption: (body.caption as string).trim(),
        field_type: fieldType,
        options: uniqueOptions,
        behavior: (body.behavior as 'static' | 'historical') ?? 'static',
        category_id: body.category_id as number,
        // visibility_level: 1 = visible to everyone incl. the member's own portal
        visibility_level: (body.visibility_level as number | undefined) ?? 1,
        is_data_entry: true,
        mumin_can_edit: (body.mumin_can_edit as boolean | undefined) ?? false,
        sort_order: (body.sort_order as number | undefined) ?? 999,
      })
      .select(FIELD_COLUMNS)
      .single()

    if (error) {
      console.error('profile_field insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create profile field', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ field: data }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/admin/profile-fields error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
