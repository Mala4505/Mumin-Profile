import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberFilters } from "@/lib/types/app";

export interface MemberListItem {
  its_no: number;
  name: string;
  gender: "M" | "F";
  balig_status: "Balig" | "Ghair Balig";
  phone: string | null;
  status: string;
  sabeel_no: string;
  subsector_id: number;
  subsector_name: string;
  sector_id: number;
  sector_name: string;
  // House / building fields (null when no house record found for this sabeel_no)
  paci_no: string | null;
  floor_no: string | null;
  flat_no: string | null;
  building_name: string | null;
  building_id: number | null;
  landmark: string | null;
  head_its_no: number | null; // from family.head_its_no
  hof_name: string | null; // name of head_its_no member, from view join
}

export async function getMembers(
  filters: MemberFilters,
): Promise<MemberListItem[]> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Pre-resolve paci_no filter → sabeel_nos
  let paciSabeelNos: string[] | null = null;
  if (filters.paci_no) {
    const { data: familyRows } = await adminClient
      .from("family")
      .select("sabeel_no")
      .ilike("paci_no", `%${filters.paci_no}%`)
      .limit(100);
    paciSabeelNos = (familyRows ?? []).map((f: any) => f.sabeel_no as string);
    if (paciSabeelNos.length === 0) return [];
  }

  // Pre-resolve musaid_its_no filter → subsector_ids
  let musaidSubsectorIds: number[] | null = null;
  if (filters.musaid_its_no) {
    const { data: usRows } = await adminClient
      .from("user_subsector")
      .select("subsector_id")
      .eq("its_no", filters.musaid_its_no);
    musaidSubsectorIds = (usRows ?? []).map(
      (r: any) => r.subsector_id as number,
    );
    if (musaidSubsectorIds.length === 0) return [];
  }

  // Single query against the member_directory view — RLS on mumin still applies (security_invoker)
  let query = (supabase as any)
    .from("member_directory")
    .select(
      "its_no,name,gender,balig_status,phone,status,sabeel_no,subsector_id,subsector_name,sector_id,sector_name,paci_no,head_its_no,hof_name,floor_no,flat_no,building_id,building_name,landmark",
    )
    .order("name", { ascending: true })
    .limit(10000);

  if (filters.sector_id) query = query.eq("sector_id", filters.sector_id);
  if (filters.subsector_id)
    query = query.eq("subsector_id", filters.subsector_id);
  if (filters.building_id) query = query.eq("building_id", filters.building_id);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.balig_status)
    query = query.eq("balig_status", filters.balig_status);
  if (filters.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "active");
  }
  if (paciSabeelNos !== null) query = query.in("sabeel_no", paciSabeelNos);
  if (musaidSubsectorIds !== null)
    query = query.in("subsector_id", musaidSubsectorIds);

  if (filters.search) {
    const s = filters.search.trim();
    const isNum = /^\d+$/.test(s)
    const orFilter = isNum
        //   ? `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%,its_no.eq.${s},building_name.ilike.%${s}%,musaid_names.ilike.%${s}%`
        //   : `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%,building_name.ilike.%${s}%,musaid_names.ilike.%${s}%`
      ?  `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%,its_no.eq.${s},building_name.ilike.%${s}%`
      : `name.ilike.%${s}%,sabeel_no.ilike.%${s}%,phone.ilike.%${s}%,building_name.ilike.%${s}%`;
    query = query.or(orFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getMembers error:", error);
    return [];
  }

  return (data ?? []).map((m: any) => ({
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
  })) as MemberListItem[];
}

export async function getSectors() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sector")
    .select("sector_id, sector_name")
    .order("sector_id");
  return data ?? [];
}

export async function getSubsectors(sectorId?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("subsector")
    .select("subsector_id, sector_id, subsector_name")
    .order("subsector_id");
  if (sectorId) query = query.eq("sector_id", sectorId);
  const { data } = await query;
  return data ?? [];
}
