import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel, DEFAULT_COLUMNS } from '@/lib/export/generateExcel'
import { resolveScope } from '@/lib/auth/resolveScope'
import type { MemberFilters } from '@/lib/types/app'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  if (session.role === 'Mumin') return new NextResponse('Forbidden', { status: 403 })

  const { searchParams } = req.nextUrl
  const filters: MemberFilters = {
    sector_id: searchParams.get('sector_id') ? parseInt(searchParams.get('sector_id')!) : undefined,
    subsector_id: searchParams.get('subsector_id') ? parseInt(searchParams.get('subsector_id')!) : undefined,
    gender: searchParams.get('gender') as 'M' | 'F' | undefined || undefined,
    balig_status: searchParams.get('balig_status') as 'Balig' | 'Ghair Balig' | undefined || undefined,
    status: searchParams.get('status') as MemberFilters['status'] || undefined,
    search: searchParams.get('search') || undefined,
  }

  const scopedSubsectorIds = await resolveScope(session)

  const supabase = await createClient()

  let query = supabase
    .from('member_directory')
    .select('its_no, name, gender, balig_status, phone, status, sabeel_no, head_its_no, sector_id, sector_name, subsector_id, subsector_name, building_name, floor_no, flat_no, landmark, masool_name, musaid_names')
    .order('name')

  if (scopedSubsectorIds !== null) query = query.in('subsector_id', scopedSubsectorIds)
  if (filters.sector_id) query = query.eq('sector_id', filters.sector_id)
  if (filters.subsector_id) query = query.eq('subsector_id', filters.subsector_id)
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.balig_status) query = query.eq('balig_status', filters.balig_status)
  if (filters.status) query = query.eq('status', filters.status)
  else query = query.eq('status', 'active')
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) return new NextResponse('Export failed', { status: 500 })

  let extraMap = new Map<number, { alternate_phone: string | null; email: string | null; date_of_birth: string | null }>()
  if (session.role === 'SuperAdmin' || session.role === 'Masool' || session.role === 'Musaid') {
    const its_nos = (data ?? []).map((m: any) => m.its_no)
    const { data: extras } = await supabase
      .from('mumin')
      .select('its_no, alternate_phone, email, date_of_birth')
      .in('its_no', its_nos)
    extras?.forEach((e: any) => extraMap.set(e.its_no, e))
  }

  const members = (data ?? []).map((m: any) => {
    const extra = extraMap.get(m.its_no)
    const addressParts = [
      m.building_name,
      m.floor_no ? `Floor ${m.floor_no}` : null,
      m.flat_no ? `Flat ${m.flat_no}` : null,
    ].filter(Boolean)
    return {
      its_no: m.its_no,
      name: m.name,
      gender: m.gender === 'M' ? 'Male' : 'Female',
      balig_status: m.balig_status,
      phone: m.phone ?? '',
      alternate_phone: extra?.alternate_phone ?? '',
      email: extra?.email ?? '',
      status: m.status,
      sabeel_no: m.sabeel_no,
      date_of_birth: extra?.date_of_birth ?? '',
      hof_its_no: m.head_its_no ? String(m.head_its_no) : '',
      sector_name: m.sector_name ?? '',
      subsector_name: m.subsector_name ?? '',
      address: addressParts.join(', '),
      masool_name: m.masool_name ?? '',
      musaid_names: m.musaid_names ?? '',
    }
  })

  // Determine columns based on role
  const columns = session.role === 'SuperAdmin' || session.role === 'Masool' || session.role === 'Musaid'
    ? [
        ...DEFAULT_COLUMNS,
        { key: 'alternate_phone', header: 'Alt Phone', width: 16 },
        { key: 'email', header: 'Email', width: 25 },
        { key: 'date_of_birth', header: 'Date of Birth', width: 14 },
      ]
    : DEFAULT_COLUMNS

  const buffer = await generateExcel(members, columns)

  // Log the export
  const admin = createAdminClient()
  await admin.from('export_log').insert({
    exported_by: session.its_no,
    filter_config: JSON.parse(JSON.stringify(filters)),
    column_config: JSON.parse(JSON.stringify({ columns: columns.map(c => c.key) })),
    row_count: members.length,
    status: 'completed' as const,
  })

  await admin.from('activity_log').insert({
    performed_by_its: session.its_no,
    action: 'export_generated',
    entity_type: 'export_log',
    entity_id: 'members',
    metadata: JSON.parse(JSON.stringify({ row_count: members.length, filters })),
  })

  const filename = `mumin-members-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
