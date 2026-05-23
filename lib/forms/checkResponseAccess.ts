import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types/app'

/**
 * Check if a user can view responses for a specific member's form submission.
 *
 * Two-layer gate:
 * 1. If responseViewerRoles is non-null, use granular role list (new mode).
 * 2. If responseViewerRoles is null, fall back to legacy viewableByRoles logic.
 *
 * Admin/SuperAdmin always return true regardless of settings.
 */
export async function canViewResponses(
  viewerSession: SessionUser,
  respondentItsNo: number,
  viewableByRoles: string | null,
  responseViewerRoles: string[] | null,
  respondentSubsectorId?: number,
  respondentSectorId?: number
): Promise<boolean> {
  // Admin and SuperAdmin always see everything
  if (viewerSession.role === 'SuperAdmin' || viewerSession.role === 'Admin') {
    return true
  }

  // Granular mode: use responseViewerRoles list
  if (responseViewerRoles !== null) {
    return responseViewerRoles.includes(viewerSession.role)
  }

  // Legacy mode: use viewableByRoles
  if (viewableByRoles === 'staff_only' && viewerSession.its_no === respondentItsNo) {
    return false
  }

  if (viewerSession.its_no === respondentItsNo && viewableByRoles !== 'staff_only') {
    return true
  }

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

  return false
}
