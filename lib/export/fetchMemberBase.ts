import type { SupabaseClient } from '@supabase/supabase-js'

export interface BaseMemberRow {
  its_no: number
  name: string
  sabeel_no: string
  sector_name: string
  subsector_name: string
  masool_name: string
  musaid_names: string
}

export async function fetchMemberBase(
  itsNos: number[],
  supabase: SupabaseClient
): Promise<Map<number, BaseMemberRow>> {
  if (!itsNos.length) return new Map()

  const { data } = await supabase
    .from('member_directory')
    .select('its_no, name, sabeel_no, sector_name, subsector_name, masool_name, musaid_names')
    .in('its_no', itsNos)

  const map = new Map<number, BaseMemberRow>()
  for (const row of data ?? []) {
    map.set(row.its_no, {
      its_no: row.its_no,
      name: row.name ?? '',
      sabeel_no: row.sabeel_no ?? '',
      sector_name: row.sector_name ?? '',
      subsector_name: row.subsector_name ?? '',
      masool_name: row.masool_name ?? '',
      musaid_names: row.musaid_names ?? '',
    })
  }
  return map
}
