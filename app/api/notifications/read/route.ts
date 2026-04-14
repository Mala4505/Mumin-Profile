import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const supabase = await createClient()

  // Validate ownership before marking read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notif } = await (supabase as any)
    .from('notifications')
    .select('its_no')
    .eq('id', id)
    .single()

  if (!notif || (notif as any).its_no !== String(session.its_no)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ read: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
