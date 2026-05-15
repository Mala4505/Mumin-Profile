import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { generateExcel, BASE_COLUMNS, ExportColumn } from '@/lib/export/generateExcel'
import { fetchMemberBase } from '@/lib/export/fetchMemberBase'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const itsNos = params.get('its_nos')?.split(',').filter(Boolean).map(Number) ?? []
  const columns = params.get('columns')?.split(',').filter(Boolean) ?? []

  if (!itsNos.length || !columns.length) {
    return NextResponse.json({ error: 'Missing its_nos or columns' }, { status: 400 })
  }

  const supabase = await createClient()

  const [baseMap, valuesResult, fieldsResult] = await Promise.all([
    fetchMemberBase(itsNos, supabase),
    supabase
      .from('profile_value')
      .select('its_no, field_id, value')
      .in('its_no', itsNos),
    supabase
      .from('profile_field')
      .select('id, caption'),
  ])

  const fieldCaptionMap: Record<number, string> = {}
  for (const f of fieldsResult.data ?? []) fieldCaptionMap[f.id] = f.caption

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
    const memberVals = (valuesResult.data ?? []).filter(v => v.its_no === itsNo)
    for (const val of memberVals) {
      const caption = fieldCaptionMap[val.field_id] ?? String(val.field_id)
      if (extraCols.find(c => c.key === caption)) {
        row[caption] = val.value ?? ''
      }
    }
    return row
  })

  const allCols = [...BASE_COLUMNS, ...extraCols]
  const buffer = await generateExcel(rows, allCols, 'Profile Report')
  const filename = `profile-report-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
