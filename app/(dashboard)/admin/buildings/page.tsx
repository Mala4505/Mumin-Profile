import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDuplicateBuildingGroups } from '@/app/api/admin/buildings/duplicates/route'
import { BuildingMergeClient } from '@/components/admin/BuildingMergeClient'

export default async function AdminBuildingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SuperAdmin') redirect('/dashboard')

  const admin = createAdminClient()
  const result = await getDuplicateBuildingGroups(admin)
  const groups = 'groups' in result ? result.groups : []

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Duplicate Buildings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Merge building rows that represent the same physical building — every house moves to the
          building you keep, and the duplicate row is deleted.
        </p>
      </div>
      <BuildingMergeClient initialGroups={groups} />
    </div>
  )
}
