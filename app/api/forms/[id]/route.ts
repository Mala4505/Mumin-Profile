import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { materializeAudience } from '@/lib/forms/materializeAudience'

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

  const isCreator = String(session.its_no) === data.created_by
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

  const isCreator = String(session.its_no) === existing.created_by
  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  if (!isCreator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Handle publish transition
  if (body.status === 'published' && existing.status !== 'published') {
    // Guard: only allow from draft or pending_approval
    if (!['draft', 'pending_approval'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot publish from current status' }, { status: 400 })
    }
    // Materialize audience
    await materializeAudience(id, body.audience_filters ?? existing.audience_filters)
    body.published_at = new Date().toISOString()

    // Bulk-insert form_assigned notifications
    const { data: audience } = await supabase.from('form_audience').select('its_no').eq('form_id', id)
    if (audience?.length) {
      const notifications = audience.map((a) => ({
        its_no: a.its_no,
        type: 'form_assigned',
        title: `New form: ${body.title ?? existing.title}`,
        body: 'A form has been assigned to you.',
        related_form_id: id,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }

  // Handle submit for approval (Masool/Musaid)
  if (body.status === 'pending_approval' && ['Masool', 'Musaid'].includes(session.role)) {
    const { data: superAdmins } = await supabase
      .from('mumin')
      .select('its_no')
      .eq('role', 'SuperAdmin')

    if (superAdmins?.length) {
      const notifications = superAdmins.map((sa) => ({
        its_no: sa.its_no,
        type: 'form_pending_approval',
        title: `Form pending approval: ${existing.title}`,
        body: `Submitted by ${session.its_no}`,
        related_form_id: id,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }

  const allowedFields = ['title', 'description', 'form_type', 'questions', 'audience_filters',
    'filler_access', 'expires_at', 'umoor_category_id', 'status', 'published_at']
  const safeBody: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) safeBody[key] = body[key]
  }

  const { data, error } = await supabase.from('forms').update(safeBody).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ form: data })
}
