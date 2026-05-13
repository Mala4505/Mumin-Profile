import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = req.nextUrl
  const formId = url.searchParams.get('form_id')
  const admin = createAdminClient()

  // ── No form_id → return form list ─────────────────────────────────────────
  if (!formId) {
    const sel = 'id, title, status, created_at, created_by'
    let formsData: Array<{ id: string; title: string; status: string; created_at: string; created_by: number | null }> = []

    if (session.role === 'Masool' || session.role === 'Musaid') {
      // Show forms the user created OR forms where they are listed as a filler.
      // Three separate queries are needed because PostgREST JSONB OR filtering is broken.
      const itsNo = Number(session.its_no)
      const itsStr = String(session.its_no)
      const specificType = session.role === 'Masool' ? 'specific_masool' : 'specific_musaid'

      const [myForms, roleForms, specificForms] = await Promise.all([
        admin.from('forms').select(sel).eq('created_by', itsNo).order('created_at', { ascending: false }),
        admin.from('forms').select(sel).eq('status', 'published').filter('filler_access', 'cs', JSON.stringify({ fillers: [{ type: 'role', value: session.role }] })),
        admin.from('forms').select(sel).eq('status', 'published').filter('filler_access', 'cs', JSON.stringify({ fillers: [{ type: specificType, value: [itsStr] }] })),
      ])

      const seen = new Set<string>()
      for (const row of [...(myForms.data ?? []), ...(roleForms.data ?? []), ...(specificForms.data ?? [])]) {
        if (!seen.has(row.id)) { seen.add(row.id); formsData.push(row as typeof formsData[0]) }
      }
      formsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
      // SuperAdmin / Admin: all forms
      const { data, error } = await admin.from('forms').select(sel).order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      formsData = (data ?? []) as typeof formsData
    }

    const formIds = formsData.map((f) => f.id)
    const responseCounts: Record<string, number> = {}

    if (formIds.length) {
      const { data: rCounts } = await admin
        .from('form_responses')
        .select('form_id')
        .in('form_id', formIds)
        .eq('submitted', true)

      for (const row of rCounts ?? []) {
        if (row.form_id) responseCounts[row.form_id] = (responseCounts[row.form_id] ?? 0) + 1
      }
    }

    const forms = formsData.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      response_count: responseCounts[f.id] ?? 0,
    }))

    return NextResponse.json({ forms })
  }

  // ── With form_id → return report data ─────────────────────────────────────
  const sectorId = url.searchParams.get('sector_id')
  const subsectorId = url.searchParams.get('subsector_id')

  const { data: form } = await admin
    .from('forms')
    .select('id, created_by')
    .eq('id', formId)
    .single()

  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  // Questions from form_fields → profile_field
  const { data: fieldRows, error: fieldsErr } = await admin
    .from('form_fields')
    .select('field_id, sort_order, profile_field!inner(caption, field_type)')
    .eq('form_id', formId)
    .order('sort_order')

  if (fieldsErr) return NextResponse.json({ error: fieldsErr.message }, { status: 500 })

  const questions = (fieldRows ?? []).map((ff: any) => ({
    field_id: ff.field_id as number,
    caption: ff.profile_field.caption as string,
    field_type: ff.profile_field.field_type as string,
    sort_order: ff.sort_order as number,
  }))

  // Raw answers
  const { data: rawResponses, error: respErr } = await admin
    .from('form_responses')
    .select('filled_for, profile_field_id, answer, submitted_at')
    .eq('form_id', formId)
    .eq('submitted', true)

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  const respondentItsNos = [
    ...new Set((rawResponses ?? []).map((r) => r.filled_for).filter(Boolean) as number[]),
  ]

  if (!respondentItsNos.length) {
    return NextResponse.json({ questions, respondents: [], answers: {} })
  }

  // Member info with scope filtering
  let memberQuery = admin
    .from('member_directory')
    .select('its_no, name, sector_id, subsector_id')
    .in('its_no', respondentItsNos)

  if (session.role === 'Masool' && session.sector_ids?.length) {
    memberQuery = memberQuery.in('sector_id', session.sector_ids)
  }
  if (session.role === 'Musaid' && session.subsector_ids?.length) {
    memberQuery = memberQuery.in('subsector_id', session.subsector_ids)
  }
  if (sectorId) memberQuery = memberQuery.eq('sector_id', Number(sectorId))
  if (subsectorId) memberQuery = memberQuery.eq('subsector_id', Number(subsectorId))

  type MemberRow = { its_no: number; name: string; sector_id: number; subsector_id: number }
  const { data: membersRaw, error: memberErr } = await memberQuery
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
  const members = (membersRaw ?? []) as MemberRow[]

  const validItsNos = new Set(members.map((m) => m.its_no))

  // Build nested answers map: { [its_no]: { [field_id]: answer } }
  const answersMap: Record<number, Record<number, string>> = {}
  const submittedAtMap: Record<number, string> = {}

  for (const r of rawResponses ?? []) {
    if (!r.filled_for || !validItsNos.has(r.filled_for)) continue
    if (!answersMap[r.filled_for]) answersMap[r.filled_for] = {}
    if (r.profile_field_id !== null) {
      answersMap[r.filled_for][r.profile_field_id] = r.answer ?? ''
    }
    if (!submittedAtMap[r.filled_for] && r.submitted_at) {
      submittedAtMap[r.filled_for] = r.submitted_at
    }
  }

  const respondents = members.map((m) => ({
    its_no: m.its_no,
    name: m.name,
    submitted_at: submittedAtMap[m.its_no] ?? '',
  }))

  return NextResponse.json({ questions, respondents, answers: answersMap })
}
