import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { resolveScope } from '@/lib/auth/resolveScope'
import { getMembers } from '@/lib/members/getMembers'
import { createAdminClient } from '@/lib/supabase/admin'
import { MembersShell } from '@/components/members/MembersShell'
import { ExportButton } from '@/components/members/ExportButton'
import type { MemberFilters, MemberListItem } from '@/lib/types/app'

interface AddressChangePayload {
  type: string
  reported_subsector_id?: number
  [key: string]: unknown
}

interface ChangeRequestRow {
  sabeel_no: string
  requested_changes: AddressChangePayload | unknown[] | null
  status: string
}

function isAddressChangeRow(
  r: ChangeRequestRow,
): r is ChangeRequestRow & { requested_changes: AddressChangePayload } {
  return !!r.requested_changes && !Array.isArray(r.requested_changes) && r.requested_changes.type === 'address_change'
}

interface MemberDirectoryRow {
  its_no: number
  name: string
  gender: 'M' | 'F'
  balig_status: 'Balig' | 'Ghair Balig'
  phone: string | null
  status: string
  sabeel_no: string
  subsector_id: number
  subsector_name: string
  sector_id: number
  sector_name: string
  paci_no: string | null
  floor_no: string | null
  flat_no: string | null
  building_id: number | null
  building_name: string | null
  landmark: string | null
  head_its_no: number | null
  hof_name: string | null
  masool_name: string | null
  musaid_names: string | null
}

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
    move_pending?: string
  }>
}

/**
 * `move_pending` has no DB column — it's derived from an open (pending /
 * awaiting_address) address-change `change_request`. Rather than forward an
 * authenticated request to `GET /api/requests/open-address-sabeels` from this
 * server component (no clean cookie-forwarding path for internal routes in
 * this codebase), query `change_request` directly with the same admin client
 * and the same status/shape filter that route uses, then filter the already
 * role/subsector-scoped `members` array post-fetch — scoping falls out for
 * free since `members` is already limited to the caller's scope, EXCEPT for
 * families whose reported destination subsector (`requested_changes
 * .reported_subsector_id`) is in scope but whose CURRENT subsector isn't —
 * those never make it into `members` in the first place (getMembers filters
 * on current subsector_id), so this also returns that subset separately.
 * See PLAN-analytics-unique-counts.md:785: "an open report is visible to
 * staff of both the current subsector and the reported destination, so the
 * receiving team can chase the details without a single row changing."
 */
async function fetchOpenAddressSabeelNos(
  scopedSubsectorIds: number[] | null,
): Promise<{ all: Set<string>; reportedInScope: Set<string> }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_request')
    .select('sabeel_no, requested_changes, status')
    .in('status', ['pending', 'awaiting_address'])

  if (error || !data) return { all: new Set(), reportedInScope: new Set() }

  const rows = data as ChangeRequestRow[]
  const addressRequests = rows.filter(isAddressChangeRow)

  const all = new Set(addressRequests.map((r) => r.sabeel_no))

  const reportedInScope = new Set<string>()
  if (scopedSubsectorIds !== null) {
    for (const r of addressRequests) {
      const reportedId = r.requested_changes.reported_subsector_id
      if (typeof reportedId === 'number' && scopedSubsectorIds.includes(reportedId)) {
        reportedInScope.add(r.sabeel_no)
      }
    }
  }

  return { all, reportedInScope }
}

/**
 * Fetches full MemberListItem rows for specific sabeel_nos, bypassing the
 * current-subsector scope filter entirely. Used only to pull in families
 * whose CURRENT subsector is outside the viewer's scope but whose open
 * address-change request reports a destination subsector inside it — those
 * rows are absent from `getMembers`' output (it filters on current
 * subsector_id) but must still surface for the receiving team's
 * "Move pending" filter (PLAN-analytics-unique-counts.md:785).
 */
async function fetchMembersBySabeelNos(
  sabeelNos: string[],
  status?: MemberFilters['status'],
): Promise<MemberListItem[]> {
  if (sabeelNos.length === 0) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('member_directory')
    .select(
      'its_no,name,gender,balig_status,phone,status,sabeel_no,subsector_id,subsector_name,sector_id,sector_name,paci_no,head_its_no,hof_name,floor_no,flat_no,building_id,building_name,landmark,masool_name,musaid_names',
    )
    .in('sabeel_no', sabeelNos)
    .eq('status', status ?? 'active')

  if (error || !data) return []

  return (data as MemberDirectoryRow[]).map((m) => ({
    its_no: m.its_no,
    name: m.name,
    gender: m.gender,
    balig_status: m.balig_status,
    phone: m.phone,
    status: m.status,
    sabeel_no: m.sabeel_no,
    subsector_id: m.subsector_id,
    subsector_name: m.subsector_name,
    sector_id: m.sector_id,
    sector_name: m.sector_name,
    paci_no: m.paci_no ?? null,
    floor_no: m.floor_no ?? null,
    flat_no: m.flat_no ?? null,
    building_name: m.building_name ?? null,
    building_id: m.building_id ?? null,
    landmark: m.landmark ?? null,
    head_its_no: m.head_its_no ?? null,
    hof_name: m.hof_name ?? null,
    masool_name: m.masool_name ?? null,
    musaid_names: m.musaid_names ?? null,
  })) as MemberListItem[]
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
    move_pending: params.move_pending === '1' ? true : undefined,
  }

  const showAll = params.show_all === '1'
  const hasActiveFilter = showAll || Boolean(
    params.search || params.sector_id || params.subsector_id || params.musaid_its_no ||
    params.gender || params.balig_status || params.status || params.paci_no ||
    filters.age_from !== undefined || filters.age_to !== undefined || params.move_pending
  )

  let members: MemberListItem[] = await (hasActiveFilter ? getMembers(filters) : Promise.resolve([]))
  if (hasActiveFilter && filters.move_pending) {
    const { all: openSabeelNos, reportedInScope } = await fetchOpenAddressSabeelNos(scopedSubsectorIds)

    // Families visible only via the reported destination subsector are
    // absent from `members` (getMembers scoped on current subsector_id) —
    // fetch and merge them in before filtering down to open requests.
    const presentSabeelNos = new Set(members.map((m) => m.sabeel_no))
    const missingSabeelNos = [...reportedInScope].filter((s) => !presentSabeelNos.has(s))
    if (missingSabeelNos.length > 0) {
      const extraMembers = await fetchMembersBySabeelNos(missingSabeelNos, filters.status)
      members = [...members, ...extraMembers]
    }

    members = members.filter((m) => openSabeelNos.has(m.sabeel_no))
  }
  const mode: 'idle' | 'loaded' = hasActiveFilter ? 'loaded' : 'idle'

  // Wider cap than the shared PAGE_SHELL (max-w-6xl) — this page holds an
  // 18-column table — but still stops the layout stretching on 4K displays.
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
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