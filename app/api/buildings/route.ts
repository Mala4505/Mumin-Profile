import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { naturalCompare } from '@/lib/utils'

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async function handler(req: NextRequest, ctx) {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    const subsectorIdParam = req.nextUrl.searchParams.get('subsector_id')
    const admin = createAdminClient()

    let subsectorId: number | null = null
    if (subsectorIdParam) {
      subsectorId = parseInt(subsectorIdParam, 10)
      if (isNaN(subsectorId)) {
        return NextResponse.json({ error: 'Invalid subsector_id' }, { status: 400 })
      }
      if (ctx.scopedSubsectorIds !== null && !ctx.scopedSubsectorIds.includes(subsectorId)) {
        return NextResponse.json({ error: 'Forbidden — outside your assigned subsectors' }, { status: 403 })
      }
    }

    let query = admin
      .from('building')
      .select('building_id, building_name, subsector_id, street, landmark, subsector!subsector_id(subsector_name)')
      .order('building_name', { ascending: true })
      .limit(20)

    if (ctx.scopedSubsectorIds !== null) {
      query = query.in('subsector_id', ctx.scopedSubsectorIds)
    }

    if (q.trim()) {
      query = query.ilike('building_name', `%${q.trim()}%`)
    }

    if (subsectorId !== null) {
      query = query.eq('subsector_id', subsectorId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Near-duplicate flagging: group by (subsector_id, normalized name) — the
    // same identity key the CSV importer uses, so buildings that legitimately
    // share a name across different subsectors are never flagged as dupes.
    const normalizedGroups = new Map<string, number[]>()
    const dupKey = (b: { subsector_id: number; building_name: string }) =>
      `${b.subsector_id}::${b.building_name.trim().toLowerCase()}`
    for (const b of data ?? []) {
      const key = dupKey(b)
      const group = normalizedGroups.get(key) ?? []
      group.push(b.building_id)
      normalizedGroups.set(key, group)
    }

    const buildings = (data ?? [])
      .map((b: any) => {
        const group = normalizedGroups.get(dupKey(b)) ?? []
        return {
          building_id: b.building_id,
          building_name: b.building_name,
          subsector_id: b.subsector_id,
          subsector_name: b.subsector?.subsector_name ?? '',
          street: b.street,
          landmark: b.landmark,
          duplicate_building_ids: group.filter((id) => id !== b.building_id),
        }
      })
      .sort((a, b) => naturalCompare(a.building_name, b.building_name))

    return NextResponse.json({ buildings })
  },
)
