import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface TrendPoint {
  form_id: string
  label: string
  date: string | null
  total: number
  answers: Record<string, number>
}

export interface EventTrendResponse {
  event: { title: string; event_date: string } | null
  trend: TrendPoint[]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('event_id')
  const fieldId = searchParams.get('field_id')

  if (!eventId || !fieldId) {
    return NextResponse.json({ error: 'event_id and field_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const [{ data: eventForms }, { data: eventData }] = await Promise.all([
    supabase
      .from('forms')
      .select('id, title, published_at, expires_at')
      .eq('event_id', parseInt(eventId))
      .in('status', ['published', 'closed'])
      .order('published_at', { ascending: true }),
    supabase
      .from('event')
      .select('title, event_date')
      .eq('id', parseInt(eventId))
      .single(),
  ])

  if (!eventForms || eventForms.length === 0) {
    return NextResponse.json({ event: eventData, trend: [] } satisfies EventTrendResponse)
  }

  const trend: TrendPoint[] = await Promise.all(
    (eventForms as Array<{ id: string; title: string; published_at: string | null; expires_at: string | null }>).map(
      async (form) => {
        const { data: responses } = await supabase
          .from('form_responses')
          .select('answer')
          .eq('form_id', form.id)
          .eq('profile_field_id', parseInt(fieldId))

        const counts: Record<string, number> = {}
        let total = 0
        for (const r of (responses ?? [])) {
          const ans = r.answer ?? '(blank)'
          counts[ans] = (counts[ans] ?? 0) + 1
          total++
        }

        return {
          form_id: form.id,
          label: form.title,
          date: form.published_at ?? form.expires_at ?? null,
          total,
          answers: counts,
        }
      }
    )
  )

  return NextResponse.json({ event: eventData ?? null, trend } satisfies EventTrendResponse)
}
