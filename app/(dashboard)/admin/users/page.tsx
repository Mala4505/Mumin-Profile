import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from '@/components/admin/UsersClient'

interface PageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    show_all?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SuperAdmin') redirect('/dashboard')

  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const roleFilter = params.role ?? ''
  const showAll = params.show_all === '1'

  const hasFilter = showAll || search !== '' || roleFilter !== ''

  const admin = createAdminClient()

  const [sectorsResult, subsectorsResult, sectorAssignResult, subsectorAssignResult] = await Promise.all([
    admin.from('sector').select('sector_id, sector_name').order('sector_name'),
    admin.from('subsector').select('subsector_id, sector_id, subsector_name').order('subsector_name'),
    admin.from('user_sector').select('its_no, sector_id'),
    admin.from('user_subsector').select('its_no, subsector_id'),
  ])

  let users: any[] = []

  if (hasFilter) {
    let query = admin
      .from('mumin')
      .select('its_no, name, role, is_active, last_login_at, supabase_auth_id')
      .order('name', { ascending: true })
      .limit(2000)

    if (roleFilter) {
      query = query.eq('role', roleFilter as 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin')
    }

    if (search) {
      const isNumeric = /^\d+$/.test(search)
      if (isNumeric) {
        query = query.or(`name.ilike.%${search}%,its_no.eq.${search}`)
      } else {
        query = query.ilike('name', `%${search}%`)
      }
    }

    const { data: muminRows } = await query

    // Build sector/subsector assignment maps
    const sectorMap = new Map<number, number[]>()
    for (const s of (sectorAssignResult.data ?? []) as any[]) {
      const existing = sectorMap.get(s.its_no) ?? []
      existing.push(s.sector_id)
      sectorMap.set(s.its_no, existing)
    }
    const subsectorMap = new Map<number, number[]>()
    for (const s of (subsectorAssignResult.data ?? []) as any[]) {
      const existing = subsectorMap.get(s.its_no) ?? []
      existing.push(s.subsector_id)
      subsectorMap.set(s.its_no, existing)
    }

    users = ((muminRows ?? []) as any[]).map((m: any) => ({
      ...m,
      sector: (sectorMap.get(m.its_no) ?? []).map((id: number) => ({ sector_id: id })),
      subsector: (subsectorMap.get(m.its_no) ?? []).map((id: number) => ({ subsector_id: id })),
    }))
  }

  const sectors = (sectorsResult.data ?? []) as any[]
  const subsectors = (subsectorsResult.data ?? []) as any[]

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage system users, roles, and assignments
          </p>
        </div>
        <a
          href="/import"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted/40 transition-colors text-foreground"
        >
          <Upload className="w-4 h-4" />
          Import Users
        </a>
      </div>

      <UsersClient
        initialUsers={users}
        sectors={sectors}
        subsectors={subsectors}
        mode={hasFilter ? 'loaded' : 'idle'}
        currentSearch={search}
        currentRole={roleFilter}
        showAll={showAll}
      />
    </div>
  )
}
