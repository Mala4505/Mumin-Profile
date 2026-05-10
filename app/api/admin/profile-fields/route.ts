import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { NextRequest, NextResponse } from 'next/server'

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect'] as const
type FieldType = (typeof VALID_FIELD_TYPES)[number]

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SuperAdmin' && session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    caption?: unknown
    field_type?: unknown
    options?: unknown
    behavior?: unknown
    category_id?: unknown
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
        // Sensible defaults for required columns
        // visibility_level: 1 = staff-only (matches existing profile_field seeding convention)
        visibility_level: 1,
        is_data_entry: true,
        mumin_can_edit: false,
        sort_order: 999,
      })
      .select('id, caption, field_type, options, behavior')
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
