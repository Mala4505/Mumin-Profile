import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
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

// Consolidates: event-trend, form-activity, profile-completion
// Usage:
//   GET /api/analytics/trends?type=event&event_id=N&field_id=N  (SuperAdmin only)
//   GET /api/analytics/trends?type=form
//   GET /api/analytics/trends?type=profile

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { session, scopedSubsectorIds }) => {
    const type = req.nextUrl.searchParams.get('type')
    const supabase = await createClient()

    // ── event trend (SuperAdmin only) ─────────────────────────────────────────
    if (type === 'event') {
      if (session.role !== 'SuperAdmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { searchParams } = req.nextUrl
      const eventId = searchParams.get('event_id')
      const fieldId = searchParams.get('field_id')

      if (!eventId || !fieldId) {
        return NextResponse.json({ error: 'event_id and field_id required' }, { status: 400 })
      }

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
        return NextResponse.json({ event: eventData, trend: [] })
      }

      const trend = await Promise.all(
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

      return NextResponse.json({ event: eventData ?? null, trend })
    }

    // ── form submission activity (last 30 days) ───────────────────────────────
    if (type === 'form') {
      const since = new Date()
      since.setDate(since.getDate() - 30)

      const { data, error } = await supabase
        .from('form_responses')
        .select('submitted_at')
        .gte('submitted_at', since.toISOString())
        .order('submitted_at', { ascending: true })

      if (error) return NextResponse.json([])

      const byDate = new Map<string, number>()
      for (const row of (data ?? []) as Array<{ submitted_at: string }>) {
        const date = row.submitted_at.slice(0, 10)
        byDate.set(date, (byDate.get(date) ?? 0) + 1)
      }

      const result: Array<{ date: string; submissions: number }> = []
      for (let i = 0; i < 30; i++) {
        const d = new Date(since)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        result.push({ date: label, submissions: byDate.get(key) ?? 0 })
      }

      return NextResponse.json(result)
    }

    // ── profile completion by category ────────────────────────────────────────
    if (type === 'profile') {
      let muminQuery = supabase
        .from('mumin')
        .select('its_no', { count: 'exact', head: true })
        .eq('status', 'active')

      if (scopedSubsectorIds !== null) {
        muminQuery = muminQuery.in('subsector_id', scopedSubsectorIds)
      }

      const { count: totalMembers } = await muminQuery

      if (!totalMembers || totalMembers === 0) return NextResponse.json([])

      const { data: categories, error: catError } = await supabase
        .from('profile_category')
        .select('name, profile_field(id)')
        .order('sort_order', { ascending: true })

      if (catError) return NextResponse.json([])

      const result: Array<{ name: string; value: number }> = []

      for (const cat of (categories ?? []) as unknown as Array<{
        name: string
        profile_field: Array<{ id: string }>
      }>) {
        const fieldIds = cat.profile_field.map(f => f.id)
        if (fieldIds.length === 0) continue

        const { data: valuedRows } = await supabase
          .from('profile_value')
          .select('its_no')
          .in('field_id', fieldIds as any)

        const distinctMembers = new Set((valuedRows ?? []).map((r: { its_no: number }) => r.its_no)).size
        const pct = Math.round((distinctMembers / totalMembers) * 100)
        result.push({ name: cat.name, value: pct })
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'type must be event|form|profile' }, { status: 400 })
  }
)
