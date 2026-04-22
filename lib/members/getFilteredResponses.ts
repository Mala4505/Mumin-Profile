import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types/app'

export interface FilteredResponse {
  profile_field_id: number
  answer: string
  submitted_at: string
  remarks: string | null
  event_title: string | null
}

/**
 * Fetch form responses for a member, filtering by viewer's access rights
 */
export async function getFilteredResponses(
  respondentItsNo: number,
  viewerSession: SessionUser
): Promise<FilteredResponse[]> {
  const supabase = await createClient()

  // Get respondent's sector/subsector info
  const { data: respondent } = await supabase
    .from('mumin')
    .select('subsector_id, subsector!inner(sector_id)')
    .eq('its_no', respondentItsNo)
    .maybeSingle()

  const respondentSubsectorId = (respondent as any)?.subsector_id
  const respondentSectorId = (respondent as any)?.subsector?.sector_id

  // Check if viewer is Masool or Musaid assigned to respondent
  let isAssignedMusaid = false
  let isAssignedMasool = false

  if (viewerSession.role === 'Musaid' && respondentSubsectorId) {
    const { data } = await supabase
      .from('user_subsector')
      .select('subsector_id')
      .eq('its_no', viewerSession.its_no)
      .eq('subsector_id', respondentSubsectorId)
      .maybeSingle()
    isAssignedMusaid = !!data
  }

  if (viewerSession.role === 'Masool' && respondentSectorId) {
    const { data } = await supabase
      .from('user_sector')
      .select('sector_id')
      .eq('its_no', viewerSession.its_no)
      .eq('sector_id', respondentSectorId)
      .maybeSingle()
    isAssignedMasool = !!data
  }

  // Fetch all responses with form info
  const { data: allResponses } = await supabase
    .from('form_responses')
    .select(
      `
      profile_field_id, answer, submitted_at, remarks,
      form:form_id (id, viewable_by_roles),
      event:event_id (title)
    `
    )
    .eq('filled_for', respondentItsNo)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })

  if (!allResponses) return []

  // Filter based on access rules
  const filtered = (allResponses as any[]).filter((r) => {
    const viewableByRoles = r.form?.viewable_by_roles || 'all'
    const isAdmin = viewerSession.role === 'SuperAdmin' || viewerSession.role === 'Admin'
    const isOwnProfile = viewerSession.its_no === respondentItsNo

    // Admin always sees
    if (isAdmin) return true

    // If staff_only, only admin/assigned staff see
    if (viewableByRoles === 'staff_only') {
      return isAssignedMusaid || isAssignedMasool
    }

    // If 'all' (default), member + assigned staff see
    return isOwnProfile || isAssignedMusaid || isAssignedMasool
  })

  return filtered.map((r) => ({
    profile_field_id: r.profile_field_id,
    answer: r.answer ?? '',
    submitted_at: r.submitted_at,
    remarks: r.remarks ?? null,
    event_title: r.event?.title ?? null,
  }))
}
