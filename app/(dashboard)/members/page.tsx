import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { resolveScope } from '@/lib/auth/resolveScope'
import { getMembers } from '@/lib/members/getMembers'
import { MembersShell } from '@/components/members/MembersShell'
import { ExportButton } from '@/components/members/ExportButton'
import type { MemberFilters } from '@/lib/types/app'

interface PageProps {
  searchParams: Promise<{
    sector_id?: string
    subsector_id?: string
    musaid_its_no?: string
    gender?: string
    balig_status?: string
    status?: string
    search?: string
    paci_no?: string
    age_from?: string
    age_to?: string
    show_all?: string
  }>
}

/** Parse a non-negative integer age param; invalid values are ignored. */
function parseAgeParam(value?: string): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined
  const n = parseInt(value, 10)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export default async function MembersPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const scopedSubsectorIds = await resolveScope(session)

  const filters: MemberFilters = {
    sector_id: params.sector_id ? parseInt(params.sector_id) : undefined,
    subsector_id: params.subsector_id ? parseInt(params.subsector_id) : undefined,
    musaid_its_no: params.musaid_its_no ? parseInt(params.musaid_its_no) : undefined,
    gender: params.gender as 'M' | 'F' | undefined,
    balig_status: params.balig_status as 'Balig' | 'Ghair Balig' | undefined,
    status: params.status as MemberFilters['status'],
    search: params.search,
    paci_no: params.paci_no,
    age_from: parseAgeParam(params.age_from),
    age_to: parseAgeParam(params.age_to),
    scopedSubsectorIds,
  }

  const showAll = params.show_all === '1'
  const hasActiveFilter = showAll || Boolean(
    params.search || params.sector_id || params.subsector_id || params.musaid_its_no ||
    params.gender || params.balig_status || params.status || params.paci_no ||
    filters.age_from !== undefined || filters.age_to !== undefined
  )

  const members = await (hasActiveFilter ? getMembers(filters) : Promise.resolve([]))
  const mode: 'idle' | 'loaded' = hasActiveFilter ? 'loaded' : 'idle'

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === 'idle'
              ? 'Search or filter to find members'
              : `${members.length} member${members.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {session.role !== 'Mumin' && mode === 'loaded' && (
          <ExportButton filters={params} />
        )}
      </div>
      <MembersShell
        members={members}
        filters={filters}
        role={session.role}
        showAll={showAll}
        mode={mode}
      />
    </div>
  )
}