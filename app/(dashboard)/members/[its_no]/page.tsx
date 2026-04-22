import { redirect, notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { getMemberProfile } from '@/lib/members/getMemberProfile'
import { getFilteredResponses } from '@/lib/members/getFilteredResponses'
import { MemberProfileView } from '@/components/members/MemberProfileView'

interface PageProps {
  params: Promise<{ its_no: string }>
}

export default async function MemberProfilePage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { its_no } = await params
  const itsNo = parseInt(its_no)
  if (isNaN(itsNo)) notFound()

  // Mumin can only view their own profile
  if (session.role === 'Mumin' && session.its_no !== itsNo) redirect('/members')

  const profile = await getMemberProfile(itsNo)
  if (!profile) notFound()

  const historicalResponses = await getFilteredResponses(itsNo, session)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <a
          href="/members"
          className="hover:text-foreground transition-colors"
        >
          Members
        </a>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{profile.name}</span>
      </nav>

      <MemberProfileView profile={profile} session={session} initialResponses={historicalResponses} />
    </div>
  )
}
