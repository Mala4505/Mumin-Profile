import { createAdminClient } from '@/lib/supabase/admin'
import type { SessionUser } from '@/lib/types/app'

export interface SuperAdminStats {
  totalMumineen: number
  activeMumineen: number
  totalSectors: number
  totalSubsectors: number
  totalUsers: number
  sectors: Array<{ sector_id: number; sector_name: string; mumin_count: number; subsector_count: number }>
  recentActivity: Array<{ id: number; action: string; entity_type: string; performed_by_its: number | null; created_at: string }>
}

export interface MasoolStats {
  sectorName: string
  sectorId: number
  subsectorCount: number
  muminCount: number
  subsectors: Array<{ subsector_id: number; subsector_name: string; mumin_count: number }>
}

export interface MusaidStats {
  subsectorName: string
  subsectorId: number
  sectorName: string
  muminCount: number
  maleCount: number
  femaleCount: number
  baligCount: number
  ghairBaligCount: number
}

export interface MuminStats {
  name: string
  its_no: number
  sabeel_no: string
  gender: 'M' | 'F'
  balig_status: string
  sectorName: string
  subsectorName: string
  buildingName: string
  status: string
}

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const supabase = createAdminClient()

  const [muminResult, sectorResult, subsectorResult, userResult, activityResult] = await Promise.all([
    supabase.from('mumin').select('status', { count: 'exact' }),
    supabase.from('sector').select('sector_id, sector_name', { count: 'exact' }),
    supabase.from('subsector').select('subsector_id', { count: 'exact' }),
    supabase.from('mumin').select('its_no', { count: 'exact' }).not('supabase_auth_id', 'is', null),
    supabase
      .from('activity_log')
      .select('id, action, entity_type, performed_by_its, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const totalMumineen = muminResult.count ?? 0
  const activeMumineen = (muminResult.data ?? []).filter((m: any) => m.status === 'active').length

  const sectors = (sectorResult.data ?? []) as Array<{ sector_id: number; sector_name: string }>
  const sectorStats = await Promise.all(
    sectors.map(async (s) => {
      const [mCount, ssCount] = await Promise.all([
        supabase.from('mumin').select('its_no', { count: 'exact' }).eq('sector_id' as any, s.sector_id),
        supabase.from('subsector').select('subsector_id', { count: 'exact' }).eq('sector_id', s.sector_id),
      ])
      return { ...s, mumin_count: mCount.count ?? 0, subsector_count: ssCount.count ?? 0 }
    })
  )

  return {
    totalMumineen,
    activeMumineen,
    totalSectors: sectorResult.count ?? 0,
    totalSubsectors: subsectorResult.count ?? 0,
    totalUsers: userResult.count ?? 0,
    sectors: sectorStats,
    recentActivity: (activityResult.data ?? []) as any[],
  }
}

export async function getMasoolStats(session: SessionUser): Promise<MasoolStats> {
  const supabase = createAdminClient()
  const sectorId = session.sector_ids[0]
  if (!sectorId) return { sectorName: 'Unassigned', sectorId: 0, subsectorCount: 0, muminCount: 0, subsectors: [] }

  const [sectorResult, subsectorsResult] = await Promise.all([
    supabase.from('sector').select('sector_name').eq('sector_id', sectorId).single(),
    supabase.from('subsector').select('subsector_id, subsector_name').eq('sector_id', sectorId),
  ])

  const subsectors = subsectorsResult.data ?? []
  const subsectorStats = await Promise.all(
    subsectors.map(async (ss: any) => {
      const mCount = await supabase
        .from('mumin')
        .select('its_no', { count: 'exact' })
        .eq('subsector_id', ss.subsector_id)
      return { ...ss, mumin_count: mCount.count ?? 0 }
    })
  )

  const totalMumin = subsectorStats.reduce((sum, ss) => sum + ss.mumin_count, 0)

  return {
    sectorName: (sectorResult.data as any)?.sector_name ?? 'Unknown',
    sectorId,
    subsectorCount: subsectors.length,
    muminCount: totalMumin,
    subsectors: subsectorStats,
  }
}

export async function getMusaidStats(session: SessionUser): Promise<MusaidStats> {
  const supabase = createAdminClient()
  const subsectorId = session.subsector_ids[0]
  if (!subsectorId) {
    return {
      subsectorName: 'Unassigned',
      subsectorId: 0,
      sectorName: '',
      muminCount: 0,
      maleCount: 0,
      femaleCount: 0,
      baligCount: 0,
      ghairBaligCount: 0,
    }
  }

  const [ssResult, muminResult] = await Promise.all([
    supabase
      .from('subsector')
      .select('subsector_name, sector:sector_id(sector_name)')
      .eq('subsector_id', subsectorId)
      .single(),
    supabase.from('mumin').select('gender, balig_status').eq('subsector_id', subsectorId),
  ])

  const mumineen = (muminResult.data ?? []) as Array<{ gender: string; balig_status: string }>
  const ssData = ssResult.data as any

  return {
    subsectorName: ssData?.subsector_name ?? 'Unknown',
    subsectorId,
    sectorName: ssData?.sector?.sector_name ?? '',
    muminCount: mumineen.length,
    maleCount: mumineen.filter((m) => m.gender === 'M').length,
    femaleCount: mumineen.filter((m) => m.gender === 'F').length,
    baligCount: mumineen.filter((m) => m.balig_status === 'Balig').length,
    ghairBaligCount: mumineen.filter((m) => m.balig_status === 'Ghair Balig').length,
  }
}

export async function getMuminStats(itsNo: number): Promise<MuminStats | null> {
  const supabase = createAdminClient()
  const result = await (supabase
    .from('mumin')
    .select(
      'name, its_no, sabeel_no, gender, balig_status, status, house:house_id(building:building_id(building_name), subsector:subsector_id(subsector_name, sector:sector_id(sector_name)))'
    )
    .eq('its_no', itsNo)
    .single() as any)

  if (!result.data) return null
  const m = result.data
  const house = m.house
  return {
    name: m.name,
    its_no: m.its_no,
    sabeel_no: m.sabeel_no,
    gender: m.gender,
    balig_status: m.balig_status,
    status: m.status,
    buildingName: house?.building?.building_name ?? '—',
    subsectorName: house?.subsector?.subsector_name ?? '—',
    sectorName: house?.subsector?.sector?.sector_name ?? '—',
  }
}
