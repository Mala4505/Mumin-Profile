import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import type { FillerAccess } from '@/lib/types/forms'

/**
 * GET /api/forms/[id]/existing-values
 *
 * Returns the most recent answer for each (audience member × form field):
 *   - Static fields  → current value from profile_value (data_active = true)
 *   - Historical fields → latest answer from form_responses for this form
 *
 * Used by BulkFillForm to pre-populate cells after a bulk import.
 * Scope-filtered the same way as /audience.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()

  // Check form exists + access
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('created_by, filler_access, status, umoor_category_id')
    .eq('id', id)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  const isCreator = Number(session.its_no) === form.created_by
  const fillerAccess = form.filler_access as FillerAccess | null
  const isFiller = fillerAccess ? isAuthorizedFiller(fillerAccess, session) : false
  // Coordinator: full access for forms in their assigned umoors (geo-unrestricted)
  const isUmoorScoped =
    session.role === 'UmoorCoordinator' &&
    form.umoor_category_id !== null &&
    (session.umoor_ids ?? []).includes(form.umoor_category_id)

  if (!isAdmin && !isCreator && !isFiller && !isUmoorScoped) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get form fields with behavior
  const { data: fieldRows, error: fieldsErr } = await supabase
    .from('form_fields')
    .select('field_id, profile_field!field_id(behavior)')
    .eq('form_id', id)

  if (fieldsErr) {
    return NextResponse.json({ error: fieldsErr.message }, { status: 500 })
  }

  const staticFieldIds: number[] = []
  const historicalFieldIds: number[] = []

  for (const ff of (fieldRows ?? []) as any[]) {
    const behavior = ff.profile_field?.behavior ?? 'static'
    if (behavior === 'static') staticFieldIds.push(ff.field_id)
    else historicalFieldIds.push(ff.field_id)
  }

  if (staticFieldIds.length === 0 && historicalFieldIds.length === 0) {
    return NextResponse.json({ values: [] })
  }

  // Get role-scoped audience ITS nos (same scope logic as /audience)
  const { data: audienceRows, error: audErr } = await supabase
    .from('form_audience')
    .select('its_no, mumin!inner(sabeel_no, subsector_id)')
    .eq('form_id', id)

  if (audErr) {
    return NextResponse.json({ error: audErr.message }, { status: 500 })
  }

  type AudienceRow = {
    its_no: number
    mumin: { sabeel_no: string; subsector_id: number }
  }
  let audience = (audienceRows ?? []) as unknown as AudienceRow[]

  if (session.role === 'Masool' && !isAdmin && !isCreator) {
    const sectorIds = (session.sector_ids ?? []).map(Number)
    if (sectorIds.length > 0) {
      const { data: subs } = await supabase
        .from('subsector')
        .select('subsector_id')
        .in('sector_id', sectorIds)
      const subsectorIds = new Set((subs ?? []).map((s) => s.subsector_id))
      audience = audience.filter((a) => subsectorIds.has(a.mumin.subsector_id))
    } else {
      audience = []
    }
  } else if (session.role === 'Musaid' && !isAdmin && !isCreator) {
    const subsectorIds = new Set((session.subsector_ids ?? []).map(Number))
    audience = subsectorIds.size > 0
      ? audience.filter((a) => subsectorIds.has(a.mumin.subsector_id))
      : []
  } else if (session.is_hof && session.sabeel_no && !isAdmin && !isCreator && !isUmoorScoped) {
    audience = audience.filter((a) => a.mumin.sabeel_no === session.sabeel_no)
  }

  const audienceItsNos = audience.map((a) => a.its_no)
  if (audienceItsNos.length === 0) {
    return NextResponse.json({ values: [] })
  }

  // Fetch from the correct source per behavior in parallel
  const [pvRows, frRows] = await Promise.all([
    staticFieldIds.length > 0
      ? supabase
          .from('profile_value')
          .select('its_no, field_id, value')
          .in('field_id', staticFieldIds)
          .in('its_no', audienceItsNos)
          .eq('data_active', true)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    historicalFieldIds.length > 0
      ? supabase
          .from('form_responses')
          .select('filled_for, profile_field_id, answer, submitted_at')
          .eq('form_id', id)
          .in('profile_field_id', historicalFieldIds)
          .in('filled_for', audienceItsNos)
          .not('filled_for', 'is', null)
          .order('submitted_at', { ascending: false })
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ])

  // De-duplicate historical rows: keep only the latest per (member, field)
  const seen = new Set<string>()
  const frDeduped: { its_no: number; field_id: number; value: string }[] = []
  for (const row of frRows as any[]) {
    if (row.filled_for === null || row.profile_field_id === null) continue
    const key = `${row.filled_for}:${row.profile_field_id}`
    if (!seen.has(key)) {
      seen.add(key)
      frDeduped.push({ its_no: row.filled_for, field_id: row.profile_field_id, value: row.answer ?? '' })
    }
  }

  const values = [
    ...(pvRows as any[]).map((r) => ({ its_no: r.its_no, field_id: r.field_id, value: r.value ?? '' })),
    ...frDeduped,
  ]

  return NextResponse.json({ values })
}
