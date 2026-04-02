// import { NextResponse } from 'next/server'
// import { createHmac } from 'crypto'
// import { createAdminClient } from '@/lib/supabase/admin'

// function derivePassword(itsNo: string, paciNo: string): string {
//   const secret = process.env.MUMIN_AUTH_SECRET
//   if (!secret) throw new Error('MUMIN_AUTH_SECRET is not set')
//   return createHmac('sha256', secret).update(`${itsNo}:${paciNo}`).digest('hex')
// }

// async function createAuthUser(
//   admin: ReturnType<typeof createAdminClient>,
//   email: string,
//   password: string,
//   its_no_num: number
// ) {
//   const { data: created, error } = await admin.auth.admin.createUser({
//     email,
//     password,
//     email_confirm: true,
//   })
//   if (error || !created.user) {
//     console.error('[login] createUser failed:', error)
//     return null
//   }
//   await admin
//     .from('mumin')
//     .update({ supabase_auth_id: created.user.id })
//     .eq('its_no', its_no_num)
//   return created.user
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json()
//     const its_no_raw: string = String(body.its_no ?? '').trim()
//     const paci_no: string = String(body.paci_no ?? '').trim()

//     if (!its_no_raw || !paci_no) {
//       return NextResponse.json({ error: 'ITS No and Password are required' }, { status: 400 })
//     }

//     const its_no_num = Number(its_no_raw)
//     if (isNaN(its_no_num)) {
//       return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })
//     }

//     const admin = createAdminClient()

//     // 1. Look up mumin record
//     const { data: mumin, error: muminError } = await admin
//       .from('mumin')
//       .select('its_no, sabeel_no, supabase_auth_id')
//       .eq('its_no', its_no_num)
//       .maybeSingle()

//     if (muminError) {
//       console.error('[login] mumin lookup error:', muminError)
//       return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
//     }
//     if (!mumin) {
//       return NextResponse.json({ error: '[debug] ITS No not found in mumin table' }, { status: 401 })
//     }

//     // 2. Validate PACI via family table (family.paci_no replaced house.paci_no)
//     const { data: family, error: familyError } = await admin
//       .from('family')
//       .select('paci_no')
//       .eq('sabeel_no', mumin.sabeel_no)
//       .maybeSingle()

//     if (familyError) {
//       console.error('[login] family lookup error:', familyError)
//       return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
//     }
//     if (!family || !family.paci_no) {
//       return NextResponse.json(
//         { error: `[debug] No house record found for sabeel_no: ${mumin.sabeel_no}` },
//         { status: 401 }
//       )
//     }
//     if (family.paci_no !== paci_no) {
//       return NextResponse.json(
//         { error: `[debug] PACI mismatch. DB has: ${family.paci_no}, entered: ${paci_no}` },
//         { status: 401 }
//       )
//     }

//     // 3. Derive HMAC password
//     const email = `${its_no_raw}@mumin.local`
//     const password = derivePassword(its_no_raw, paci_no)

//     // 4. Provision or sync — handles stale supabase_auth_id
//     if (!mumin.supabase_auth_id) {
//       // No auth user yet — create fresh
//       const user = await createAuthUser(admin, email, password, its_no_num)
//       if (!user) {
//         return NextResponse.json({ error: 'Account setup failed. Contact your Masool.' }, { status: 500 })
//       }
//     } else {
//       // Auth user linked — try to sync password
//       const { error: updateError } = await admin.auth.admin.updateUserById(
//         mumin.supabase_auth_id,
//         { password }
//       )
//       if (updateError) {
//         // Auth user was deleted externally but supabase_auth_id wasn't cleared — re-provision
//         console.warn('[login] updateUserById failed (stale id), re-provisioning:', updateError.message)
//         const user = await createAuthUser(admin, email, password, its_no_num)
//         if (!user) {
//           return NextResponse.json({ error: 'Account setup failed. Contact your Masool.' }, { status: 500 })
//         }
//       }
//     }

//     return NextResponse.json({ email, password })
//   } catch (err) {
//     console.error('[login] unexpected error:', err)
//     return NextResponse.json({ error: `Internal server error: ${String(err)}` }, { status: 500 })
//   }
// }


import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

function derivePassword(itsNo: string, paciNo: string): string {
  const secret = process.env.MUMIN_AUTH_SECRET
  if (!secret) throw new Error('MUMIN_AUTH_SECRET is not set')
  return createHmac('sha256', secret).update(`${itsNo}:${paciNo}`).digest('hex')
}

// async function provisionAuthUser(
//   admin: ReturnType<typeof createAdminClient>,
//   email: string,
//   password: string,
//   its_no_num: number
// ) {
//   // First: check if an auth user already exists with this email
//   const { data: listData } = await admin.auth.admin.listUsers()
//   const existing = listData?.users?.find(u => u.email === email)

//   if (existing) {
//     // Auth user exists but supabase_auth_id wasn't saved — sync password and re-link
//     console.warn('[login] auth user already exists, re-linking:', email)
//     const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, { password })
//     if (updateErr) {
//       console.error('[login] failed to update existing auth user:', updateErr)
//       return null
//     }
//     await admin.from('mumin').update({ supabase_auth_id: existing.id }).eq('its_no', its_no_num)
//     return existing
//   }

//   // No auth user exists — create fresh
//   const { data: created, error } = await admin.auth.admin.createUser({
//     email,
//     password,
//     email_confirm: true,
//   })
//   if (error || !created.user) {
//     console.error('[login] createUser failed:', error)
//     return null
//   }
//   await admin.from('mumin').update({ supabase_auth_id: created.user.id }).eq('its_no', its_no_num)
//   return created.user
// }

async function provisionAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
  its_no_num: number
) {
  // Try to create first
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!error && created.user) {
    // Fresh creation succeeded
    await admin.from('mumin').update({ supabase_auth_id: created.user.id }).eq('its_no', its_no_num)
    return created.user
  }

  // If email already exists, find that user and re-link + sync password
  if (error?.code === 'email_exists') {
    console.warn('[login] email already exists, searching and re-linking:', email)

    // Search by email using the filter param (avoids pagination issues)
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find(u => u.email === email)

    if (!existing) {
      console.error('[login] email_exists but could not find user in list')
      return null
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, { password })
    if (updateErr) {
      console.error('[login] failed to update existing auth user:', updateErr)
      return null
    }

    await admin.from('mumin').update({ supabase_auth_id: existing.id }).eq('its_no', its_no_num)
    return existing
  }

  // Any other error
  console.error('[login] createUser failed:', error)
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const its_no_raw: string = String(body.its_no ?? '').trim()
    const paci_no: string = String(body.paci_no ?? '').trim()

    if (!its_no_raw || !paci_no) {
      return NextResponse.json({ error: 'ITS No and Password are required' }, { status: 400 })
    }

    const its_no_num = Number(its_no_raw)
    if (isNaN(its_no_num)) {
      return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Look up mumin record
    const { data: mumin, error: muminError } = await admin
      .from('mumin')
      .select('its_no, sabeel_no, supabase_auth_id')
      .eq('its_no', its_no_num)
      .maybeSingle()

    if (muminError) {
      console.error('[login] mumin lookup error:', muminError)
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
    }
    if (!mumin) {
      return NextResponse.json({ error: '[debug] ITS No not found in mumin table' }, { status: 401 })
    }

    // 2. Validate PACI via family table
    const { data: family, error: familyError } = await admin
      .from('family')
      .select('paci_no')
      .eq('sabeel_no', mumin.sabeel_no)
      .maybeSingle()

    if (familyError) {
      console.error('[login] family lookup error:', familyError)
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
    }
    if (!family || !family.paci_no) {
      return NextResponse.json(
        { error: `[debug] No house record found for sabeel_no: ${mumin.sabeel_no}` },
        { status: 401 }
      )
    }
    if (family.paci_no !== paci_no) {
      return NextResponse.json(
        { error: `[debug] PACI mismatch. DB has: ${family.paci_no}, entered: ${paci_no}` },
        { status: 401 }
      )
    }

    // 3. Derive HMAC password
    const email = `${its_no_raw}@mumin.local`
    const password = derivePassword(its_no_raw, paci_no)

    // 4. Provision or sync auth user
    if (!mumin.supabase_auth_id) {
      // No auth user linked — create or re-link if email already exists
      const user = await provisionAuthUser(admin, email, password, its_no_num)
      if (!user) {
        return NextResponse.json({ error: 'Account setup failed. Contact your Masool.' }, { status: 500 })
      }
    } else {
      // Auth user linked — sync password
      const { error: updateError } = await admin.auth.admin.updateUserById(
        mumin.supabase_auth_id,
        { password }
      )
      if (updateError) {
        // Stale supabase_auth_id — re-provision
        console.warn('[login] updateUserById failed (stale id), re-provisioning:', updateError.message)
        await admin.from('mumin').update({ supabase_auth_id: null }).eq('its_no', its_no_num)
        const user = await provisionAuthUser(admin, email, password, its_no_num)
        if (!user) {
          return NextResponse.json({ error: 'Account setup failed. Contact your Masool.' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ email, password })
  } catch (err) {
    console.error('[login] unexpected error:', err)
    return NextResponse.json({ error: `Internal server error: ${String(err)}` }, { status: 500 })
  }
}