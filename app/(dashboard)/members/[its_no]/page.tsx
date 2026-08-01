import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { getMemberProfile } from '@/lib/members/getMemberProfile'
import { getFilteredResponses } from '@/lib/members/getFilteredResponses'
import { MemberProfileView } from '@/components/members/MemberProfileView'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAGE_SHELL } from '@/lib/members/display'
import type { LoginMode } from '@/lib/types/app'

interface PageProps {
  params: Promise<{ its_no: string }>
}

export default async function MemberProfilePage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { its_no } = await params
  const itsNo = parseInt(its_no)
  if (isNaN(itsNo)) notFound()

  const headersList = await headers()
  const loginMode = (headersList.get('x-login-mode') ?? 'admin') as LoginMode

  // Mumin can only view their own profile; user view mode applies the same restriction
  if (session.role === 'Mumin' && session.its_no !== itsNo) redirect('/members')
  if (loginMode === 'user' && session.its_no !== itsNo) redirect('/dashboard')

  const profile = await getMemberProfile(itsNo)
  if (!profile) notFound()

  const historicalResponses = await getFilteredResponses(itsNo, session)

  const admin = createAdminClient()
  const { data: categoryRows } = await admin
    .from('profile_category')
    .select('name')
    .order('sort_order')
  const allCategories = (categoryRows ?? []).map((c) => c.name)

  return (
    <div className={PAGE_SHELL}>
      {/* Breadcrumb */}
      <nav className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground mb-6">
        <a
          href="/members"
          className="shrink-0 hover:text-foreground transition-colors"
        >
          Members
        </a>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="min-w-0 truncate text-foreground font-medium">{profile.name}</span>
      </nav>

      <MemberProfileView profile={profile} session={session} initialResponses={historicalResponses} loginMode={loginMode} allCategories={allCategories} />
    </div>
  )
}
