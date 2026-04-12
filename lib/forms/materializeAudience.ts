import { createClient } from '@/lib/supabase/server'
import { AudienceFilters } from '@/lib/types/forms'

export async function materializeAudience(formId: string, filters: AudienceFilters): Promise<void> {
  const supabase = await createClient()   // uses service role in API route context

  let query = supabase.from('mumin').select('its_no')

  if (!filters.all) {
    if (filters.gender) query = query.eq('gender', filters.gender)
    if (filters.balig_status !== undefined) query = query.eq('balig_status', filters.balig_status)
    if (filters.sector_ids?.length) {
      query = query.in('subsector!subsector_id.sector_id', filters.sector_ids)
    }
    if (filters.subsector_ids?.length) {
      query = query.in('subsector_id', filters.subsector_ids)
    }
    if (filters.age_from || filters.age_to) {
      const now = new Date()
      if (filters.age_to) {
        const minDob = new Date(now.getFullYear() - filters.age_to, now.getMonth(), now.getDate())
        query = query.gte('date_of_birth', minDob.toISOString().split('T')[0])
      }
      if (filters.age_from) {
        const maxDob = new Date(now.getFullYear() - filters.age_from, now.getMonth(), now.getDate())
        query = query.lte('date_of_birth', maxDob.toISOString().split('T')[0])
      }
    }
  }

  const { data: members, error } = await query
  if (error) throw new Error(`Audience query failed: ${error.message}`)

  const rows = (members ?? []).map((m) => ({ form_id: formId, its_no: String(m.its_no) }))
  if (!rows.length) return

  const { error: insertErr } = await supabase
    .from('form_audience')
    .upsert(rows, { onConflict: 'form_id,its_no', ignoreDuplicates: true })

  if (insertErr) throw new Error(`Audience insert failed: ${insertErr.message}`)
}
