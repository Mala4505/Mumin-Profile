import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  let query = supabase.from('forms').select('*').order('created_at', { ascending: false })

  if (['Masool', 'Musaid'].includes(session.role)) {
    // See forms they created OR are listed as a filler
    query = query.or(`created_by.eq.${session.its_no},filler_access->fillers.cs.[{"type":"specific_masool"},{"type":"specific_musaid"}]`)
    // Note: filter by filler_access is approximate here; full filtering done client-side or via RPC
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute is_expired
  const now = new Date()
  const forms = (data ?? []).map((f) => ({
    ...f,
    is_expired: f.expires_at && new Date(f.expires_at) < now,
  }))

  return NextResponse.json({ forms })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Mumin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const supabase = await createClient()

  // Validate all profile_field_ids in questions exist
  const fieldIds: string[] = (body.questions ?? []).map((q: { profile_field_id: string }) => q.profile_field_id)
  if (fieldIds.length) {
    const { data: fields } = await supabase.from('profile_field').select('id').in('id', fieldIds)
    const foundIds = new Set((fields ?? []).map((f) => f.id))
    const missing = fieldIds.filter((id) => !foundIds.has(id))
    if (missing.length) {
      return NextResponse.json({ error: `Unknown profile_field_id(s): ${missing.join(', ')}` }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('forms')
    .insert({ ...body, created_by: String(session.its_no), status: 'draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ form: data })
}
