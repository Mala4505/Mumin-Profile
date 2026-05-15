import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel, BASE_COLUMNS, ExportColumn } from '@/lib/export/generateExcel'
import { fetchMemberBase } from '@/lib/export/fetchMemberBase'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = req.nextUrl
  const formId = url.searchParams.get('form_id')
  const itsNosParam = url.searchParams.get('its_nos')
  const columnsParam = url.searchParams.get('columns')

  if (!formId || !itsNosParam || !columnsParam) {
    return NextResponse.json({ error: 'Missing required params: form_id, its_nos, columns' }, { status: 400 })
  }

  const itsNos = itsNosParam.split(',').filter(Boolean).map(Number)
  const columns = columnsParam.split(',').filter(Boolean)

  const admin = createAdminClient()

  const [responsesResult, fieldRowsResult, baseMap] = await Promise.all([
    admin
      .from('form_responses')
      .select('filled_for, profile_field_id, answer')
      .eq('form_id', formId)
      .eq('submitted', true)
      .in('filled_for', itsNos),
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
