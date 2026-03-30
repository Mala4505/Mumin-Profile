import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getJwtMeta(accessToken: string): { role?: string } {
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
  if (meta.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { its_no } = await params
  const itsNo = parseInt(its_no)
  if (isNaN(itsNo)) return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })

  const body = await request.json() as {
    role?: 'SuperAdmin' | 'Masool' | 'Musaid' | 'Mumin'
    is_active?: boolean
    sector_ids?: number[]
    subsector_ids?: number[]
  }

  const admin = createAdminClient()

  // Update role and/or active status on mumin table
  const muminUpdate: Record<string, unknown> = {}
  if (body.role !== undefined) muminUpdate.role = body.role
  if (body.is_active !== undefined) muminUpdate.is_active = body.is_active

  if (Object.keys(muminUpdate).length > 0) {
    const { error } = await admin.from('mumin').update(muminUpdate).eq('its_no', itsNo)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace sector assignments (Masool)
  if (body.sector_ids !== undefined) {
    await admin.from('user_sector').delete().eq('its_no', itsNo)
    if (body.sector_ids.length > 0) {
      const { error } = await admin.from('user_sector').insert(
        body.sector_ids.map(sid => ({ its_no: itsNo, sector_id: sid }))
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Replace subsector assignments (Musaid)
  if (body.subsector_ids !== undefined) {
    await admin.from('user_subsector').delete().eq('its_no', itsNo)
    if (body.subsector_ids.length > 0) {
      const { error } = await admin.from('user_subsector').insert(
        body.subsector_ids.map(sid => ({ its_no: itsNo, subsector_id: sid }))
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
