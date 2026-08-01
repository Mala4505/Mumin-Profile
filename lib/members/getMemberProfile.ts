import { createClient } from "@/lib/supabase/server";

export interface MemberProfile {
  its_no: number;
  name: string;
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
  values: Array<{
    id: number;
    caption: string;
    category_name: string;
    value: string | null;
    visibility_level: number;
    is_data_entry: boolean;
    mumin_can_edit: boolean;
    field_type: string;
    behavior: string;
    sort_order: number;
    category_sort_order: number;
  }>;
}

export async function getMemberProfile(
  itsNo: number,
): Promise<MemberProfile | null> {
  const supabase = await createClient();

  // Both queries are now independent — run in parallel.
  // v_member_profile flattens mumin + subsector + sector + family + house + building
  // into a single row, replacing the previous 2-step sequential fetch.
  const [{ data: row }, { data: profileValues }] = await Promise.all([
    supabase
      .from("v_member_profile")
      .select(
        "its_no, name, gender, date_of_birth, balig_status, phone, alternate_phone, email, status, sabeel_no, subsector_id, subsector_name, sector_name, paci_no, floor_no, flat_no, building_name, landmark",
      )
      .eq("its_no", itsNo)
      .maybeSingle(),
    supabase
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
      .eq("its_no", itsNo),
  ]);

  if (!row) return null;

  return {
    // its_no/name/gender/balig_status/sabeel_no/subsector_id come from mumin's own
    // NOT NULL columns via v_member_profile's inner joins; the view's generated type
    // marks them nullable because Postgres view metadata doesn't carry that guarantee.
    its_no: row.its_no!,
    name: row.name!,
    gender: row.gender as "M" | "F",
    date_of_birth: row.date_of_birth,
    balig_status: row.balig_status as "Balig" | "Ghair Balig",
    phone: row.phone,
    alternate_phone: row.alternate_phone,
    email: row.email,
    status: row.status ?? "active",
    sabeel_no: row.sabeel_no!,
    subsector_id: row.subsector_id!,
    subsector_name: row.subsector_name ?? "",
    sector_name: row.sector_name ?? "",
    building_name: row.building_name ?? "",
    landmark: row.landmark ?? null,
    floor_no: row.floor_no ?? null,
    flat_no: row.flat_no ?? null,
    paci_no: row.paci_no ?? "",
    values: ((profileValues ?? []) as any[]).map((pv) => ({
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
