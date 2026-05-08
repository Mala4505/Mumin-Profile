import { createClient } from '@/lib/supabase/server';

export async function resolveScope(session: any): Promise<number[] | null> {
  if (!session || !session.role) return [-1];

  if (session.role === 'SuperAdmin' || session.role === 'Admin') return null;

  const supabase = await createClient();

  if (session.role === 'Masool') {
    const sectorIds = session.sector_ids;
    if (!Array.isArray(sectorIds) || sectorIds.length === 0) return [-1];
    const { data, error } = await supabase
      .from('subsector')
      .select('subsector_id')
      .in('sector_id', sectorIds);
    if (error || !data) return [-1];
    const ids = data.map((s: any) => s.subsector_id);
    return ids.length > 0 ? ids : [-1];
  }

  if (session.role === 'Musaid') {
    const subsectorIds = session.subsector_ids;
    if (!Array.isArray(subsectorIds) || subsectorIds.length === 0) return [-1];
    return subsectorIds;
  }

  return [-1];
}
