import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MemberFilters } from '@/lib/types/app'

export interface MemberListItem {
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
  // House / building fields (null when no house record found for this sabeel_no)
  paci_no: string | null
  floor_no: string | null
  flat_no: string | null
  building_name: string | null
  building_id: number | null
  landmark: string | null
}

interface HouseInfo {
  paci_no: string
  floor_no: string | null
  flat_no: string | null
  building_id: number
  building_name: string
  landmark: string | null
}

export async function getMembers(filters: MemberFilters): Promise<MemberListItem[]> {
  const supabase = await createClient()

  // If filtering by paci_no, first resolve the sabeel_no(s) for that PACI via family table
  let paciSabeelNos: string[] | null = null
  if (filters.paci_no) {
    const adminClient = createAdminClient()
    const { data: familyRows } = await adminClient
      .from('family')
      .select('sabeel_no')
      .ilike('paci_no', `%${filters.paci_no}%`)
      .limit(100)
    paciSabeelNos = (familyRows ?? []).map((f: any) => f.sabeel_no as string)
    // If no matching families found, return empty
    if (paciSabeelNos.length === 0) return []
  }

  // Build the main mumin query — RLS automatically scopes results to the user's role
  let query = supabase
    .from('mumin')
    .select(`
      its_no,
      name,
      gender,
      balig_status,
      phone,
      status,
      sabeel_no,
      subsector_id,
      subsector!subsector_id!inner (
        subsector_id,
        subsector_name,
        sector!inner (
          sector_id,
          sector_name
        )
      )
    `)
    .order('name', { ascending: true })
    .limit(500)

  // Apply optional filters
  if (filters.sector_id) {
    query = query.eq('subsector.sector.sector_id', filters.sector_id)
  }
  if (filters.subsector_id) {
    query = query.eq('subsector_id', filters.subsector_id)
  }
  if (filters.gender) {
    query = query.eq('gender', filters.gender)
  }
  if (filters.balig_status) {
    query = query.eq('balig_status', filters.balig_status)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  } else {
    // Default: show only active members
    query = query.eq('status', 'active')
  }

  // Extended search: name, ITS no (if numeric), sabeel_no, phone
  if (filters.search) {
    const s = filters.search.trim()
    const isNum = /^\d+$/.test(s)
    const orFilter = isNum
      ? `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%,its_no.eq.${s}`
      : `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%`
    query = query.or(orFilter)
  }

  // Filter by PACI-resolved sabeel_nos
  if (paciSabeelNos !== null) {
    query = query.in('sabeel_no', paciSabeelNos)
  }

  const { data, error } = await query

  if (error) {
    console.error('getMembers error:', error)
    return []
  }

  const members = (data ?? []).map((m: any) => ({
    its_no: m.its_no,
    name: m.name,
    gender: m.gender,
    balig_status: m.balig_status,
    phone: m.phone,
    status: m.status,
    sabeel_no: m.sabeel_no,
    subsector_id: m.subsector.subsector_id,
    subsector_name: m.subsector.subsector_name,
    sector_id: m.subsector.sector.sector_id,
    sector_name: m.subsector.sector.sector_name,
    paci_no: null,
    floor_no: null,
    flat_no: null,
    building_name: null,
    building_id: null,
    landmark: null,
  })) as MemberListItem[]

  if (members.length === 0) return members

  // Second query: fetch address info via family → house → building
  const uniqueSabeelNos = [...new Set(members.map(m => m.sabeel_no))]
  const adminClient = createAdminClient()

  // Step A: family → paci_no for all sabeel_nos in this result set
  const { data: familyData } = await adminClient
    .from('family')
    .select('sabeel_no, paci_no')
    .in('sabeel_no', uniqueSabeelNos)

  const sabeelToPaci = new Map<string, string>()
  for (const f of (familyData ?? []) as any[]) {
    if (f.paci_no) sabeelToPaci.set(f.sabeel_no, f.paci_no)
  }

  const paciNos = [...new Set([...sabeelToPaci.values()])]

  // Step B: house → building details by paci_no
  const houseMap = new Map<string, HouseInfo>()
  if (paciNos.length > 0) {
    const { data: houseData } = await adminClient
      .from('house')
      .select('paci_no, floor_no, flat_no, building:building_id(building_id, building_name, landmark)')
      .in('paci_no', paciNos)

    for (const h of (houseData ?? []) as any[]) {
      houseMap.set(h.paci_no, {
        paci_no: h.paci_no,
        floor_no: h.floor_no,
        flat_no: h.flat_no,
        building_id: h.building?.building_id ?? null,
        building_name: h.building?.building_name ?? null,
        landmark: h.building?.landmark ?? null,
      })
    }
  }

  // Step C: merge into each member
  for (const m of members) {
    const paciNo = sabeelToPaci.get(m.sabeel_no)
    const house = paciNo ? houseMap.get(paciNo) : undefined
    if (house) {
      m.paci_no = house.paci_no
      m.floor_no = house.floor_no
      m.flat_no = house.flat_no
      m.building_id = house.building_id
      m.building_name = house.building_name
      m.landmark = house.landmark
    }
  }

  return members
}

export async function getSectors() {
  const supabase = await createClient()
  const { data } = await supabase.from('sector').select('sector_id, sector_name').order('sector_name')
  return data ?? []
}

export async function getSubsectors(sectorId?: number) {
  const supabase = await createClient()
  let query = supabase.from('subsector').select('subsector_id, sector_id, subsector_name').order('subsector_name')
  if (sectorId) query = query.eq('sector_id', sectorId)
  const { data } = await query
  return data ?? []
}
