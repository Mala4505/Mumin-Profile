import { createClient } from '@/lib/supabase/server';

/**
 * Resolves the scope of data visibility based on user role.
 * Returns null for unrestricted access (Admins) 
 * Returns number[] for restricted access (Subsector IDs)
 */
export async function resolveScope(session: any): Promise<number[] | null> {
  // 1. Safety Check: If no session exists, return an impossible ID to deny access
  if (!session || !session.role) {
    return [-1];
  }

  // 2. Privilege Check: Admins see everything
  if (session.role === 'SuperAdmin' || session.role === 'Admin') {
    return null;
  }

  const supabase = await createClient();

  // 3. Masool Scope: Resolved via Sector -> Subsector relationship
  if (session.role === 'Masool') {
    const sectorIds = session.sector_ids;

    // Check if sector_ids is an array and has items
    if (!Array.isArray(sectorIds) || sectorIds.length === 0) {
      return [-1];
    }

    const { data, error } = await supabase
      .from('subsector')
      .select('subsector_id')
      .in('sector_id', sectorIds);

    if (error || !data) {
      console.error('Error resolving Masool scope:', error);
      return [-1];
    }

    const ids = data.map((s: any) => s.subsector_id);
    return ids.length > 0 ? ids : [-1];
  }

  // 4. Musaid Scope: Direct mapping to assigned subsectors
  if (session.role === 'Musaid') {
    const subsectorIds = session.subsector_ids;

    if (!Array.isArray(subsectorIds) || subsectorIds.length === 0) {
      return [-1];
    }

    return subsectorIds;
  }

  // 5. Default Fallback: Restrict all data for unknown roles
  return [-1];
}