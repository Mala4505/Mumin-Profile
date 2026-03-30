import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from '@/components/admin/UsersClient'

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SuperAdmin') redirect('/dashboard')

  const admin = createAdminClient()

  const [usersResult, sectorsResult, subsectorsResult] = await Promise.all([
    admin
      .from('mumin')
      .select(`
        its_no,
        name,
        role,
        is_active,
        last_login_at,
        sector:user_sector(sector_id),
        subsector:user_subsector(subsector_id)
      `)
      .not('supabase_auth_id', 'is', null)
      .order('role', { ascending: true })
      .order('its_no', { ascending: true })
      .limit(100),
    admin.from('sector').select('sector_id, sector_name').order('sector_name'),
    admin.from('subsector').select('subsector_id, sector_id, subsector_name').order('subsector_name'),
  ])

  const users = (usersResult.data ?? []) as any[]
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

      <UsersClient initialUsers={users} sectors={sectors} subsectors={subsectors} />
    </div>
  )
}
