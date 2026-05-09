import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export interface AnalyticsForm {
  id: string
  title: string
  event_id: number | null
  event_title: string | null
  event_date: string | null
}

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest) => {
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
)
