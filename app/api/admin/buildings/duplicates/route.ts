import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export interface DuplicateBuildingRow {
  building_id: number
  building_name: string
  street: string | null
  landmark: string | null
  house_count: number
}

export interface DuplicateBuildingGroup {
  key: string
  subsector_id: number
  subsector_name: string
  buildings: DuplicateBuildingRow[]
}

/**
 * Shared by GET (below) and the admin/buildings server page — the page calls
 * this directly via its own createAdminClient() rather than round-tripping
 * through this route.
 *
 * Groups ALL buildings (no limit, no search query — unlike GET /api/buildings)
 * by the same normalized identity key that route uses: (subsector_id,
 * lower(trim(building_name))). Only groups with more than one building are
 * returned — that's the D2 duplicate-building backlog.
 */
export async function getDuplicateBuildingGroups(
  admin: SupabaseClient<Database>,
): Promise<{ groups: DuplicateBuildingGroup[] } | { error: string }> {
  const [buildingsResult, houseCountsResult] = await Promise.all([
    admin
      .from('building')
      .select('building_id, building_name, subsector_id, street, landmark, subsector!subsector_id(subsector_name)')
      .order('subsector_id', { ascending: true })
      .order('building_name', { ascending: true }),
    admin.from('house').select('building_id'),
  ])

  if (buildingsResult.error) return { error: buildingsResult.error.message }
  if (houseCountsResult.error) return { error: houseCountsResult.error.message }

  // house_count per building_id, computed in-memory (avoids a GROUP BY RPC
  // for what's a low-traffic SuperAdmin utility).
  const houseCountMap = new Map<number, number>()
  for (const h of (houseCountsResult.data ?? []) as { building_id: number }[]) {
    houseCountMap.set(h.building_id, (houseCountMap.get(h.building_id) ?? 0) + 1)
  }

  // Same normalized identity key as GET /api/buildings — (subsector_id,
  // lower(trim(building_name))) — so the two tools never disagree about
  // what counts as a duplicate.
  const dupKey = (b: { subsector_id: number; building_name: string }) =>
    `${b.subsector_id}::${b.building_name.trim().toLowerCase()}`

  const groups = new Map<string, DuplicateBuildingGroup>()

  for (const b of (buildingsResult.data ?? []) as any[]) {
    const key = dupKey(b)
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        subsector_id: b.subsector_id,
        subsector_name: b.subsector?.subsector_name ?? '',
        buildings: [],
      }
      groups.set(key, group)
    }
    group.buildings.push({
      building_id: b.building_id,
      building_name: b.building_name,
      street: b.street,
      landmark: b.landmark,
      house_count: houseCountMap.get(b.building_id) ?? 0,
    })
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.buildings.length > 1)

  return { groups: duplicateGroups }
}

export const GET = withAuth(
  ['SuperAdmin'],
  async function handler(_req: NextRequest, _ctx) {
    const admin = createAdminClient()
    const result = await getDuplicateBuildingGroups(admin)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result)
  },
)
