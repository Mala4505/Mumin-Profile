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
    return data as unknown as SuperAdminStats
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
    return data as unknown as AdminStats
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
    return data as unknown as MasoolStats
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
    return data as unknown as MusaidStats
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

// ─── Umoor Coordinator (multi-umoor) ─────────────────────────────────────────

export interface UmoorCoordinatorStats {
  totalMumineen: number;
  umoors: Array<{
    category_id: number;
    name: string;
    field_count: number;
    filled_value_count: number;
    form_count: number;
    published_form_count: number;
  }>;
}

const _fetchUmoorCoordinatorStats = unstable_cache(
  async (categoryIds: number[]): Promise<UmoorCoordinatorStats> => {
    const supabase = createAdminClient()

    const [muminCountRes, categoriesRes, fieldsRes, formsRes] = await Promise.all([
      supabase
        .from('mumin')
        .select('its_no', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('profile_category')
        .select('id, name, sort_order')
        .in('id', categoryIds)
        .order('sort_order'),
      supabase
        .from('profile_field')
        .select('id, category_id')
        .in('category_id', categoryIds)
        .eq('is_active', true),
      supabase
        .from('forms')
        .select('id, umoor_category_id, status')
        .in('umoor_category_id', categoryIds),
    ])

    const fields = (fieldsRes.data ?? []) as Array<{ id: number; category_id: number }>
    const forms = (formsRes.data ?? []) as Array<{ id: string; umoor_category_id: number | null; status: string | null }>
    const categories = (categoriesRes.data ?? []) as Array<{ id: number; name: string }>

    const fieldIdsByCategory = new Map<number, number[]>()
    for (const f of fields) {
      const list = fieldIdsByCategory.get(f.category_id) ?? []
      list.push(f.id)
      fieldIdsByCategory.set(f.category_id, list)
    }

    // Filled profile-value counts per umoor (parallel head-count queries)
    const filledCounts = await Promise.all(
      categories.map(async (cat) => {
        const fieldIds = fieldIdsByCategory.get(cat.id) ?? []
        if (fieldIds.length === 0) return 0
        const { count } = await supabase
          .from('profile_value')
          .select('id', { count: 'exact', head: true })
          .in('field_id', fieldIds)
        return count ?? 0
      })
    )

    return {
      totalMumineen: muminCountRes.count ?? 0,
      umoors: categories.map((cat, i) => {
        const catForms = forms.filter((f) => f.umoor_category_id === cat.id)
        return {
          category_id: cat.id,
          name: cat.name,
          field_count: (fieldIdsByCategory.get(cat.id) ?? []).length,
          filled_value_count: filledCounts[i],
          form_count: catForms.length,
          published_form_count: catForms.filter((f) => f.status === 'published').length,
        }
      }),
    }
  },
  ['dashboard-umoor-coordinator'],
  { revalidate: 60, tags: ['dashboard'] }
)

export async function getUmoorCoordinatorStats(
  session: SessionUser,
): Promise<UmoorCoordinatorStats> {
  const categoryIds = session.umoor_ids ?? []
  if (categoryIds.length === 0) {
    return { totalMumineen: 0, umoors: [] }
  }
  return _fetchUmoorCoordinatorStats([...categoryIds].sort((a, b) => a - b))
}
