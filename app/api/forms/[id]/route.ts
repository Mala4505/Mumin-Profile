import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { materializeAudience } from '@/lib/forms/materializeAudience'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import { Database } from '@/lib/types/database'
import type { FillerAccess } from '@/lib/types/forms'

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

  const isCreator = Number(session.its_no) === data.created_by
  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  const fillerAccess = data.filler_access as FillerAccess | null
  const isFiller = fillerAccess ? isAuthorizedFiller(fillerAccess, session) : false
  // Coordinator may access any form belonging to their assigned umoor categories
  const isUmoorScoped =
    session.role === 'UmoorCoordinator' &&
    data.umoor_category_id !== null &&
    (session.umoor_ids ?? []).includes(data.umoor_category_id)

  // Mumin can only GET a form for self-fill: must be in audience + form must allow self
  if (session.role === 'Mumin') {
    const selfAllowed = fillerAccess?.fillers?.some((f) => f.type === 'self') ?? false
    if (!selfAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: inAudience } = await supabase
      .from('form_audience')
      .select('its_no')
      .eq('form_id', id)
      .eq('its_no', Number(session.its_no))
      .maybeSingle()
    if (!inAudience) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ form: data })
  }

  if (!isCreator && !isAdmin && !isFiller && !isUmoorScoped) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
  // Coordinator may manage any form belonging to their assigned umoor categories
  const isUmoorScoped =
    session.role === 'UmoorCoordinator' &&
    existing.umoor_category_id !== null &&
    (session.umoor_ids ?? []).includes(existing.umoor_category_id)
  if (!isCreator && !isAdmin && !isUmoorScoped) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Coordinators cannot move a form outside their assigned umoors
  if (
    session.role === 'UmoorCoordinator' &&
    'umoor_category_id' in body &&
    (body.umoor_category_id === null || !(session.umoor_ids ?? []).includes(Number(body.umoor_category_id)))
  ) {
    return NextResponse.json(
      { error: 'Forbidden: umoor category is outside your assigned umoors' },
      { status: 403 },
    )
  }

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

  // Handle submit-for-approval by Masool/Musaid/UmoorCoordinator
  if (body.status === 'pending_approval' && ['Masool', 'Musaid', 'UmoorCoordinator'].includes(session.role)) {
    const admin = createAdminClient()
    const { data: admins } = await admin
      .from('auth_accounts')
      .select('its_no')
      .in('role', ['SuperAdmin', 'Admin'])
      .eq('is_active', true)
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
    'viewable_by_roles',
    'response_viewer_roles',
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
