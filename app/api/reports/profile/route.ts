import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = req.nextUrl
  const categoryId = url.searchParams.get('category_id')
  const fieldId = url.searchParams.get('field_id')
  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')
  const sectorId = url.searchParams.get('sector_id')
  const subsectorId = url.searchParams.get('subsector_id')

  const supabase = await createClient()

  // Build scoped member query
  let memberQuery = supabase
    .from('mumin')
    .select('its_no, name, subsector_id, subsector!inner(sector_id)')

  if (session.role === 'Masool' && session.sector_ids?.length) {
    memberQuery = memberQuery.in('subsector.sector_id', session.sector_ids)
  }
  if (session.role === 'Musaid' && session.subsector_ids?.length) {
    memberQuery = memberQuery.in('subsector_id', session.subsector_ids)
  }
  if (sectorId) memberQuery = memberQuery.eq('subsector.sector_id', Number(sectorId))
  if (subsectorId) memberQuery = memberQuery.eq('subsector_id', Number(subsectorId))

  const { data: members, error: memberErr } = await memberQuery
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  const itsNos = ((members ?? []) as Array<{ its_no: number }>).map((m) => m.its_no)
  if (!itsNos.length) return NextResponse.json({ members: [], values: [] })

  // Profile values with field info
  let pvQuery = supabase
    .from('profile_value')
    .select('its_no, field_id, value, profile_field!inner(caption, category_id, field_type)')
    .in('its_no', itsNos)

  if (fieldId) pvQuery = pvQuery.eq('field_id', Number(fieldId))
  if (categoryId) pvQuery = pvQuery.eq('profile_field.category_id', Number(categoryId))

  const { data: values, error: pvErr } = await pvQuery
  if (pvErr) return NextResponse.json({ error: pvErr.message }, { status: 500 })

  // Fetch all profile categories and fields for the column selector
  const { data: categories } = await supabase
    .from('profile_category')
    .select('id, name, sort_order')
    .order('sort_order')

  const { data: fields } = await supabase
    .from('profile_field')
    .select('id, category_id, caption, field_type, sort_order')
    .order('sort_order')

  return NextResponse.json({
    members: members ?? [],
    values: values ?? [],
    categories: categories ?? [],
    fields: fields ?? [],
  })
}
