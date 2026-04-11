import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

interface ProfileValueRow {
  its_no: string
  field_id: string
  value: string
  recorded_date?: string
  data_active?: string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows, fieldType } = await req.json() as {
    rows: ProfileValueRow[]
    fieldType: 'static' | 'time-series'
  }

  const supabase = await createClient()

  // Verify all its_no values exist
  const itsNos = [...new Set(rows.map((r) => r.its_no))]
  const { data: existing } = await supabase
    .from('mumin')
    .select('its_no')
    .in('its_no', itsNos)

  const validItsNos = new Set((existing ?? []).map((m) => String(m.its_no)))
  const validRows = rows.filter((r) => validItsNos.has(r.its_no))
  const skipped = rows.length - validRows.length

  const upsertRows = validRows.map((r) => ({
    its_no: r.its_no,
    field_id: r.field_id,
    value: r.value,
    recorded_date: fieldType === 'time-series' ? (r.recorded_date || null) : null,
    data_active: r.data_active === 'false' ? false : true,
  }))

  const conflictCol = fieldType === 'time-series'
    ? 'profile_value_timeseries_unique'
    : 'profile_value_static_unique'

  const { error, count } = await supabase
    .from('profile_value')
    .upsert(upsertRows, { onConflict: conflictCol, count: 'exact' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ upserted: count ?? upsertRows.length, skipped })
}
