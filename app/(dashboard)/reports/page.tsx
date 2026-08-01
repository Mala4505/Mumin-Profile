import { redirect } from 'next/navigation'
import { Table2 } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { ReportsClient } from '@/components/reports/ReportsClient'

const STAFF_ROLES = ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator']

export default async function ReportsPage() {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role)) redirect('/dashboard')

  const admin = createAdminClient()
  const umoorScope = resolveUmoorScope(session)

  let categoriesQuery = admin
    .from('profile_category')
    .select('id, name')
    .order('sort_order', { ascending: true })
  if (umoorScope) categoriesQuery = categoriesQuery.in('id', umoorScope)

  const [sectorsResult, categoriesResult] = await Promise.all([
    admin.from('sector').select('sector_id, sector_name').order('sector_name', { ascending: true }),
    categoriesQuery,
  ])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Table2 className="w-6 h-6 text-primary" />
          Response Explorer
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse individual form responses, filter by umoor and demographics, and export
        </p>
      </div>
      <ReportsClient
        sectors={sectorsResult.data ?? []}
        categories={categoriesResult.data ?? []}
        role={session.role}
      />
    </div>
  )
}
