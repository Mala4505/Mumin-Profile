import { createClient } from '@/lib/supabase/server'

export interface MemberProfile {
  its_no: number
  name: string
  gender: 'M' | 'F'
  date_of_birth: string | null
  balig_status: 'Balig' | 'Ghair Balig'
  phone: string | null
  alternate_phone: string | null
  email: string | null
  status: string
  sabeel_no: string
  subsector_id: number
  subsector_name: string
  sector_name: string
  building_name: string
  landmark: string | null
  floor_no: string | null
  flat_no: string | null
  paci_no: string
  profile_values: Array<{
    field_id: number
    caption: string
    category_name: string
    value: string | null
    visibility_level: number
    is_data_entry: boolean
    mumin_can_edit: boolean
    field_type: string
    sort_order: number
    category_sort_order: number
  }>
}

export async function getMemberProfile(itsNo: number): Promise<MemberProfile | null> {
  const supabase = await createClient()

  const { data: mumin, error } = await supabase
    .from('mumin')
    .select(`
      its_no, name, gender, date_of_birth, balig_status,
      phone, alternate_phone, email, status, sabeel_no,
      subsector_id,
      subsector!subsector_id!inner (
        subsector_name,
        sector!inner ( sector_name ),
        building!inner (
          building_name,
          landmark,
          house!inner (
            paci_no, floor_no, flat_no,
            sabeel_no
          )
        )
      )
    `)
    .eq('its_no', itsNo)
    .maybeSingle()

  if (error || !mumin) return null

  // Cast to any — the nested !inner join type cannot be inferred with Relationships: []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = mumin as any

  // Fetch profile values with field info
  const { data: profileValues } = await supabase
    .from('profile_value')
    .select(`
      field_id, value,
      profile_field!inner (
        caption, field_type, visibility_level, is_data_entry, mumin_can_edit, sort_order,
        profile_category!inner ( name, sort_order )
      )
    `)
    .eq('its_no', itsNo)

  const buildings: any[] = m.subsector?.building ?? []
  const matchedBuilding = buildings.find((b: any) =>
    (b.house ?? []).some((h: any) => h.sabeel_no === m.sabeel_no)
  )
  const house = (matchedBuilding?.house ?? []).find((h: any) => h.sabeel_no === m.sabeel_no)

  return {
    its_no: m.its_no,
    name: m.name,
    gender: m.gender,
    date_of_birth: m.date_of_birth,
    balig_status: m.balig_status,
    phone: m.phone,
    alternate_phone: m.alternate_phone,
    email: m.email,
    status: m.status,
    sabeel_no: m.sabeel_no,
    subsector_id: m.subsector_id,
    subsector_name: m.subsector?.subsector_name ?? '',
    sector_name: m.subsector?.sector?.sector_name ?? '',
    building_name: matchedBuilding?.building_name ?? '',
    landmark: matchedBuilding?.landmark ?? null,
    floor_no: house?.floor_no ?? null,
    flat_no: house?.flat_no ?? null,
    paci_no: house?.paci_no ?? '',
    profile_values: (profileValues ?? []).map((pv: any) => ({
      field_id: pv.field_id,
      caption: pv.profile_field?.caption ?? '',
      category_name: pv.profile_field?.profile_category?.name ?? '',
      value: pv.value,
      visibility_level: pv.profile_field?.visibility_level ?? 1,
      is_data_entry: pv.profile_field?.is_data_entry ?? false,
      mumin_can_edit: pv.profile_field?.mumin_can_edit ?? false,
      field_type: pv.profile_field?.field_type ?? 'text',
      sort_order: pv.profile_field?.sort_order ?? 0,
      category_sort_order: pv.profile_field?.profile_category?.sort_order ?? 0,
    })),
  }
}
