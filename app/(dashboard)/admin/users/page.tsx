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

  const [
    sectorsResult,
    subsectorsResult,
    sectorAssignResult,
    subsectorAssignResult,
    categoriesResult,
    umoorAssignResult,
  ] = await Promise.all([
    admin.from('sector').select('sector_id, sector_name').order('sector_name'),
    admin.from('subsector').select('subsector_id, sector_id, subsector_name').order('subsector_name'),
    admin.from('user_sector').select('its_no, sector_id'),
    admin.from('user_subsector').select('its_no, subsector_id'),
    admin.from('profile_category').select('id, name').order('sort_order'),
    admin.from('user_umoor').select('its_no, category_id'),
  ])

  let users: any[] = []

  if (hasFilter) {
    // Auth fields (role, is_active, last_login_at, supabase_auth_id,
    // has_custom_password) moved off `mumin` onto `auth_accounts` in
    // migration 018. There's no direct FK path that makes a single embedded
    // PostgREST join clean here, so query both and merge by its_no in JS —
    // same map-building pattern as sectorMap/subsectorMap/umoorMap.
    //
    // roleFilter now targets auth_accounts.role, so resolve it against
    // auth_accounts first and constrain the mumin query by its_no — otherwise
    // the 2000-row limit below could cut off matches before the role filter
    // ever gets applied.
    let authQuery = admin
      .from('auth_accounts')
      .select('its_no, role, is_active, last_login_at, supabase_auth_id, has_custom_password')

    if (roleFilter) {
      authQuery = authQuery.eq('role', roleFilter as 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin' | 'UmoorCoordinator')
    }

    const { data: authRows } = await authQuery

    const authMap = new Map<number, any>()
    for (const a of (authRows ?? []) as any[]) {
      authMap.set(a.its_no, a)
    }

    let muminRows: any[] = []

    if (!roleFilter || authMap.size > 0) {
      let query = admin
        .from('mumin')
        .select('its_no, name')
        .order('name', { ascending: true })
        .limit(2000)

      if (roleFilter) {
        query = query.in('its_no', Array.from(authMap.keys()))
      }

      if (search) {
        const isNumeric = /^\d+$/.test(search)
        if (isNumeric) {
          query = query.or(`name.ilike.%${search}%,its_no.eq.${search}`)
        } else {
          query = query.ilike('name', `%${search}%`)
        }
      }

      const { data } = await query
      muminRows = data ?? []
    }

    // Build sector/subsector/umoor assignment maps
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
    const umoorMap = new Map<number, number[]>()
    for (const u of (umoorAssignResult.data ?? []) as any[]) {
      const existing = umoorMap.get(u.its_no) ?? []
      existing.push(u.category_id)
      umoorMap.set(u.its_no, existing)
    }

    users = (muminRows as any[]).map((m: any) => {
      const auth = authMap.get(m.its_no)
      return {
        ...m,
        role: auth?.role ?? 'Mumin',
        is_active: auth?.is_active ?? true,
        last_login_at: auth?.last_login_at ?? null,
        supabase_auth_id: auth?.supabase_auth_id ?? null,
        has_custom_password: auth?.has_custom_password ?? false,
        sector: (sectorMap.get(m.its_no) ?? []).map((id: number) => ({ sector_id: id })),
        subsector: (subsectorMap.get(m.its_no) ?? []).map((id: number) => ({ subsector_id: id })),
        umoor: (umoorMap.get(m.its_no) ?? []).map((id: number) => ({ category_id: id })),
      }
    })
  }

  const sectors = (sectorsResult.data ?? []) as any[]
  const subsectors = (subsectorsResult.data ?? []) as any[]
  const categories = (categoriesResult.data ?? []) as any[]

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
        categories={categories}
        mode={hasFilter ? 'loaded' : 'idle'}
        currentSearch={search}
        currentRole={roleFilter}
        showAll={showAll}
      />
    </div>
  )
}
