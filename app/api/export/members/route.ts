import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel, DEFAULT_COLUMNS } from '@/lib/export/generateExcel'
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

  const supabase = await createClient()

  let query = supabase
    .from('mumin')
    .select(`
      its_no, name, gender, balig_status, phone, alternate_phone,
      email, status, sabeel_no, date_of_birth,
      subsector!inner (
        subsector_name,
        sector!inner ( sector_name )
      )
    `)
    .order('name')

  if (filters.sector_id) query = query.eq('subsector.sector.sector_id', filters.sector_id)
  if (filters.subsector_id) query = query.eq('subsector_id', filters.subsector_id)
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.balig_status) query = query.eq('balig_status', filters.balig_status)
  if (filters.status) query = query.eq('status', filters.status)
  else query = query.eq('status', 'active')
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) return new NextResponse('Export failed', { status: 500 })

  const members = (data ?? []).map((m: any) => ({
    its_no: m.its_no,
    name: m.name,
    gender: m.gender === 'M' ? 'Male' : 'Female',
    balig_status: m.balig_status,
    phone: m.phone ?? '',
    alternate_phone: m.alternate_phone ?? '',
    email: m.email ?? '',
    status: m.status,
    sabeel_no: m.sabeel_no,
    date_of_birth: m.date_of_birth ?? '',
    subsector_name: m.subsector?.subsector_name ?? '',
    sector_name: m.subsector?.sector?.sector_name ?? '',
  }))

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
