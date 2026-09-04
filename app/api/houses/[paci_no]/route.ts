import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/houses/[paci_no]
//
// Resolves a typed PACI number directly to its house/building record. Phase 2
// built /api/buildings (search by name) and /api/buildings/[id]/flats (flats
// within a *known* building) but nothing resolved a bare PACI string to a
// house row — the move-household panel's destination search needs exactly
// that for its "all-digits input = PACI lookup" branch (and reuses this same
// route to resolve a *source* family's current address, for the from→to diff
// and scope-change warning).
//
// Shape mirrors /api/families/[sabeel_no]: `exists` discriminates a found vs.
// not-found PACI, the latter being the expected/common case when an operator
// is registering an address the community hasn't logged before.
//
// Access: same staff roles as /api/buildings*, scoped to assigned subsectors.
export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async function handler(
    req: NextRequest,
    ctx,
    routeCtx?: { params: Promise<Record<string, string>> },
  ) {
    const { paci_no } = (await routeCtx?.params) ?? {}
    const paciNo = (paci_no ?? '').trim()
    if (!paciNo) {
      return NextResponse.json({ error: 'Invalid paci_no' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: house, error: houseErr } = await admin
      .from('house')
      .select('paci_no, building_id, floor_no, flat_no')
      .eq('paci_no', paciNo)
      .maybeSingle()

    if (houseErr) return NextResponse.json({ error: houseErr.message }, { status: 500 })
    if (!house) {
      return NextResponse.json({ exists: false })
    }

    const { data: building, error: buildingErr } = await admin
      .from('building')
      .select('building_name, subsector_id, street, landmark, subsector!subsector_id(subsector_name)')
      .eq('building_id', house.building_id)
      .maybeSingle()

    if (buildingErr) return NextResponse.json({ error: buildingErr.message }, { status: 500 })
    if (!building) {
      // Orphaned house row (its building was deleted out from under it) —
      // nothing coherent to resolve, treat like the PACI isn't on file.
      return NextResponse.json({ exists: false })
    }

    if (
      ctx.scopedSubsectorIds !== null &&
      !ctx.scopedSubsectorIds.includes(building.subsector_id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden — outside your assigned subsectors' },
        { status: 403 },
      )
    }

    const { count: occupantFamilyCount, error: countErr } = await admin
      .from('family')
      .select('sabeel_no', { count: 'exact', head: true })
      .eq('paci_no', paciNo)

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })

    const subsectorName = (building as unknown as { subsector: { subsector_name: string } | null })
      .subsector?.subsector_name ?? ''

    return NextResponse.json({
      exists: true,
      house: {
        paci_no: house.paci_no,
        building_id: house.building_id,
        building_name: building.building_name,
        subsector_id: building.subsector_id,
        subsector_name: subsectorName,
        floor_no: house.floor_no,
        flat_no: house.flat_no,
        street: building.street,
        landmark: building.landmark,
        occupant_family_count: occupantFamilyCount ?? 0,
      },
    })
  },
)
