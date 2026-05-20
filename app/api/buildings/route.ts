import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export const GET = withAuth(
  ['SuperAdmin'],
  async function handler(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    const admin = createAdminClient()

    let query = admin
      .from('building')
      .select('building_id, building_name, subsector_id, subsector!subsector_id(subsector_name)')
      .order('building_name', { ascending: true })
      .limit(20)

    if (q.trim()) {
      query = query.ilike('building_name', `%${q.trim()}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const buildings = (data ?? []).map((b: any) => ({
      building_id: b.building_id,
      building_name: b.building_name,
      subsector_id: b.subsector_id,
      subsector_name: b.subsector?.subsector_name ?? '',
    }))

    return NextResponse.json({ buildings })
  },
)
