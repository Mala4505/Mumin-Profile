import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getJwtMeta(accessToken: string): { role?: string; its_no?: number; sector_ids?: number[]; subsector_ids?: number[] } {
  try {
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.app_metadata ?? {}
  } catch { return {} }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ its_no: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = getJwtMeta(session.access_token)
  const callerRole = meta.role
  const callerItsNo = meta.its_no

  const { its_no } = await params
  const targetItsNo = parseInt(its_no)
  if (isNaN(targetItsNo)) return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })

  const body = await request.json() as { field_id: number; value: string }
  if (!body.field_id) return NextResponse.json({ error: 'field_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch the field to check permissions
  const { data: field } = await admin
    .from('profile_field')
    .select('id, visibility_level, mumin_can_edit')
    .eq('id', body.field_id)
    .maybeSingle()

  if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

  if (callerRole === 'Mumin') {
    // Mumin can only edit their own profile, only mumin_can_edit fields
    if (callerItsNo !== targetItsNo) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!field.mumin_can_edit) {
      return NextResponse.json({ error: 'This field is not editable' }, { status: 403 })
    }
  } else if (callerRole === 'Masool' || callerRole === 'Musaid') {
    // Verify scope
    const { data: member } = await admin
      .from('mumin')
      .select('subsector_id, subsector!subsector_id(sector_id)')
      .eq('its_no', targetItsNo)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const memberSubsectorId = (member as any).subsector_id
    const memberSectorId = (member as any).subsector?.sector_id

    if (callerRole === 'Masool' && !meta.sector_ids?.includes(memberSectorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (callerRole === 'Musaid' && !meta.subsector_ids?.includes(memberSubsectorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (callerRole !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Upsert the profile value
  const { data: existing } = await admin
    .from('profile_value')
    .select('id')
    .eq('its_no', targetItsNo)
    .eq('field_id', body.field_id)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('profile_value')
      .update({ value: body.value, updated_by: callerItsNo ?? null, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin
      .from('profile_value')
      .insert({ its_no: targetItsNo, field_id: body.field_id, value: body.value, updated_by: callerItsNo ?? null })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
