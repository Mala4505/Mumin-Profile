import { unstable_cache } from 'next/cache'
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types/app";

export interface LeaderContact {
  its_no: number;
  name: string;
  phone: string | null;
}

export interface SuperAdminStats {
  totalMumineen: number;
  activeMumineen: number;
  totalSectors: number;
  totalSubsectors: number;
  totalUsers: number;
  totalBuildings: number;
  totalFlats: number;
  totalFamilies: number;
  sectors: Array<{
    sector_id: number;
    sector_name: string;
    mumin_count: number;
    subsector_count: number;
    building_count: number;
    flat_count: number;
    masools: LeaderContact[];
    subsectors: Array<{
      subsector_id: number;
      subsector_name: string;
      mumin_count: number;
      musaids: LeaderContact[];
    }>;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    entity_type: string;
    performed_by_its: number | null;
    created_at: string;
  }>;
}

export interface AdminStats {
  assignedSectors: Array<{ sector_id: number; sector_name: string }>;
  totalSubsectors: number;
  totalBuildings: number;
  totalFlats: number;
  totalFamilies: number;
  totalMumineen: number;
  sectorBreakdown: Array<{
    sector_id: number;
    sector_name: string;
    subsector_count: number;
    mumin_count: number;
    building_count: number;
    flat_count: number;
    family_count: number;
    masools: LeaderContact[];
    subsectors: Array<{
      subsector_id: number;
      subsector_name: string;
      mumin_count: number;
      musaids: LeaderContact[];
    }>;
  }>;
}

export interface MasoolStats {
  sectorNames: string[];
  sectorIds: number[];
  subsectorCount: number;
  muminCount: number;
  totalBuildings: number;
  totalFlats: number;
  totalFamilies: number;
  subsectors: Array<{
    subsector_id: number;
    subsector_name: string;
    mumin_count: number;
    sector_name: string;
    musaids: LeaderContact[];
  }>;
  buildings: Array<{
    building_id: number;
    building_name: string;
    subsector_name: string;
    flat_count: number;
  }>;
  sector_masools: LeaderContact[];
}

export interface MusaidStats {
  subsectorName: string;
  subsectorId: number;
  sectorName: string;
  muminCount: number;
  maleCount: number;
  femaleCount: number;
  baligCount: number;
  ghairBaligCount: number;
  totalBuildings: number;
  totalFlats: number;
  totalFamilies: number;
  buildings: Array<{
    building_id: number;
    building_name: string;
    flat_count: number;
  }>;
  sector_masools: LeaderContact[];
  subsector_musaids: LeaderContact[];
}

export interface MuminStats {
  name: string;
  its_no: number;
  sabeel_no: string;
  gender: "M" | "F";
  balig_status: string;
  sectorName: string;
  subsectorName: string;
  buildingName: string;
  status: string;
  paciNo: string | null;
  floorNo: string | null;
  flatNo: string | null;
  landmarkName: string | null;
  totalFamilyMembers: number;
}

// ─── SuperAdmin ─────────────────────────────────────────────────────────────

const _fetchSuperAdminStats = unstable_cache(
  async (): Promise<SuperAdminStats> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_superadmin_dashboard_stats')
    if (error) throw error
    return data as SuperAdminStats
  },
  ['dashboard-superadmin'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  return _fetchSuperAdminStats()
}

// ─── Admin (multi-sector) ────────────────────────────────────────────────────

const _fetchAdminStats = unstable_cache(
  async (sectorIds: number[]): Promise<AdminStats> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
      p_sector_ids: sectorIds,
    })
    if (error) throw error
    return data as AdminStats
  },
  ['dashboard-admin'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getAdminStats(session: SessionUser): Promise<AdminStats> {
  const sectorIds = session.sector_ids
  if (sectorIds.length === 0) {
    return {
      assignedSectors: [],
      totalSubsectors: 0,
      totalBuildings: 0,
      totalFlats: 0,
      totalFamilies: 0,
      totalMumineen: 0,
      sectorBreakdown: [],
    }
  }
  return _fetchAdminStats([...sectorIds].sort((a, b) => a - b))
}

// ─── Masool (multi-sector) ───────────────────────────────────────────────────

const _fetchMasoolStats = unstable_cache(
  async (sectorIds: number[]): Promise<MasoolStats> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_masool_dashboard_stats', {
      p_sector_ids: sectorIds,
    })
    if (error) throw error
    return data as MasoolStats
  },
  ['dashboard-masool'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getMasoolStats(
  session: SessionUser,
): Promise<MasoolStats> {
  const sectorIds = session.sector_ids
  if (sectorIds.length === 0) {
    return {
      sectorNames: ['Unassigned'],
      sectorIds: [],
      subsectorCount: 0,
      muminCount: 0,
      totalBuildings: 0,
      totalFlats: 0,
      totalFamilies: 0,
      subsectors: [],
      buildings: [],
      sector_masools: [],
    }
  }
  return _fetchMasoolStats([...sectorIds].sort((a, b) => a - b))
}

// ─── Musaid (multi-subsector) ────────────────────────────────────────────────

const _fetchMusaidStats = unstable_cache(
  async (subsectorIds: number[]): Promise<MusaidStats> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_musaid_dashboard_stats', {
      p_subsector_ids: subsectorIds,
    })
    if (error) throw error
    return data as MusaidStats
  },
  ['dashboard-musaid'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getMusaidStats(
  session: SessionUser,
): Promise<MusaidStats> {
  const subsectorIds = session.subsector_ids
  if (subsectorIds.length === 0) {
    return {
      subsectorName: 'Unassigned',
      subsectorId: 0,
      sectorName: '',
      muminCount: 0,
      maleCount: 0,
      femaleCount: 0,
      baligCount: 0,
      ghairBaligCount: 0,
      totalBuildings: 0,
      totalFlats: 0,
      totalFamilies: 0,
      buildings: [],
      sector_masools: [],
      subsector_musaids: [],
    }
  }
  return _fetchMusaidStats([...subsectorIds].sort((a, b) => a - b))
}

// ─── Mumin ───────────────────────────────────────────────────────────────────

const _fetchMuminStats = unstable_cache(
  async (itsNo: number): Promise<MuminStats | null> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_mumin_dashboard_stats', {
      p_its_no: itsNo,
    })
    if (error) throw error
    return data as MuminStats | null
  },
  ['dashboard-mumin'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getMuminStats(itsNo: number): Promise<MuminStats | null> {
  return _fetchMuminStats(itsNo)
}
