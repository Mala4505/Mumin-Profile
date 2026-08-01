import { createAdminClient } from '@/lib/supabase/admin'
import type { SessionUser } from '@/lib/types/app'

/**
 * Returns allowed subsector_ids for the session user, or null for unrestricted access.
 * - SuperAdmin / Admin → null (no filter)
 * - UmoorCoordinator → null (geo-unrestricted; data restricted by umoor instead — see resolveUmoorScope)
 * - Masool → subsector_ids of all their assigned sectors
 * - Musaid → their directly assigned subsector_ids (already in JWT)
 * - anything else → [-1] (deny all)
 */
export async function resolveScope(session: SessionUser): Promise<number[] | null> {
  if (session.role === 'SuperAdmin' || session.role === 'Admin' || session.role === 'UmoorCoordinator') return null

  if (session.role === 'Masool') {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('subsector')
      .select('subsector_id')
      .in('sector_id', session.sector_ids)
    if (error || !data) return [-1]
    const ids = data.map((s: any) => s.subsector_id as number)
    return ids.length > 0 ? ids : [-1]
  }

  if (session.role === 'Musaid') {
    return session.subsector_ids.length > 0 ? session.subsector_ids : [-1]
  }

  return [-1]
}

/**
 * Returns allowed profile_category ids for the session user, or null for unrestricted access.
 * - SuperAdmin / Admin / Masool / Musaid → null (no umoor filter)
 * - UmoorCoordinator → their assigned umoor category_ids; [-1] (deny all) when none assigned — never null
 */
export function resolveUmoorScope(session: SessionUser): number[] | null {
  if (session.role !== 'UmoorCoordinator') return null
  return session.umoor_ids.length > 0 ? session.umoor_ids : [-1]
}
