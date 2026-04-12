import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()
  const { data: form, error: formErr } = await supabase.from('forms').select('*').eq('id', id).single()
  if (formErr) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  if (!['published'].includes(form.status)) {
    return NextResponse.json({ error: 'Form is not open for responses' }, { status: 400 })
  }

  // Check expiry
  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Form has expired' }, { status: 400 })
  }

  // Check filler authorization
  if (!isAuthorizedFiller(form.filler_access, session)) {
    return NextResponse.json({ error: 'Not authorized to fill this form' }, { status: 403 })
  }

  // For self-fill (Mumin): verify their its_no is in form_audience
  if (session.role === 'Mumin') {
    const { data: inAudience } = await supabase
      .from('form_audience')
      .select('its_no')
      .eq('form_id', id)
      .eq('its_no', String(session.its_no))
      .single()

    if (!inAudience) return NextResponse.json({ error: 'Not in form audience' }, { status: 403 })
  }

  const { responses } = await req.json()

  // filled_by always set from session — never from client input
  const payload = {
    form_id: id,
    filled_by: String(session.its_no),
    responses,
  }

  const { error: rpcErr } = await supabase.rpc('submit_form_responses', { payload })
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
