// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'
// import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'

// export async function GET(
//   _req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const session = await getSession()
//   if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

//   // Mumin can never view responses
//   if (session.role === 'Mumin') {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const { id } = await params
//   const supabase = await createClient()

//   // Fetch the form
//   const { data: form, error: formErr } = await supabase
//     .from('forms')
//     .select('*')
//     .eq('id', id)
//     .single()

//   if (formErr || !form) {
//     return NextResponse.json({ error: 'Form not found' }, { status: 404 })
//   }

//   // Masool/Musaid: must be an authorized filler to view responses
//   if (session.role === 'Masool' || session.role === 'Musaid') {
//     if (!isAuthorizedFiller(form.filler_access, session)) {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//     }
//   }

//   // Fetch responses joined with mumin name
//   const { data: responses, error: respErr } = await supabase
//     .from('form_response')
//     .select('*, mumin!filled_for(name, its_no)')
//     .eq('form_id', id)
//     .eq('submitted', true)
//     .order('submitted_at', { ascending: false })

//   if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

//   // Fetch audience joined with subsector name
//   const { data: audience, error: audErr } = await supabase
//     .from('form_audience')
//     .select('its_no, mumin!its_no(name, subsector!subsector_id(name))')
//     .eq('form_id', id)

//   if (audErr) return NextResponse.json({ error: audErr.message }, { status: 500 })

//   return NextResponse.json({ form, responses: responses ?? [], audience: audience ?? [] })
// }

// app/api/forms/[id]/responses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import type { FillerAccess } from '@/lib/types/forms'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (session.role === 'Mumin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: form, error: formErr } = await supabase.from('forms').select('*').eq('id', id).single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  if (session.role === 'Masool' || session.role === 'Musaid') {
    const fillerAccess = form.filler_access as FillerAccess | null
    if (!fillerAccess || !isAuthorizedFiller(fillerAccess, session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // ✅ pluralized table name and type-safe join
  const { data: responses, error: respErr } = await supabase
    .from('form_responses')
    .select('*, mumin!filled_for(name, its_no)')
    .eq('form_id', id)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  const { data: audience, error: audErr } = await supabase
    .from('form_audience')
    .select('its_no, mumin!its_no(name, subsector!subsector_id(name))')
    .eq('form_id', id)

  if (audErr) return NextResponse.json({ error: audErr.message }, { status: 500 })

  return NextResponse.json({ form, responses: responses ?? [], audience: audience ?? [] })
}
