import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/lib/types/database'


function getJwtMeta(accessToken: string): { role?: string } {
  try {
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.app_metadata ?? {}
  } catch {
    return {}
  }
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
          role?: 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin'
          is_active?: boolean
          sector_ids?: number[]
          subsector_ids?: number[]
        }
        
        const admin = createAdminClient()
        const muminUpdate: Database['public']['Tables']['mumin']['Update'] = {}
        
  // Update role and/or active status on mumin table
  if (body.role !== undefined) muminUpdate.role = body.role
  if (body.is_active !== undefined) muminUpdate.is_active = body.is_active
  
  if (Object.keys(muminUpdate).length > 0) {
    const { error } = await admin.from('mumin').update(muminUpdate).eq('its_no', itsNo)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace sector assignments (Admin and Masool)
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

  // Check if a Supabase auth account exists; create one if not
  const { data: muminRow } = await admin
    .from('mumin')
    .select('supabase_auth_id, sabeel_no, role')
    .eq('its_no', itsNo)
    .single()

  let newAuthId: string | null = muminRow?.supabase_auth_id ?? null

  if (!newAuthId) {
    // Resolve password: use PACI no from family table if available
    let password = `ITS${itsNo}` // fallback
    if (muminRow?.sabeel_no) {
      const { data: familyRow } = await admin
        .from('family')
        .select('paci_no')
        .eq('sabeel_no', muminRow.sabeel_no)
        .maybeSingle()
      if (familyRow?.paci_no) password = familyRow.paci_no
    }

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: `${itsNo}@mumin.local`,
      password,
      email_confirm: true,
      app_metadata: {
        its_no: itsNo,
        role: body.role ?? muminRow?.role ?? 'Mumin',
        sector_ids: body.sector_ids ?? [],
        subsector_ids: body.subsector_ids ?? [],
        must_change_password: true,
      },
    })

    if (authUser?.user) {
      newAuthId = authUser.user.id
      await admin.from('mumin').update({
        supabase_auth_id: newAuthId,
        must_change_password: true,
      }).eq('its_no', itsNo)
    } else if (authErr) {
      // If already registered (e.g. concurrent save), look up existing account
      if (authErr.message.includes('already registered')) {
        const { data: existing } = await admin.auth.admin.listUsers()
        const found = existing?.users?.find(u => u.email === `${itsNo}@mumin.local`)
        if (found) {
          newAuthId = found.id
          await admin.from('mumin').update({ supabase_auth_id: newAuthId }).eq('its_no', itsNo)
        }
      }
      // Non-fatal: proceed without blocking the role update
    }
  }

  return NextResponse.json({ success: true, supabase_auth_id: newAuthId })
}
