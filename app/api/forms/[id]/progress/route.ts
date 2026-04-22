// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'
// import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'

// export async function GET(
//   _: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const session = await getSession()
//   if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

//   const { id } = await params
//   const supabase = await createClient()
//   const { data, error } = await supabase
//     .from('form_filler_progress')
//     .select('*')
//     .eq('form_id', id)
//     .eq('filler_its_no', String(session.its_no))
//     .single()

//   if (error) return NextResponse.json({ progress: null })
//   return NextResponse.json({ progress: data })
// }

// export async function POST(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const session = await getSession()
//   if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

//   const { id } = await params
//   const supabase = await createClient()
//   const { data: form } = await supabase.from('forms').select('filler_access').eq('id', id).single()
//   if (!form || !isAuthorizedFiller(form.filler_access, session)) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const { progress } = await req.json()
//   const { error } = await supabase
//     .from('form_filler_progress')
//     .upsert({ form_id: id, filler_its_no: String(session.its_no), progress, last_saved: new Date().toISOString() })

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json({ success: true })
// }

// form_filler_progress table was deprecated and dropped (plan section 3).
// Progress is now tracked client-side; the submitted boolean on form_responses is the source of truth.
// These stubs prevent 404 errors from any legacy callers.

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ progress: null })
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true })
}

