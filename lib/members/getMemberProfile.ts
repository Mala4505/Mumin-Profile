import { createClient } from "@/lib/supabase/server";

export interface MemberProfile {
  its_no: number;
  name: string; // Changed from 'name' to match component usage
  gender: "M" | "F";
  date_of_birth: string | null;
  balig_status: "Balig" | "Ghair Balig";
  phone: string | null;
  alternate_phone: string | null;
  email: string | null;
  status: string;
  sabeel_no: string;
  subsector_id: number;
  subsector_name: string;
  sector_name: string;
  building_name: string;
  landmark: string | null;
  floor_no: string | null;
  flat_no: string | null;
  paci_no: string;
  // Changed from 'profile_values' to 'values' to match component usage
  values: Array<{
    id: number; // Changed from 'field_id' to 'id'
    caption: string;
    category_name: string;
    value: string | null;
    visibility_level: number;
    is_data_entry: boolean;
    mumin_can_edit: boolean;
    field_type: string;
    behavior: string; // Added to support the Historical Timeline feature
    sort_order: number;
    category_sort_order: number;
  }>;
}

export async function getMemberProfile(
  itsNo: number,
): Promise<MemberProfile | null> {
  const supabase = await createClient();

  // Query 1: mumin + subsector + sector
  const { data: mumin, error } = await supabase
    .from("mumin")
    .select(
      `
      its_no, name, gender, date_of_birth, balig_status,
      phone, alternate_phone, email, status, sabeel_no,
      subsector_id,
      subsector!inner (
        subsector_name,
        sector!inner ( sector_name )
      )
    `,
    )
    .eq("its_no", itsNo)
    .maybeSingle();

  if (error || !mumin) return null;

  const m = mumin as any;

  // Query 2: family → paci_no → house → building
  const { data: familyRow } = await supabase
    .from("family")
    .select(
      `
      paci_no,
      house!family_paci_no_fkey (
        floor_no, flat_no,
        building:building_id ( building_name, landmark )
      )
    `,
    )
    .eq("sabeel_no", m.sabeel_no)
    .maybeSingle();

  const fam = familyRow as any;
  const house = fam?.house ?? null;

  // Fetch profile values with field info
  const { data: profileValues } = await supabase
    .from("profile_value")
    .select(
      `
      field_id, value,
      profile_field!field_id (
        caption, field_type, visibility_level, is_data_entry,
        mumin_can_edit, sort_order, behavior,
        profile_category!inner ( name, sort_order )
      )`,
    )
    .eq("its_no", itsNo);

  return {
    its_no: m.its_no,
    name: m.name, // Mapping 'name' from DB to 'name' for UI
    gender: m.gender,
    date_of_birth: m.date_of_birth,
    balig_status: m.balig_status,
    phone: m.phone,
    alternate_phone: m.alternate_phone,
    email: m.email,
    status: m.status,
    sabeel_no: m.sabeel_no,
    subsector_id: m.subsector_id,
    subsector_name: m.subsector?.subsector_name ?? "",
    sector_name: m.subsector?.sector?.sector_name ?? "",
    building_name: house?.building?.building_name ?? "",
    landmark: house?.building?.landmark ?? null,
    floor_no: house?.floor_no ?? null,
    flat_no: house?.flat_no ?? null,
    paci_no: fam?.paci_no ?? "",
    values: (profileValues ?? []).map((pv: any) => ({
      id: pv.field_id,
      caption: pv.profile_field?.caption ?? "",
      category_name: pv.profile_field?.profile_category?.name ?? "",
      value: pv.value,
      visibility_level: pv.profile_field?.visibility_level ?? 1,
      is_data_entry: pv.profile_field?.is_data_entry ?? false,
      mumin_can_edit: pv.profile_field?.mumin_can_edit ?? false,
      field_type: pv.profile_field?.field_type ?? "text",
      behavior: pv.profile_field?.behavior ?? "static",
      sort_order: pv.profile_field?.sort_order ?? 0,
      category_sort_order: pv.profile_field?.profile_category?.sort_order ?? 0,
    })),
  };
}
