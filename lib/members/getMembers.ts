import { createClient } from '@/lib/supabase/server'
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
}

export async function getMembers(filters: MemberFilters): Promise<MemberListItem[]> {
  const supabase = await createClient()

  // Build the query — RLS automatically scopes results to the user's role
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
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('getMembers error:', error)
    return []
  }

  return (data ?? []).map((m: any) => ({
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
  }))
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
