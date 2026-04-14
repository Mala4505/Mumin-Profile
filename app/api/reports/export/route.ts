import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const itsNos = params.get('its_nos')?.split(',').filter(Boolean) ?? []
  const columns = params.get('columns')?.split(',').filter(Boolean) ?? []

  if (!itsNos.length || !columns.length) {
    return NextResponse.json({ error: 'Missing its_nos or columns' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('mumin')
    .select('its_no, name')
    .in('its_no', itsNos.map(Number))

  const { data: values } = await supabase
    .from('profile_value')
    .select('its_no, field_id, value')
    .in('its_no', itsNos.map(Number))

  // Fetch field captions so we can use them as column headers
  const { data: fields } = await supabase
    .from('profile_field')
    .select('id, caption')

  const fieldCaptionMap: Record<number, string> = {}
  for (const f of fields ?? []) fieldCaptionMap[f.id] = f.caption

  // Pivot: one row per member, columns = field captions
  const pivoted = (members ?? []).map((m) => {
    const row: Record<string, string> = {
      its_no: String(m.its_no),
      name: m.name,
    }
    const memberVals = (values ?? []).filter((v) => v.its_no === m.its_no)
    for (const val of memberVals) {
      const caption = fieldCaptionMap[val.field_id] ?? String(val.field_id)
      row[caption] = val.value ?? ''
    }
    return row
  })

  const filtered = pivoted.map((r) => {
    const out: Record<string, string> = {}
    for (const col of columns) out[col] = r[col] ?? ''
    return out
  })

  const csv = Papa.unparse(filtered, { columns })
  const filename = `profile-report-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
