import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel, BASE_COLUMNS, ExportColumn } from '@/lib/export/generateExcel'
import { fetchMemberBase } from '@/lib/export/fetchMemberBase'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { ageToDobRange } from '@/lib/members/ageToDobRange'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = req.nextUrl
  const formId = url.searchParams.get('form_id')
  const itsNosParam = url.searchParams.get('its_nos')
  const columnsParam = url.searchParams.get('columns')
  const sectorId = url.searchParams.get('sector_id')
  const subsectorId = url.searchParams.get('subsector_id')
  const gender = url.searchParams.get('gender')
  const ageFromParam = url.searchParams.get('age_from')
  const ageToParam = url.searchParams.get('age_to')

  if (!formId || !itsNosParam || !columnsParam) {
    return NextResponse.json({ error: 'Missing required params: form_id, its_nos, columns' }, { status: 400 })
  }

  const requestedItsNos = itsNosParam.split(',').filter(Boolean).map(Number)
  const columns = columnsParam.split(',').filter(Boolean)

  const admin = createAdminClient()

  // Coordinators may only export forms belonging to their assigned umoors.
  // (Service-role client bypasses RLS → app-level guard.)
  const umoorScope = resolveUmoorScope(session)
  const { data: form } = await admin
    .from('forms')
    .select('id, umoor_category_id')
    .eq('id', formId)
    .single()
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  if (umoorScope && (form.umoor_category_id === null || !umoorScope.includes(form.umoor_category_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Re-apply geo scope + demographic filters server-side so the export can never
  // contain members the on-screen report would not show.
  let memberQuery = admin
    .from('member_directory')
    .select('its_no')
    .in('its_no', requestedItsNos)

  if (session.role === 'Masool' && session.sector_ids?.length) {
    memberQuery = memberQuery.in('sector_id', session.sector_ids)
  }
  if (session.role === 'Musaid' && session.subsector_ids?.length) {
    memberQuery = memberQuery.in('subsector_id', session.subsector_ids)
  }
  if (sectorId) memberQuery = memberQuery.eq('sector_id', Number(sectorId))
  if (subsectorId) memberQuery = memberQuery.eq('subsector_id', Number(subsectorId))
  if (gender === 'M' || gender === 'F') memberQuery = memberQuery.eq('gender', gender)

  const ageFrom = ageFromParam ? Number(ageFromParam) : null
  const ageTo = ageToParam ? Number(ageToParam) : null
  const { minDob, maxDob } = ageToDobRange(
    Number.isFinite(ageFrom as number) ? ageFrom : null,
    Number.isFinite(ageTo as number) ? ageTo : null,
  )
  if (minDob) memberQuery = memberQuery.gte('date_of_birth', minDob)
  if (maxDob) memberQuery = memberQuery.lte('date_of_birth', maxDob)

  const { data: memberRows, error: memberErr } = await memberQuery
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  const allowed = new Set((memberRows ?? []).map((m) => m.its_no))
  const itsNos = requestedItsNos.filter((n) => allowed.has(n))

  const [responsesResult, fieldRowsResult, baseMap] = await Promise.all([
    admin
      .from('form_responses')
      .select('filled_for, profile_field_id, answer')
      .eq('form_id', formId)
      .eq('submitted', true)
      .in('filled_for', itsNos.length ? itsNos : [-1]),
    admin
      .from('form_fields')
      .select('field_id, profile_field!inner(caption)')
      .eq('form_id', formId),
    fetchMemberBase(itsNos, admin),
  ])

  if (responsesResult.error) {
    return NextResponse.json({ error: responsesResult.error.message }, { status: 500 })
  }

  const captionMap: Record<number, string> = {}
  for (const ff of fieldRowsResult.data ?? []) {
    captionMap[(ff as any).field_id] = (ff as any).profile_field.caption
  }

  const answersMap: Record<number, Record<string, string>> = {}
  for (const r of responsesResult.data ?? []) {
    if (!r.filled_for) continue
    if (!answersMap[r.filled_for]) answersMap[r.filled_for] = {}
    if (r.profile_field_id !== null) {
      const caption = captionMap[r.profile_field_id] ?? String(r.profile_field_id)
      answersMap[r.filled_for][caption] = r.answer ?? ''
    }
  }

  const baseKeys = new Set(BASE_COLUMNS.map(c => c.key))
  const extraCols: ExportColumn[] = columns
    .filter(c => !baseKeys.has(c) && c !== 'its_no' && c !== 'name')
    .map(c => ({ key: c, header: c, width: 20 }))

  const rows = itsNos.map((itsNo) => {
    const base = baseMap.get(itsNo)
    const row: Record<string, unknown> = {
      its_no: itsNo,
      name: base?.name ?? '',
      sabeel_no: base?.sabeel_no ?? '',
      sector_name: base?.sector_name ?? '',
      subsector_name: base?.subsector_name ?? '',
      masool_name: base?.masool_name ?? '',
      musaid_names: base?.musaid_names ?? '',
    }
    for (const col of extraCols) {
      row[col.key] = answersMap[itsNo]?.[col.key] ?? ''
    }
    return row
  })

  const allCols = [...BASE_COLUMNS, ...extraCols]
  const buffer = await generateExcel(rows, allCols, 'Form Report')
  const filename = `form-report-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
