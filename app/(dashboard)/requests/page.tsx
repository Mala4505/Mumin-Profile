import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { RequestsClient } from '@/components/requests/RequestsClient'

interface PageProps {
  searchParams: Promise<{
    search?: string
    show_all?: string
  }>
}

export default async function RequestsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) redirect('/dashboard')

  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const showAll = params.show_all === '1'
  const hasFilter = showAll || search !== ''

  const admin = createAdminClient()

  // Fetch existing requests by this user (always shown)
  const { data: existingRequests } = await admin
    .from('change_request')
    .select('id, sabeel_no, remark, status, created_at')
    .eq('requested_by', session.its_no)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!hasFilter) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Select a family and submit a change request
          </p>
        </div>
        <RequestsClient
          families={[]}
          initialRequests={(existingRequests ?? []) as any[]}
          mode="idle"
          currentSearch=""
          showAll={false}
        />
      </div>
    )
  }

  // Resolve subsector scope
  let subsectorIds: number[] = []

  if (session.role === 'SuperAdmin') {
    const { data } = await admin.from('subsector').select('subsector_id')
    subsectorIds = (data ?? []).map((r: any) => r.subsector_id)
  } else if (session.role === 'Musaid') {
    subsectorIds = session.subsector_ids
  } else {
    // Admin / Masool — subsectors from their sectors
    const { data } = await admin
      .from('subsector')
      .select('subsector_id')
      .in('sector_id', session.sector_ids)
    subsectorIds = (data ?? []).map((r: any) => r.subsector_id)
  }

  // Step 1: get mumin in scope, filtered by search if present
  let muminQuery = admin
    .from('mumin')
    .select('sabeel_no, subsector_id, its_no, name')
    .not('sabeel_no', 'is', null)
    .limit(10000)

  if (subsectorIds.length > 0) {
    muminQuery = muminQuery.in('subsector_id', subsectorIds)
  } else {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm">Select a family and submit a change request</p>
        </div>
        <RequestsClient
          families={[]}
          initialRequests={(existingRequests ?? []) as any[]}
          mode="loaded"
          currentSearch={search}
          showAll={showAll}
        />
      </div>
    )
  }

  if (search) {
    const isNumeric = /^\d+$/.test(search)
    if (isNumeric) {
      muminQuery = muminQuery.or(`name.ilike.%${search}%,its_no.eq.${search},sabeel_no.ilike.%${search}%`)
    } else {
      muminQuery = muminQuery.ilike('name', `%${search}%`)
    }
  }

  const { data: scopedMumin } = await muminQuery

  // Deduplicate: one entry per sabeel_no, keep subsector_id for display
  const sabeelToSubsector = new Map<string, number>()
  for (const m of (scopedMumin ?? []) as any[]) {
    if (m.sabeel_no && !sabeelToSubsector.has(m.sabeel_no)) {
      sabeelToSubsector.set(m.sabeel_no, m.subsector_id)
    }
  }
  const sabeelNos = Array.from(sabeelToSubsector.keys())

  // Step 2: fetch subsector names
  const { data: subsectorRows } = await admin
    .from('subsector')
    .select('subsector_id, subsector_name')

  const subsectorNameMap = new Map<number, string>()
  for (const s of (subsectorRows ?? []) as any[]) {
    subsectorNameMap.set(s.subsector_id, s.subsector_name)
  }

  // Step 3: fetch family rows — paci_no + head_its_no (the authoritative HoF)
  const { data: familyRows } = sabeelNos.length > 0
    ? await admin
        .from('family')
        .select('sabeel_no, paci_no, head_its_no')
        .in('sabeel_no', sabeelNos)
        .limit(10000)
    : { data: [] }

  const sabeelToPaci = new Map<string, string>()
  const sabeelToHeadIts = new Map<string, number>()
  for (const f of (familyRows ?? []) as any[]) {
    if (f.paci_no) sabeelToPaci.set(f.sabeel_no, f.paci_no)
    if (f.head_its_no) sabeelToHeadIts.set(f.sabeel_no, f.head_its_no)
  }

  // Step 4: fetch HoF mumin records for all head_its_no values from family table
  const headItsNos = [...new Set(Array.from(sabeelToHeadIts.values()))]
  const hofMuminMap = new Map<number, { its_no: number; name: string; phone: string | null }>()

  if (headItsNos.length > 0) {
    const { data: hofRows } = await admin
      .from('mumin')
      .select('its_no, name, phone')
      .in('its_no', headItsNos)
      .limit(10000)
    for (const m of (hofRows ?? []) as any[]) {
      hofMuminMap.set(m.its_no, m)
    }
  }

  // Step 5: fetch one fallback mumin per sabeel (for sabeels with no head_its_no in family table)
  const sabeelsWithNoHof = sabeelNos.filter(s => !sabeelToHeadIts.has(s))
  const fallbackMuminMap = new Map<string, { its_no: number; name: string; phone: string | null }>()

  if (sabeelsWithNoHof.length > 0) {
    const { data: fallbackRows } = await admin
      .from('mumin')
      .select('sabeel_no, its_no, name, phone')
      .in('sabeel_no', sabeelsWithNoHof)
      .order('name')
      .limit(10000)
    for (const m of (fallbackRows ?? []) as any[]) {
      if (!fallbackMuminMap.has(m.sabeel_no)) {
        fallbackMuminMap.set(m.sabeel_no, { its_no: m.its_no, name: m.name, phone: m.phone ?? null })
      }
    }
  }

  // Step 6: enrich building names via paci_no → house → building
  const paciNos = [...new Set(Array.from(sabeelToPaci.values()).filter(Boolean))]
  const paciToBuilding = new Map<string, string>()

  if (paciNos.length > 0) {
    const { data: houseRows } = await admin
      .from('house')
      .select('paci_no, building:building_id(building_name)')
      .in('paci_no', paciNos)
      .limit(10000)
    for (const h of (houseRows ?? []) as any[]) {
      if (h.paci_no) paciToBuilding.set(h.paci_no, h.building?.building_name ?? '—')
    }
  }

  // Step 7: assemble the final families list
  const families = sabeelNos.map(sabeelNo => {
    const headIts = sabeelToHeadIts.get(sabeelNo)
    const hof = headIts ? hofMuminMap.get(headIts) : fallbackMuminMap.get(sabeelNo)
    const subsectorId = sabeelToSubsector.get(sabeelNo)
    const paciNo = sabeelToPaci.get(sabeelNo)

    return {
      sabeel_no: sabeelNo,
      hof_name: hof?.name ?? '—',
      hof_its: hof?.its_no ?? null,
      hof_phone: hof?.phone ?? null,
      building_name: paciNo ? (paciToBuilding.get(paciNo) ?? '—') : '—',
      subsector_name: subsectorId ? (subsectorNameMap.get(subsectorId) ?? '') : '',
    }
  }).sort((a, b) => a.sabeel_no.localeCompare(b.sabeel_no))

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a family and submit a change request
        </p>
      </div>
      <RequestsClient
        families={families}
        initialRequests={(existingRequests ?? []) as any[]}
        mode="loaded"
        currentSearch={search}
        showAll={showAll}
      />
    </div>
  )
}
