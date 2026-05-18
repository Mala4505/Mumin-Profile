import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TYPES = ['text','paragraph','number','date','select','multiselect'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: formId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  // Any role can add questions to their own form; SuperAdmin/Admin can add to any form
  const { data: form } = await supabase
    .from('forms')
    .select('created_by')
    .eq('id', formId)
    .single()

  if (!form || (form.created_by !== session.its_no && session.role !== 'SuperAdmin' && session.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { question_text?: unknown; field_type?: unknown; options?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.question_text || typeof body.question_text !== 'string' || !body.question_text.trim()) {
    return NextResponse.json({ error: 'question_text is required' }, { status: 400 })
  }
  if (!body.field_type || !VALID_TYPES.includes(body.field_type as any)) {
    return NextResponse.json({ error: `field_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const fieldType = body.field_type as string
  let options: string[] | null = null

  if (fieldType === 'select' || fieldType === 'multiselect') {
    if (!Array.isArray(body.options) || body.options.length === 0) {
      return NextResponse.json({ error: 'options required for select/multiselect' }, { status: 400 })
    }
    options = [...new Set((body.options as string[]).map((o: string) => o.trim()).filter(Boolean))]
  }

  // Resolve or create "Form Questions" profile_category
  let categoryId: number
  const { data: cat } = await supabase
    .from('profile_category')
    .select('id')
    .eq('name', 'Form Questions')
    .single()

  if (cat) {
    categoryId = cat.id
  } else {
    const { data: newCat, error: catErr } = await supabase
      .from('profile_category')
      .insert({ name: 'Form Questions' })
      .select('id')
      .single()
    if (catErr || !newCat) return NextResponse.json({ error: 'Could not resolve question category' }, { status: 500 })
    categoryId = newCat.id
  }

  // Create profile_field (paragraph is stored as 'text'; the override carries 'paragraph' for textarea rendering)
  const { data: field, error: fieldErr } = await supabase
    .from('profile_field')
    .insert({
      caption: (body.question_text as string).trim(),
      field_type: fieldType === 'paragraph' ? 'text' : fieldType,
      options,
      behavior: 'historical',
      category_id: categoryId,
      visibility_level: 1,
      is_data_entry: true,
      mumin_can_edit: false,
      sort_order: 999,
    })
    .select('id, caption, field_type, options, behavior')
    .single()

  if (fieldErr || !field) {
    return NextResponse.json({ error: 'Failed to create profile_field', details: fieldErr?.message }, { status: 500 })
  }

  // Determine next sort_order
  const { count } = await supabase
    .from('form_fields')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)

  // Create form_fields row with overrides
  const { data: formField, error: ffErr } = await supabase
    .from('form_fields')
    .insert({
      form_id: formId,
      field_id: field.id,
      sort_order: count ?? 0,
      is_required: false,
      question_text: (body.question_text as string).trim(),
      field_type_override: fieldType,
      options_override: options,
    })
    .select('id, field_id, sort_order, is_required, question_text, field_type_override, options_override')
    .single()

  if (ffErr || !formField) {
    return NextResponse.json({ error: 'Failed to link field to form', details: ffErr?.message }, { status: 500 })
  }

  return NextResponse.json({ formField: { ...formField, profile_field: field } }, { status: 201 })
}
