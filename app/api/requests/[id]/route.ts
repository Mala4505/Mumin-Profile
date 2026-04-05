import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getJwtMeta(accessToken: string): { role?: string; its_no?: number } {
  try {
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.app_metadata ?? {}
  } catch { return {} }
}

// PATCH — SuperAdmin toggles status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  const { id } = await params
  const requestId = parseInt(id)
  if (isNaN(requestId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json() as { status: 'pending' | 'done' }
  if (!['pending', 'done'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be pending or done' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_request')
    .update({
      status: body.status,
      reviewed_by: meta.its_no!,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('id, status, reviewed_by, reviewed_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
