import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface AnalyticsForm {
  id: string
  title: string
  event_id: number | null
  event_title: string | null
  event_date: string | null
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('forms')
    .select('id, title, event_id, event!event_id(title, event_date)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const forms: AnalyticsForm[] = (data ?? []).map((f: any) => ({
    id: f.id,
    title: f.title,
    event_id: f.event_id ?? null,
    event_title: f.event?.title ?? null,
    event_date: f.event?.event_date ?? null,
  }))

  return NextResponse.json(forms)
}
