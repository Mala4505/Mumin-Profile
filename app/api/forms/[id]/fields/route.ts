import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: formId } = await params
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Load form_fields joined with profile_field for display data
    const { data: fields, error } = await supabase
      .from('form_fields')
      .select(`
        id,
        field_id,
        sort_order,
        is_required,
        profile_field!inner (
          id,
          caption,
          field_type,
          behavior,
          visibility_level,
          mumin_can_edit
        )
      `)
      .eq('form_id', formId)
      .order('sort_order')

    if (error) {
      console.error('form_fields select error:', error)
      return NextResponse.json(
        { error: 'Failed to load form questions', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ fields: fields || [] })
  } catch (error: any) {
    console.error('GET /api/forms/[id]/fields error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: formId } = await params
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only form creator or SuperAdmin can update
  const supabase = createAdminClient()
  const { data: form } = await supabase
    .from('forms')
    .select('created_by')
    .eq('id', formId)
    .single()

  if (!form || (form.created_by !== session.its_no && session.role !== 'SuperAdmin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const fields = body.fields // Array of { field_id, sort_order, is_required }

  try {
    // 1. Delete existing form_fields for this form
    await supabase
      .from('form_fields')
      .delete()
      .eq('form_id', formId)

    // 2. Batch insert new form_fields
    if (fields && fields.length > 0) {
      const fieldsToInsert = fields.map((f: any, idx: number) => ({
        form_id: formId,
        field_id: f.field_id,
        sort_order: f.sort_order ?? idx,
        is_required: f.is_required ?? false,
      }))

      const { error } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert)

      if (error) {
        console.error('form_fields insert error:', error)
        return NextResponse.json(
          { error: 'Failed to save form questions', details: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: true, count: fields.length })
  } catch (error: any) {
    console.error('POST /api/forms/[id]/fields error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
