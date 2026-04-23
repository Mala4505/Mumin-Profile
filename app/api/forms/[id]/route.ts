import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { materializeAudience } from '@/lib/forms/materializeAudience'
import { Database } from '@/lib/types/database'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('forms').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const isCreator = Number(session.its_no) === data.created_by // fixed integer
  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  if (!isCreator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ form: data })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()
  const { data: existing, error: fetchErr } = await supabase.from('forms').select('*').eq('id', id).single()
  if (fetchErr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isCreator = Number(session.its_no) === existing.created_by // fixed integer
  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  if (!isCreator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Handle publish transition
  if (body.status === 'published' && existing.status !== 'published') {
    if (!['draft', 'pending_approval'].includes(existing.status ?? '')) {
      return NextResponse.json({ error: 'Cannot publish from current status' }, { status: 400 })
    }
    await materializeAudience(id, body.audience_filters ?? existing.audience_filters)
    body.published_at = new Date().toISOString()

    const { data: audience } = await supabase.from('form_audience').select('its_no').eq('form_id', id)
    if (audience?.length) {
      await supabase.from('notifications').insert(
        audience.map((a) => ({
          its_no: a.its_no,
          type: 'form_assigned',
          title: `New form: ${body.title ?? existing.title}`,
          body: 'A form has been assigned to you.',
          related_form_id: id,
        }))
      )
    }
  }

  // Handle submit-for-approval by Masool/Musaid
  if (body.status === 'pending_approval' && ['Masool', 'Musaid'].includes(session.role)) {
    const { data: admins } = await supabase
      .from('mumin')
      .select('its_no')
      .in('role', ['SuperAdmin', 'Admin'])
    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map((a) => ({
          its_no: a.its_no,
          type: 'form_pending_approval',
          title: `Form pending approval: ${existing.title}`,
          body: `Submitted by ${session.its_no}`,
          related_form_id: id,
        }))
      )
    }
  }

  type FormUpdate = Database['public']['Tables']['forms']['Update']

  const allowedFields = [
    'title',
    'description',
    'form_type',
    'questions',
    'audience_filters',
    'filler_access',
    'expires_at',
    'event_id',
    'umoor_category_id',
    'status',
    'published_at',
  ]

  const safeBody: FormUpdate = {}
  for (const key of allowedFields) {
    if (key in body) {
      // @ts-expect-error safe assignment
      safeBody[key] = body[key]
    }
  }

  const { data, error } = await supabase
    .from('forms')
    .update(safeBody)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ form: data })
}
