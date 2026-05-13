import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  let formData: any[] = []

  if (session.role === 'Mumin') {
    // Mumin sees only published self-fill forms where they're in the audience
    const { data: audienceRows } = await supabase
      .from('form_audience')
      .select('form_id')
      .eq('its_no', Number(session.its_no))

    const formIds = (audienceRows ?? []).map((a) => a.form_id as string)

    if (formIds.length > 0) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .in('id', formIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Only keep forms where self-fill is enabled in filler_access
      formData = (data ?? []).filter((f) => {
        const fillers = (f.filler_access as any)?.fillers ?? []
        return fillers.some((filler: any) => filler.type === 'self')
      })
    }
  } else if (['Masool', 'Musaid'].includes(session.role)) {
    // Run three separate queries to avoid broken JSONB OR syntax in PostgREST
    const itsNo = Number(session.its_no)
    const itsStr = String(session.its_no)
    const specificType = session.role === 'Masool' ? 'specific_masool' : 'specific_musaid'

    const [myFormsResult, roleFormsResult, specificFormsResult] = await Promise.all([
      // Forms this user created (any status)
      supabase
        .from('forms')
        .select('*')
        .eq('created_by', itsNo)
        .order('created_at', { ascending: false }),

      // Published forms this user can fill by role (e.g. "All Masools")
      supabase
        .from('forms')
        .select('*')
        .eq('status', 'published')
        .filter(
          'filler_access',
          'cs',
          JSON.stringify({ fillers: [{ type: 'role', value: session.role }] }),
        )
        .order('created_at', { ascending: false }),

      // Published forms where this user is specifically named
      supabase
        .from('forms')
        .select('*')
        .eq('status', 'published')
        .filter(
          'filler_access',
          'cs',
          JSON.stringify({ fillers: [{ type: specificType, value: [itsStr] }] }),
        )
        .order('created_at', { ascending: false }),
    ])

    // Merge and deduplicate by form ID
    const seen = new Set<string>()
    for (const form of [
      ...(myFormsResult.data ?? []),
      ...(roleFormsResult.data ?? []),
      ...(specificFormsResult.data ?? []),
    ]) {
      if (!seen.has(form.id)) {
        seen.add(form.id)
        formData.push(form)
      }
    }

    formData.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  } else {
    // SuperAdmin / Admin — see all forms
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    formData = data ?? []
  }

  // ── Compute is_expired and fetch response/audience counts ─────────────────
  const now = new Date()
  const formIds = formData.map((f) => f.id)
  const responseCounts: Record<string, number> = {}
  const audienceCounts: Record<string, number> = {}

  if (formIds.length) {
    const { data: rCounts } = await supabase
      .from('form_responses')
      .select('form_id')
      .in('form_id', formIds)
      .eq('submitted', true)

    for (const row of rCounts ?? []) {
      if (row.form_id) {
        responseCounts[row.form_id] = (responseCounts[row.form_id] ?? 0) + 1
      }
    }

    const { data: aCounts } = await supabase
      .from('form_audience')
      .select('form_id')
      .in('form_id', formIds)

    for (const row of aCounts ?? []) {
      audienceCounts[row.form_id] = (audienceCounts[row.form_id] ?? 0) + 1
    }
  }

  const forms = formData.map((f) => ({
    ...f,
    is_expired: !!(f.expires_at && new Date(f.expires_at) < now),
    response_count: responseCounts[f.id] ?? 0,
    audience_count: audienceCounts[f.id] ?? 0,
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

  const { data, error } = await supabase
    .from('forms')
    .insert({
      title: body.title,
      description: body.description ?? null,
      umoor_category_id: body.umoor_category_id ?? null,
      event_id: body.event_id ?? null,
      form_type: body.form_type ?? 'simple',
      audience_filters: body.audience_filters ?? { all: true },
      filler_access: body.filler_access ?? { fillers: [] },
      expires_at: body.expires_at ?? null,
      created_by: Number(session.its_no),
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ form: data })
}
