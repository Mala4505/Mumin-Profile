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
    musaids: LeaderContact[]; // 👈 added
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

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const supabase = createAdminClient();

  const [
    muminResult,
    sectorResult,
    subsectorResult,
    userResult,
    activityResult,
    buildingResult,
    houseResult,
    masoolSectorRows,
    musaidSubsectorRows,
    masoolUsersResult,
    musaidUsersResult,
  ] = await Promise.all([
    supabase.from("mumin").select("status", { count: "exact" }),
    supabase
      .from("sector")
      .select("sector_id, sector_name", { count: "exact" })
      .order("sector_id", { ascending: true }),
    supabase.from("subsector").select("subsector_id", { count: "exact" }),
    supabase
      .from("mumin")
      .select("its_no", { count: "exact" })
      .not("supabase_auth_id", "is", null),
    supabase
      .from("activity_log")
      .select("id, action, entity_type, performed_by_its, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("building").select("building_id, subsector_id"),
    supabase.from("house").select("paci_no, building_id"),
    supabase.from("user_sector").select("its_no, sector_id"),
    supabase.from("user_subsector").select("its_no, subsector_id"),
    supabase
      .from("mumin")
      .select("its_no, name, phone")
      .in("role", ["Masool", "Admin"]),
    supabase.from("mumin").select("its_no, name, phone").eq("role", "Musaid"),
  ]);

  // Build leader lookup maps
  const masoolUserMap = new Map<number, LeaderContact>(
    ((masoolUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );
  const musaidUserMap = new Map<number, LeaderContact>(
    ((musaidUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );

  const masoolsBySector = new Map<number, LeaderContact[]>();
  for (const row of (masoolSectorRows.data ?? []) as Array<{
    its_no: number;
    sector_id: number;
  }>) {
    const contact = masoolUserMap.get(row.its_no);
    if (!contact) continue;
    if (!masoolsBySector.has(row.sector_id))
      masoolsBySector.set(row.sector_id, []);
    masoolsBySector.get(row.sector_id)!.push(contact);
  }

  const musaidsBySubsector = new Map<number, LeaderContact[]>();
  for (const row of (musaidSubsectorRows.data ?? []) as Array<{
    its_no: number;
    subsector_id: number;
  }>) {
    const contact = musaidUserMap.get(row.its_no);
    if (!contact) continue;
    if (!musaidsBySubsector.has(row.subsector_id))
      musaidsBySubsector.set(row.subsector_id, []);
    musaidsBySubsector.get(row.subsector_id)!.push(contact);
  }

  const totalMumineen = muminResult.count ?? 0;
  const activeMumineen = (muminResult.data ?? []).filter(
    (m: any) => m.status === "active",
  ).length;

  const allBuildings = (buildingResult.data ?? []) as Array<{
    building_id: number;
    subsector_id: number;
  }>;
  const allHouses = (houseResult.data ?? []) as Array<{
    paci_no: string;
    building_id: number;
  }>;

  const flatCountByBuilding = new Map<number, number>();
  for (const h of allHouses) {
    flatCountByBuilding.set(
      h.building_id,
      (flatCountByBuilding.get(h.building_id) ?? 0) + 1,
    );
  }

  const { data: familyCountData } = await supabase
    .from("family")
    .select("sabeel_no")
    .not("paci_no", "is", null);
  const totalFamilies = familyCountData?.length ?? 0;

  const sectors = (sectorResult.data ?? []) as Array<{
    sector_id: number;
    sector_name: string;
  }>;
  const sectorStats = (
    await Promise.all(
      sectors.map(async (s) => {
        // Fetch subsectors first — needed to compute mumin count via subsector_id
        const ssSectorsResult = await supabase
          .from("subsector")
          .select("subsector_id, subsector_name")
          .eq("sector_id", s.sector_id);

        const subsectorsInSector = (ssSectorsResult.data ?? []) as Array<{
          subsector_id: number;
          subsector_name: string;
        }>;
        const sectorSubsectorIds = subsectorsInSector.map(
          (ss) => ss.subsector_id,
        );
        const sectorBuildings = allBuildings.filter((b) =>
          sectorSubsectorIds.includes(b.subsector_id),
        );
        const sectorFlatCount = sectorBuildings.reduce(
          (sum, b) => sum + (flatCountByBuilding.get(b.building_id) ?? 0),
          0,
        );

        // Query mumin via subsector_id (mumin has no direct sector_id column)
        const [mCountResult, ...subsectorDetails] = await Promise.all([
          sectorSubsectorIds.length > 0
            ? supabase
                .from("mumin")
                .select("its_no", { count: "exact" })
                .in("subsector_id", sectorSubsectorIds)
            : Promise.resolve({ count: 0 }),
          ...subsectorsInSector.map(async (ss) => {
            const { count } = await supabase
              .from("mumin")
              .select("its_no", { count: "exact" })
              .eq("subsector_id", ss.subsector_id);
            return {
              subsector_id: ss.subsector_id,
              subsector_name: ss.subsector_name,
              mumin_count: count ?? 0,
              musaids: musaidsBySubsector.get(ss.subsector_id) ?? [],
            };
          }),
        ]);

        return {
          ...s,
          mumin_count: (mCountResult as any).count ?? 0,
          subsector_count: subsectorsInSector.length,
          building_count: sectorBuildings.length,
          flat_count: sectorFlatCount,
          masools: masoolsBySector.get(s.sector_id) ?? [],
          subsectors: subsectorDetails as Array<{
            subsector_id: number;
            subsector_name: string;
            mumin_count: number;
            musaids: LeaderContact[];
          }>,
        };
      }),
    )
  ).sort((a, b) => a.sector_id - b.sector_id);

  return {
    totalMumineen,
    activeMumineen,
    totalSectors: sectorResult.count ?? 0,
    totalSubsectors: subsectorResult.count ?? 0,
    totalUsers: userResult.count ?? 0,
    totalBuildings: allBuildings.length,
    totalFlats: allHouses.length,
    totalFamilies,
    sectors: sectorStats,
    recentActivity: (activityResult.data ?? []) as any[],
  };
}

// ─── Admin (multi-sector) ────────────────────────────────────────────────────

export async function getAdminStats(session: SessionUser): Promise<AdminStats> {
  const supabase = createAdminClient();
  const sectorIds = session.sector_ids;
  if (sectorIds.length === 0) {
    return {
      assignedSectors: [],
      totalSubsectors: 0,
      totalBuildings: 0,
      totalFlats: 0,
      totalFamilies: 0,
      totalMumineen: 0,
      sectorBreakdown: [],
    };
  }

  const [
    sectorsResult,
    subsectorsResult,
    masoolSectorRows,
    musaidSubsectorRows,
    masoolUsersResult,
    musaidUsersResult,
  ] = await Promise.all([
    supabase
      .from("sector")
      .select("sector_id, sector_name")
      .in("sector_id", sectorIds)
      .order("sector_id", { ascending: true }),
    supabase
      .from("subsector")
      .select("subsector_id, sector_id, subsector_name")
      .in("sector_id", sectorIds),
    supabase
      .from("user_sector")
      .select("its_no, sector_id")
      .in("sector_id", sectorIds),
    supabase.from("user_subsector").select("its_no, subsector_id"),
    supabase
      .from("mumin")
      .select("its_no, name, phone")
      .in("role", ["Masool", "Admin"]),
    supabase.from("mumin").select("its_no, name, phone").eq("role", "Musaid"),
  ]);

  const sectors = (sectorsResult.data ?? []) as Array<{
    sector_id: number;
    sector_name: string;
  }>;
  const subsectors = (subsectorsResult.data ?? []) as Array<{
    subsector_id: number;
    sector_id: number;
    subsector_name: string;
  }>;
  const subsectorIds = subsectors.map((ss) => ss.subsector_id);

  const masoolUserMap = new Map<number, LeaderContact>(
    ((masoolUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );
  const musaidUserMap = new Map<number, LeaderContact>(
    ((musaidUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );

  const masoolsBySector = new Map<number, LeaderContact[]>();
  for (const row of (masoolSectorRows.data ?? []) as Array<{
    its_no: number;
    sector_id: number;
  }>) {
    const contact = masoolUserMap.get(row.its_no);
    if (!contact) continue;
    if (!masoolsBySector.has(row.sector_id))
      masoolsBySector.set(row.sector_id, []);
    masoolsBySector.get(row.sector_id)!.push(contact);
  }

  const musaidsBySubsector = new Map<number, LeaderContact[]>();
  for (const row of (
    (musaidSubsectorRows.data ?? []) as Array<{
      its_no: number;
      subsector_id: number;
    }>
  ).filter((r) => subsectorIds.includes(r.subsector_id))) {
    const contact = musaidUserMap.get(row.its_no);
    if (!contact) continue;
    if (!musaidsBySubsector.has(row.subsector_id))
      musaidsBySubsector.set(row.subsector_id, []);
    musaidsBySubsector.get(row.subsector_id)!.push(contact);
  }

  const [buildingsResult, muminResult] = await Promise.all([
    subsectorIds.length > 0
      ? supabase
          .from("building")
          .select("building_id, subsector_id")
          .in("subsector_id", subsectorIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("mumin")
      .select("its_no", { count: "exact" })
      .in("subsector_id", subsectorIds),
  ]);

  const buildings = (buildingsResult.data ?? []) as Array<{
    building_id: number;
    subsector_id: number;
  }>;
  const buildingIds = buildings.map((b) => b.building_id);

  const housesResult =
    buildingIds.length > 0
      ? await supabase
          .from("house")
          .select("paci_no, building_id")
          .in("building_id", buildingIds)
      : { data: [] };

  const houses = (housesResult.data ?? []) as Array<{
    paci_no: string;
    building_id: number;
  }>;
  const flatCountByBuilding = new Map<number, number>();
  for (const h of houses) {
    flatCountByBuilding.set(
      h.building_id,
      (flatCountByBuilding.get(h.building_id) ?? 0) + 1,
    );
  }

  const paciNosInScope = houses.map((h) => h.paci_no);
  const { data: famData } =
    buildingIds.length > 0
      ? await supabase
          .from("family")
          .select("sabeel_no")
          .in("paci_no", paciNosInScope)
      : { data: [] };
  const totalFamilies = famData?.length ?? 0;

  const subsectorsBySector = new Map<number, typeof subsectors>();
  for (const ss of subsectors) {
    if (!subsectorsBySector.has(ss.sector_id))
      subsectorsBySector.set(ss.sector_id, []);
    subsectorsBySector.get(ss.sector_id)!.push(ss);
  }

  const sectorBreakdown = (
    await Promise.all(
      sectors.map(async (s) => {
        const sectorSubsectors = subsectorsBySector.get(s.sector_id) ?? [];
        const ssIds = sectorSubsectors.map((ss) => ss.subsector_id);
        const sectorBuildings = buildings.filter((b) =>
          sectorSubsectors.some((ss) => ss.subsector_id === b.subsector_id),
        );
        const sectorHouses = houses.filter((h) =>
          sectorBuildings.some((b) => b.building_id === h.building_id),
        );

        const mCount =
          ssIds.length > 0
            ? await supabase
                .from("mumin")
                .select("its_no", { count: "exact" })
                .in("subsector_id", ssIds)
            : { count: 0 };

        const subsectorDetails = await Promise.all(
          sectorSubsectors.map(async (ss) => {
            const { count } = await supabase
              .from("mumin")
              .select("its_no", { count: "exact" })
              .eq("subsector_id", ss.subsector_id);
            return {
              subsector_id: ss.subsector_id,
              subsector_name: ss.subsector_name,
              mumin_count: count ?? 0,
              musaids: musaidsBySubsector.get(ss.subsector_id) ?? [],
            };
          }),
        );

        return {
          sector_id: s.sector_id,
          sector_name: s.sector_name,
          subsector_count: sectorSubsectors.length,
          mumin_count: mCount.count ?? 0,
          building_count: sectorBuildings.length,
          flat_count: sectorHouses.length,
          family_count: sectorHouses.length,
          masools: masoolsBySector.get(s.sector_id) ?? [],
          subsectors: subsectorDetails,
        };
      }),
    )
  ).sort((a, b) => a.sector_id - b.sector_id);

  return {
    assignedSectors: sectors,
    totalSubsectors: subsectors.length,
    totalBuildings: buildings.length,
    totalFlats: houses.length,
    totalFamilies,
    totalMumineen: muminResult.count ?? 0,
    sectorBreakdown,
  };
}

// ─── Masool (now multi-sector) ───────────────────────────────────────────────

// export async function getMasoolStats(session: SessionUser): Promise<MasoolStats> {
//   const supabase = createAdminClient()
//   const sectorIds = session.sector_ids
//   if (sectorIds.length === 0) {
//     return {
//       sectorNames: ['Unassigned'], sectorIds: [],
//       subsectorCount: 0, muminCount: 0,
//       totalBuildings: 0, totalFlats: 0, totalFamilies: 0,
//       subsectors: [], buildings: [], sector_masools: [],
//     }
//   }

//   const [sectorsResult, subsectorsResult, masoolSectorRows, masoolUsersResult] = await Promise.all([
//     supabase.from('sector').select('sector_id, sector_name').in('sector_id', sectorIds),
//     supabase.from('subsector').select('subsector_id, sector_id, subsector_name').in('sector_id', sectorIds),
//     supabase.from('user_sector').select('its_no, sector_id').in('sector_id', sectorIds),
//     supabase.from('mumin').select('its_no, name, phone').in('role', ['Masool', 'Admin']),
//   ])

//   const sectors = (sectorsResult.data ?? []) as Array<{ sector_id: number; sector_name: string }>
//   const subsectors = (subsectorsResult.data ?? []) as Array<{ subsector_id: number; sector_id: number; subsector_name: string }>
//   const subsectorIds = subsectors.map(ss => ss.subsector_id)

//   const masoolUserMap = new Map<number, LeaderContact>(
//     ((masoolUsersResult.data ?? []) as any[]).map((m: any) => [m.its_no, { its_no: m.its_no, name: m.name, phone: m.phone }])
//   )
//   // Dedupe: one masool might be assigned multiple sectors — only show them once
//   const sectorMasoolSet = new Map<number, LeaderContact>()
//   for (const row of (masoolSectorRows.data ?? []) as Array<{ its_no: number; sector_id: number }>) {
//     const contact = masoolUserMap.get(row.its_no)
//     if (contact) sectorMasoolSet.set(row.its_no, contact)
//   }
//   const sector_masools = Array.from(sectorMasoolSet.values())

//   const sectorNameById = new Map(sectors.map(s => [s.sector_id, s.sector_name]))
//   const subsectorNameById = new Map(subsectors.map(ss => [ss.subsector_id, ss.subsector_name]))

//   const [subsectorStats, buildingsResult] = await Promise.all([
//     Promise.all(
//       subsectors.map(async (ss) => {
//         const mCount = await supabase.from('mumin').select('its_no', { count: 'exact' }).eq('subsector_id', ss.subsector_id)
//         return { ...ss, mumin_count: mCount.count ?? 0, sector_name: sectorNameById.get(ss.sector_id) ?? '' }
//       })
//     ),
//     subsectorIds.length > 0
//       ? supabase.from('building').select('building_id, building_name, subsector_id').in('subsector_id', subsectorIds)
//       : Promise.resolve({ data: [] }),
//   ])

//   const buildings = (buildingsResult.data ?? []) as Array<{ building_id: number; building_name: string; subsector_id: number }>
//   const buildingIds = buildings.map(b => b.building_id)

//   const housesResult = buildingIds.length > 0
//     ? await supabase.from('house').select('paci_no, building_id').in('building_id', buildingIds)
//     : { data: [] }

//   const houses = (housesResult.data ?? []) as Array<{ paci_no: string; building_id: number }>
//   const flatCountByBuilding = new Map<number, number>()
//   for (const h of houses) {
//     flatCountByBuilding.set(h.building_id, (flatCountByBuilding.get(h.building_id) ?? 0) + 1)
//   }

//   const masoolPaciNos = houses.map(h => h.paci_no)
//   const { data: masoolFamData } = buildingIds.length > 0
//     ? await supabase.from('family').select('sabeel_no').in('paci_no', masoolPaciNos)
//     : { data: [] }
//   const totalFamilies = masoolFamData?.length ?? 0

//   const buildingStats = buildings.map(b => ({
//     building_id: b.building_id,
//     building_name: b.building_name,
//     subsector_name: subsectorNameById.get(b.subsector_id) ?? '',
//     flat_count: flatCountByBuilding.get(b.building_id) ?? 0,
//   }))

//   return {
//     sectorNames: sectors.map(s => s.sector_name),
//     sectorIds,
//     subsectorCount: subsectors.length,
//     muminCount: subsectorStats.reduce((sum, ss) => sum + ss.mumin_count, 0),
//     totalBuildings: buildings.length,
//     totalFlats: houses.length,
//     totalFamilies,
//     subsectors: subsectorStats,
//     buildings: buildingStats,
//     sector_masools,
//   }
// }

export async function getMasoolStats(
  session: SessionUser,
): Promise<MasoolStats> {
  const supabase = createAdminClient();
  const sectorIds = session.sector_ids;
  if (sectorIds.length === 0) {
    return {
      sectorNames: ["Unassigned"],
      sectorIds: [],
      subsectorCount: 0,
      muminCount: 0,
      totalBuildings: 0,
      totalFlats: 0,
      totalFamilies: 0,
      subsectors: [],
      buildings: [],
      sector_masools: [],
    };
  }

const [
  sectorsResult,
  subsectorsResult,
  masoolSectorRows,
  masoolUsersResult,
] = await Promise.all([
  supabase
    .from("sector")
    .select("sector_id, sector_name")
    .in("sector_id", sectorIds),
  supabase
    .from("subsector")
    .select("subsector_id, sector_id, subsector_name")
    .in("sector_id", sectorIds),
  supabase
    .from("user_sector")
    .select("its_no, sector_id")
    .in("sector_id", sectorIds),
  supabase
    .from("mumin")
    .select("its_no, name, phone")
    .in("role", ["Masool", "Admin"]),
]);

const sectors = (sectorsResult.data ?? []) as Array<{
  sector_id: number;
  sector_name: string;
}>;
const subsectors = (subsectorsResult.data ?? []) as Array<{
  subsector_id: number;
  sector_id: number;
  subsector_name: string;
}>;
const subsectorIds = subsectors.map((ss) => ss.subsector_id);

const [
  musaidSubsectorRows,
  musaidUsersResult,
] = await Promise.all([
  supabase
    .from("user_subsector")
    .select("its_no, subsector_id")
    .in("subsector_id", subsectorIds), // 👈 correct filter
  supabase.from("mumin").select("its_no, name, phone").eq("role", "Musaid"), // musaid users
]);

  // Build lookup maps
  const masoolUserMap = new Map<number, LeaderContact>(
    ((masoolUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );
  const musaidUserMap = new Map<number, LeaderContact>(
    ((musaidUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );

  // Masools
  const sectorMasoolSet = new Map<number, LeaderContact>();
  for (const row of (masoolSectorRows.data ?? []) as Array<{
    its_no: number;
    sector_id: number;
  }>) {
    const contact = masoolUserMap.get(row.its_no);
    if (contact) sectorMasoolSet.set(row.its_no, contact);
  }
  const sector_masools = Array.from(sectorMasoolSet.values());

  // Musaids
  const musaidsBySubsector = new Map<number, LeaderContact[]>();
  for (const row of (musaidSubsectorRows.data ?? []) as Array<{
    its_no: number;
    subsector_id: number;
  }>) {
    const contact = musaidUserMap.get(row.its_no);
    if (!contact) continue;
    if (!musaidsBySubsector.has(row.subsector_id))
      musaidsBySubsector.set(row.subsector_id, []);
    musaidsBySubsector.get(row.subsector_id)!.push(contact);
  }

  const sectorNameById = new Map(
    sectors.map((s) => [s.sector_id, s.sector_name]),
  );
  const subsectorNameById = new Map(
    subsectors.map((ss) => [ss.subsector_id, ss.subsector_name]),
  );

  const [subsectorStats, buildingsResult] = await Promise.all([
    Promise.all(
      subsectors.map(async (ss) => {
        const mCount = await supabase
          .from("mumin")
          .select("its_no", { count: "exact" })
          .eq("subsector_id", ss.subsector_id);
        return {
          ...ss,
          mumin_count: mCount.count ?? 0,
          sector_name: sectorNameById.get(ss.sector_id) ?? "",
          musaids: musaidsBySubsector.get(ss.subsector_id) ?? [], // 👈 include musaids here
        };
      }),
    ),
    subsectorIds.length > 0
      ? supabase
          .from("building")
          .select("building_id, building_name, subsector_id")
          .in("subsector_id", subsectorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const buildings = (buildingsResult.data ?? []) as Array<{
    building_id: number;
    building_name: string;
    subsector_id: number;
  }>;
  const buildingIds = buildings.map((b) => b.building_id);

  const housesResult =
    buildingIds.length > 0
      ? await supabase
          .from("house")
          .select("paci_no, building_id")
          .in("building_id", buildingIds)
      : { data: [] };

  const houses = (housesResult.data ?? []) as Array<{
    paci_no: string;
    building_id: number;
  }>;
  const flatCountByBuilding = new Map<number, number>();
  for (const h of houses) {
    flatCountByBuilding.set(
      h.building_id,
      (flatCountByBuilding.get(h.building_id) ?? 0) + 1,
    );
  }

  const masoolPaciNos = houses.map((h) => h.paci_no);
  const { data: masoolFamData } =
    buildingIds.length > 0
      ? await supabase
          .from("family")
          .select("sabeel_no")
          .in("paci_no", masoolPaciNos)
      : { data: [] };
  const totalFamilies = masoolFamData?.length ?? 0;

  const buildingStats = buildings.map((b) => ({
    building_id: b.building_id,
    building_name: b.building_name,
    subsector_name: subsectorNameById.get(b.subsector_id) ?? "",
    flat_count: flatCountByBuilding.get(b.building_id) ?? 0,
  }));

  return {
    sectorNames: sectors.map((s) => s.sector_name),
    sectorIds,
    subsectorCount: subsectors.length,
    muminCount: subsectorStats.reduce((sum, ss) => sum + ss.mumin_count, 0),
    totalBuildings: buildings.length,
    totalFlats: houses.length,
    totalFamilies,
    subsectors: subsectorStats,
    buildings: buildingStats,
    sector_masools,
  };
}

// ─── Musaid (now multi-subsector) ───────────────────────────────────────────

export async function getMusaidStats(
  session: SessionUser,
): Promise<MusaidStats> {
  const supabase = createAdminClient();
  const subsectorIds = session.subsector_ids;
  if (subsectorIds.length === 0) {
    return {
      subsectorName: "Unassigned",
      subsectorId: 0,
      sectorName: "",
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
    };
  }

  const subsectorId = subsectorIds[0];

  const [ssResult, muminResult, buildingsResult] = await Promise.all([
    supabase
      .from("subsector")
      .select("subsector_name, sector:sector_id(sector_id, sector_name)")
      .eq("subsector_id", subsectorId)
      .single(),
    supabase
      .from("mumin")
      .select("gender, balig_status")
      .in("subsector_id", subsectorIds),
    supabase
      .from("building")
      .select("building_id, building_name")
      .in("subsector_id", subsectorIds),
  ]);

  const ssData = ssResult.data as any;
  const sectorId = ssData?.sector?.sector_id;

  const [
    masoolSectorRows,
    masoolUsersResult,
    musaidSubsectorRows,
    musaidUsersResult,
  ] = await Promise.all([
    sectorId
      ? supabase.from("user_sector").select("its_no").eq("sector_id", sectorId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("mumin")
      .select("its_no, name, phone")
      .in("role", ["Masool", "Admin"]),
    supabase
      .from("user_subsector")
      .select("its_no, subsector_id")
      .in("subsector_id", subsectorIds),
    supabase.from("mumin").select("its_no, name, phone").eq("role", "Musaid"),
  ]);

  const masoolUserMap = new Map<number, LeaderContact>(
    ((masoolUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );
  const musaidUserMap = new Map<number, LeaderContact>(
    ((musaidUsersResult.data ?? []) as any[]).map((m: any) => [
      m.its_no,
      { its_no: m.its_no, name: m.name, phone: m.phone },
    ]),
  );

  const sector_masools = (
    (masoolSectorRows.data ?? []) as Array<{ its_no: number }>
  )
    .map((r) => masoolUserMap.get(r.its_no))
    .filter((c): c is LeaderContact => !!c);

  // Dedupe musaids (one musaid might cover multiple subsectors)
  const musaidSeen = new Set<number>();
  const subsector_musaids = (
    (musaidSubsectorRows.data ?? []) as Array<{
      its_no: number;
      subsector_id: number;
    }>
  )
    .filter((r) => {
      if (musaidSeen.has(r.its_no)) return false;
      musaidSeen.add(r.its_no);
      return true;
    })
    .map((r) => musaidUserMap.get(r.its_no))
    .filter((c): c is LeaderContact => !!c);

  const mumineen = (muminResult.data ?? []) as Array<{
    gender: string;
    balig_status: string;
  }>;
  const buildings = (buildingsResult.data ?? []) as Array<{
    building_id: number;
    building_name: string;
  }>;
  const buildingIds = buildings.map((b) => b.building_id);

  const housesResult =
    buildingIds.length > 0
      ? await supabase
          .from("house")
          .select("paci_no, building_id")
          .in("building_id", buildingIds)
      : { data: [] };

  const houses = (housesResult.data ?? []) as Array<{
    paci_no: string;
    building_id: number;
  }>;
  const flatCountByBuilding = new Map<number, number>();
  for (const h of houses) {
    flatCountByBuilding.set(
      h.building_id,
      (flatCountByBuilding.get(h.building_id) ?? 0) + 1,
    );
  }

  const musaidPaciNos = houses.map((h) => h.paci_no);
  const { data: musaidFamData } =
    buildingIds.length > 0
      ? await supabase
          .from("family")
          .select("sabeel_no")
          .in("paci_no", musaidPaciNos)
      : { data: [] };
  const totalFamilies = musaidFamData?.length ?? 0;

  return {
    subsectorName: ssData?.subsector_name ?? "Unknown",
    subsectorId,
    sectorName: ssData?.sector?.sector_name ?? "",
    muminCount: mumineen.length,
    maleCount: mumineen.filter((m) => m.gender === "M").length,
    femaleCount: mumineen.filter((m) => m.gender === "F").length,
    baligCount: mumineen.filter((m) => m.balig_status === "Balig").length,
    ghairBaligCount: mumineen.filter((m) => m.balig_status === "Ghair Balig")
      .length,
    totalBuildings: buildings.length,
    totalFlats: houses.length,
    totalFamilies,
    buildings: buildings.map((b) => ({
      building_id: b.building_id,
      building_name: b.building_name,
      flat_count: flatCountByBuilding.get(b.building_id) ?? 0,
    })),
    sector_masools,
    subsector_musaids,
  };
}

// ─── Mumin ───────────────────────────────────────────────────────────────────

export async function getMuminStats(itsNo: number): Promise<MuminStats | null> {
  const supabase = createAdminClient();

  const muminResult = await (supabase
    .from("mumin")
    .select(
      "name, its_no, sabeel_no, gender, balig_status, status, subsector_id, subsector!subsector_id(subsector_name, sector:sector_id(sector_name))",
    )
    .eq("its_no", itsNo)
    .single() as any);

  if (!muminResult.data) return null;
  const m = muminResult.data as any;

  const { data: famRow } = await supabase
    .from("family")
    .select("paci_no")
    .eq("sabeel_no", m.sabeel_no)
    .maybeSingle();

  const { data: houseData } = famRow?.paci_no
    ? await supabase
        .from("house")
        .select(
          "paci_no, floor_no, flat_no, building:building_id(building_name, landmark)",
        )
        .eq("paci_no", famRow.paci_no)
        .maybeSingle()
    : { data: null };

  const house = houseData as any;

  const familyCount = await supabase
    .from("mumin")
    .select("its_no", { count: "exact" })
    .eq("sabeel_no", m.sabeel_no);

  return {
    name: m.name,
    its_no: m.its_no,
    sabeel_no: m.sabeel_no,
    gender: m.gender,
    balig_status: m.balig_status,
    status: m.status,
    buildingName: house?.building?.building_name ?? "—",
    subsectorName: m.subsector?.subsector_name ?? "—",
    sectorName: m.subsector?.sector?.sector_name ?? "—",
    paciNo: house?.paci_no ?? null,
    floorNo: house?.floor_no ?? null,
    flatNo: house?.flat_no ?? null,
    landmarkName: house?.building?.landmark ?? null,
    totalFamilyMembers: familyCount.count ?? 1,
  };
}
