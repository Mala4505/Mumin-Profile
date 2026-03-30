import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { getMembers, getSectors } from '@/lib/members/getMembers'
import { MemberTable } from '@/components/members/MemberTable'
import { MemberFiltersBar } from '@/components/members/MemberFiltersBar'
import type { MemberFilters } from '@/lib/types/app'

interface PageProps {
  searchParams: Promise<{
    sector_id?: string
    subsector_id?: string
    gender?: string
    balig_status?: string
    status?: string
    search?: string
  }>
}

export default async function MembersPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams

  const filters: MemberFilters = {
    sector_id: params.sector_id ? parseInt(params.sector_id) : undefined,
    subsector_id: params.subsector_id ? parseInt(params.subsector_id) : undefined,
    gender: params.gender as 'M' | 'F' | undefined,
    balig_status: params.balig_status as 'Balig' | 'Ghair Balig' | undefined,
    status: params.status as MemberFilters['status'],
    search: params.search,
  }

  const [members, sectors] = await Promise.all([
    getMembers(filters),
    getSectors(),
  ])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {session.role !== 'Mumin' && (
          <a
            href={`/reports?${new URLSearchParams(params as Record<string, string>).toString()}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </a>
        )}
      </div>

      <MemberFiltersBar sectors={sectors} currentFilters={filters} role={session.role} />
      <MemberTable members={members} role={session.role} />
    </div>
  )
}
