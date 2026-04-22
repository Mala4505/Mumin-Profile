import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types/app'

/**
 * Check if a user can view responses for a specific member's form submission
 * Rules:
 * 1. Member can view their own responses (unless form is staff_only)
 * 2. Member's assigned Masool/Musaid can always view
 * 3. Admin/SuperAdmin can always view
 * 4. Other users cannot view
 */
export async function canViewResponses(
  viewerSession: SessionUser,
  respondentItsNo: number,
  viewableByRoles: string | null,
  respondentSubsectorId?: number,
  respondentSectorId?: number
): Promise<boolean> {
  // Admin and SuperAdmin always see everything
  if (viewerSession.role === 'SuperAdmin' || viewerSession.role === 'Admin') {
    return true
  }

  // Member cannot view if form is staff_only
  if (viewableByRoles === 'staff_only' && viewerSession.its_no === respondentItsNo) {
    return false
  }

  // Member can view their own responses if form allows it
  if (viewerSession.its_no === respondentItsNo && viewableByRoles !== 'staff_only') {
    return true
  }

  // Check if viewer is assigned as Musaid to respondent's subsector
  if (viewerSession.role === 'Musaid' && respondentSubsectorId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_subsector')
      .select('subsector_id')
      .eq('its_no', viewerSession.its_no)
      .eq('subsector_id', respondentSubsectorId)
      .maybeSingle()

    if (data) return true
  }

  // Check if viewer is assigned as Masool to respondent's sector
  if (viewerSession.role === 'Masool' && respondentSectorId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_sector')
      .select('sector_id')
      .eq('its_no', viewerSession.its_no)
      .eq('sector_id', respondentSectorId)
      .maybeSingle()

    if (data) return true
  }

  // Default: cannot view
  return false
}
