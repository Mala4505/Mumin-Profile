// import { NextRequest, NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'
// import { createAdminClient } from '@/lib/supabase/admin'

// function getJwtMeta(accessToken: string): { role?: string; its_no?: number; sector_ids?: number[]; subsector_ids?: number[] } {
//   try {
//     const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
//     const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
//     return payload.app_metadata ?? {}
//   } catch { return {} }
// }

// export async function PATCH(
//   request: NextRequest,
//   { params }: { params: Promise<{ its_no: string }> }
// ) {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

//   const { data: { session } } = await supabase.auth.getSession()
//   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

//   const meta = getJwtMeta(session.access_token)
//   const callerRole = meta.role
//   const callerItsNo = meta.its_no

//   const { its_no } = await params
//   const targetItsNo = parseInt(its_no)
//   if (isNaN(targetItsNo)) return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })

//   const body = await request.json() as {
//     phone?: string | null
//     alternate_phone?: string | null
//     email?: string | null
//     status?: string
//   }

//   const admin = createAdminClient()

//   // Check scope permissions
//   if (callerRole === 'Mumin') {
//     // Mumin can only edit their own phone/email
//     if (callerItsNo !== targetItsNo) {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//     }
//     // Strip fields they cannot edit
//     const allowedUpdate: Record<string, unknown> = {}
//     if (body.phone !== undefined) allowedUpdate.phone = body.phone
//     if (body.email !== undefined) allowedUpdate.email = body.email
//     if (Object.keys(allowedUpdate).length === 0) {
//       return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
//     }
//     const { error } = await admin.from('mumin').update(allowedUpdate).eq('its_no', targetItsNo)
//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//     return NextResponse.json({ success: true })
//   }

//   if (callerRole === 'Masool' || callerRole === 'Musaid') {
//     // Verify target member is within caller's scope
//     const { data: member } = await admin
//       .from('mumin')
//       .select('subsector_id, subsector!subsector_id(sector_id)')
//       .eq('its_no', targetItsNo)
//       .maybeSingle()

//     if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

//     const memberSubsectorId = (member as any).subsector_id
//     const memberSectorId = (member as any).subsector?.sector_id

//     if (callerRole === 'Masool' && !meta.sector_ids?.includes(memberSectorId)) {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//     }
//     if (callerRole === 'Musaid' && !meta.subsector_ids?.includes(memberSubsectorId)) {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//     }
//   }

//   // SuperAdmin or scoped staff — build update
//   const update: Record<string, unknown> = {}
//   if (body.phone !== undefined) update.phone = body.phone
//   if (body.alternate_phone !== undefined) update.alternate_phone = body.alternate_phone
//   if (body.email !== undefined) update.email = body.email
//   if (body.status !== undefined && callerRole !== 'Mumin') update.status = body.status

//   if (Object.keys(update).length === 0) {
//     return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
//   }

//   const { error } = await admin.from('mumin').update(update).eq('its_no', targetItsNo)
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//   return NextResponse.json({ success: true })
// }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/lib/types/database' // adjust path

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

  const body = await request.json() as {
    phone?: string | null
    alternate_phone?: string | null
    email?: string | null
    status?: string
  }

  const admin = createAdminClient()

  // Mumin can only edit their own phone/email
  if (callerRole === 'Mumin') {
    if (callerItsNo !== targetItsNo) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const allowedUpdate: Database['public']['Tables']['mumin']['Update'] = {}
    if (body.phone !== undefined) allowedUpdate.phone = body.phone
    if (body.email !== undefined) allowedUpdate.email = body.email
    if (Object.keys(allowedUpdate).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }
    const { error } = await admin.from('mumin').update(allowedUpdate).eq('its_no', targetItsNo)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Masool/Musaid scope check
  if (callerRole === 'Masool' || callerRole === 'Musaid') {
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
  }

  // Build update payload
  const update: Database['public']['Tables']['mumin']['Update'] = {}
  if (body.phone !== undefined) update.phone = body.phone
  if (body.alternate_phone !== undefined) update.alternate_phone = body.alternate_phone
  if (body.email !== undefined) update.email = body.email
  if (body.status !== undefined && callerRole !== 'Mumin') {
    const validStatuses: Database['public']['Tables']['mumin']['Row']['status'][] =
      ["active", "deceased", "relocated", "left_community", "inactive"]
    if (validStatuses.includes(body.status as any)) {
      update.status = body.status as typeof validStatuses[number]
    } else {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await admin.from('mumin').update(update).eq('its_no', targetItsNo)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
