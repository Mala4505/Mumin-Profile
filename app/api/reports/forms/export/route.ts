import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import Papa from 'papaparse'

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

  const [responsesResult, membersResult, fieldRowsResult] = await Promise.all([
    admin
      .from('form_responses')
      .select('filled_for, profile_field_id, answer')
      .eq('form_id', formId)
      .eq('submitted', true)
      .in('filled_for', itsNos),
    admin.from('mumin').select('its_no, name').in('its_no', itsNos),
    admin
      .from('form_fields')
      .select('field_id, profile_field!inner(caption)')
      .eq('form_id', formId),
  ])

  if (responsesResult.error) {
    return NextResponse.json({ error: responsesResult.error.message }, { status: 500 })
  }

  const captionMap: Record<number, string> = {}
  for (const ff of fieldRowsResult.data ?? []) {
    captionMap[(ff as any).field_id] = (ff as any).profile_field.caption
  }

  const memberMap: Record<number, string> = {}
  for (const m of membersResult.data ?? []) memberMap[m.its_no] = m.name

  const answersMap: Record<number, Record<string, string>> = {}
  for (const r of responsesResult.data ?? []) {
    if (!r.filled_for) continue
    if (!answersMap[r.filled_for]) answersMap[r.filled_for] = {}
    if (r.profile_field_id !== null) {
      const caption = captionMap[r.profile_field_id] ?? String(r.profile_field_id)
      answersMap[r.filled_for][caption] = r.answer ?? ''
    }
  }

  const rows = itsNos.map((itsNo) => {
    const row: Record<string, string> = {
      its_no: String(itsNo),
      name: memberMap[itsNo] ?? '',
    }
    for (const col of columns) {
      if (col !== 'its_no' && col !== 'name') {
        row[col] = answersMap[itsNo]?.[col] ?? ''
      }
    }
    return row
  })

  const csv = Papa.unparse(rows, { columns })
  const filename = `form-report-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
