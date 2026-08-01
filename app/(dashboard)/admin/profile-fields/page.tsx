import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileFieldsClient } from '@/components/admin/ProfileFieldsClient'

const ALLOWED_ROLES = ['SuperAdmin', 'Admin', 'UmoorCoordinator']

export default async function AdminProfileFieldsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!ALLOWED_ROLES.includes(session.role)) redirect('/dashboard')

  // null = unrestricted; number[] = coordinator's allowed profile_category ids
  const scopedCategoryIds = resolveUmoorScope(session)

  const admin = createAdminClient()
  let query = admin
    .from('profile_category')
    .select('id, name, sort_order')
    .order('sort_order')
    .order('name')
  if (scopedCategoryIds) query = query.in('id', scopedCategoryIds)

  const { data } = await query
  const categories = (data ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile Fields</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {session.role === 'UmoorCoordinator'
            ? 'Manage the profile fields of your assigned umoor.'
            : 'Manage the profile fields collected under each umoor.'}
        </p>
      </div>

      <ProfileFieldsClient categories={categories} />
    </div>
  )
}
