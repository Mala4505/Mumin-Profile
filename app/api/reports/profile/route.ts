import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = req.nextUrl
  const categoryId = url.searchParams.get('category_id')
  const fieldId = url.searchParams.get('field_id')
  const sectorId = url.searchParams.get('sector_id')
  const subsectorId = url.searchParams.get('subsector_id')
  const itsNoFilter = url.searchParams.get('its_no')
  const sabelNoFilter = url.searchParams.get('sabeel_no')
  const hofOnly = url.searchParams.get('hof_only') === '1'
  const buildingFilter = url.searchParams.get('building_name')
  const masoolFilter = url.searchParams.get('masool_name')
  const musaidFilter = url.searchParams.get('musaid_name')

  const admin = createAdminClient()

  // Query member_directory which has all needed columns
  let memberQuery = admin
    .from('member_directory')
    .select(
      'its_no, name, subsector_id, sector_id, sabeel_no, head_its_no, building_name, masool_name, musaid_names'
    )
    .eq('status', 'active')

  // Role-based scoping
  if (session.role === 'Masool' && session.sector_ids?.length) {
    memberQuery = memberQuery.in('sector_id', session.sector_ids)
  }
  if (session.role === 'Musaid' && session.subsector_ids?.length) {
    memberQuery = memberQuery.in('subsector_id', session.subsector_ids)
  }

  // Explicit sector/subsector filters from UI
  if (sectorId) memberQuery = memberQuery.eq('sector_id', Number(sectorId))
  if (subsectorId) memberQuery = memberQuery.eq('subsector_id', Number(subsectorId))

  // New identity filters
  if (itsNoFilter) memberQuery = memberQuery.eq('its_no', Number(itsNoFilter))
  if (sabelNoFilter) memberQuery = memberQuery.eq('sabeel_no', sabelNoFilter)
  if (buildingFilter) memberQuery = memberQuery.ilike('building_name', `%${buildingFilter}%`)
  if (masoolFilter) memberQuery = memberQuery.ilike('masool_name', `%${masoolFilter}%`)
  if (musaidFilter) memberQuery = memberQuery.ilike('musaid_names', `%${musaidFilter}%`)

  const { data: members, error: memberErr } = await memberQuery
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  // HOF-only: keep only members who are their own head_its_no
  const filteredMembers = hofOnly
    ? (members ?? []).filter((m: any) => m.its_no === m.head_its_no)
    : (members ?? [])

  const itsNos = filteredMembers.map((m: any) => m.its_no as number)
  if (!itsNos.length) {
    const { data: categories } = await admin.from('profile_category').select('id, name, sort_order').order('sort_order')
    const { data: fields } = await admin.from('profile_field').select('id, category_id, caption, field_type, sort_order').order('sort_order')
    return NextResponse.json({ members: [], values: [], categories: categories ?? [], fields: fields ?? [] })
  }

  // Profile values with field info
  let pvQuery = admin
    .from('profile_value')
    .select('its_no, field_id, value, profile_field!inner(caption, category_id, field_type)')
    .in('its_no', itsNos)
    .eq('data_active', true)

  if (fieldId) pvQuery = pvQuery.eq('field_id', Number(fieldId))
  if (categoryId) pvQuery = pvQuery.eq('profile_field.category_id', Number(categoryId))

  const { data: values, error: pvErr } = await pvQuery
  if (pvErr) return NextResponse.json({ error: pvErr.message }, { status: 500 })

  const { data: categories } = await admin
    .from('profile_category')
    .select('id, name, sort_order')
    .order('sort_order')

  const { data: fields } = await admin
    .from('profile_field')
    .select('id, category_id, caption, field_type, sort_order')
    .order('sort_order')

  return NextResponse.json({
    members: filteredMembers,
    values: values ?? [],
    categories: categories ?? [],
    fields: fields ?? [],
  })
}
