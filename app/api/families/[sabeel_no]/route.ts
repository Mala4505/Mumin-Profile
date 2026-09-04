import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types/app'

const STAFF_ROLES: Role[] = ['SuperAdmin', 'Admin', 'Masool', 'Musaid']

/**
 * Resolves a family's current subsector_id (for staff scope checks) and,
 * along the way, the building_name for its current address.
 *   - paci_no set and it resolves to a house/building row → that building's
 *     subsector_id + building_name.
 *   - paci_no null, or the PACI has no matching house row (D4 / stale PACI
 *     per 024's comments) → fall back to any member's mumin.subsector_id,
 *     which the 023 triggers keep correct independent of family.paci_no.
 *     building_name stays null in this fallback (nothing to resolve it from).
 */
async function resolveFamilyLocation(
  admin: ReturnType<typeof createAdminClient>,
  family: { sabeel_no: string; paci_no: string | null },
): Promise<{ subsectorId: number | null; buildingName: string | null }> {
  if (family.paci_no) {
    const { data: houseRow } = await admin
      .from('house')
      .select('building!building_id(building_name, subsector_id)')
      .eq('paci_no', family.paci_no)
      .maybeSingle()
    const building = (houseRow as unknown as {
      building: { building_name: string; subsector_id: number } | null
    } | null)?.building ?? null
    if (building) {
      return { subsectorId: building.subsector_id, buildingName: building.building_name }
    }
  }

  const { data: member } = await admin
    .from('mumin')
    .select('subsector_id')
    .eq('sabeel_no', family.sabeel_no)
    .limit(1)
    .maybeSingle()

  return { subsectorId: member?.subsector_id ?? null, buildingName: null }
}

// GET /api/families/[sabeel_no]
// Lets the move-household UI check whether a sabeel_no is already in use —
// validated up front so "join an existing household" vs. "enter a newly
// issued sabeel" gives a clean UX instead of surfacing a raw unique-violation
// from rpc_move_household.
//
// Access: staff (SuperAdmin/Admin/Masool/Musaid), scoped to their assigned
// subsectors when applicable; or the caller viewing their own family
// (session.sabeel_no === the requested sabeel_no).
export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin'],
  async function handler(
    req: NextRequest,
    ctx,
    routeCtx?: { params: Promise<Record<string, string>> },
  ) {
    const { sabeel_no } = (await routeCtx?.params) ?? {}
    const sabeelNo = (sabeel_no ?? '').trim()
    if (!sabeelNo) {
      return NextResponse.json({ error: 'Invalid sabeel_no' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: family, error: familyErr } = await admin
      .from('family')
      .select('sabeel_no, paci_no, head_its_no')
      .eq('sabeel_no', sabeelNo)
      .maybeSingle()

    if (familyErr) return NextResponse.json({ error: familyErr.message }, { status: 500 })

    const isStaff = STAFF_ROLES.includes(ctx.session.role)
    const isSelf = ctx.session.role === 'Mumin' && ctx.session.sabeel_no === sabeelNo

    if (!isStaff && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!family) {
      // Nothing to scope-check or disclose — this is exactly the "unused
      // sabeel_no" case the caller is validating for.
      return NextResponse.json({ exists: false })
    }

    const { subsectorId, buildingName } = await resolveFamilyLocation(admin, family)

    if (isStaff && ctx.scopedSubsectorIds !== null) {
      if (subsectorId === null || !ctx.scopedSubsectorIds.includes(subsectorId)) {
        return NextResponse.json(
          { error: 'Forbidden — outside your assigned subsectors' },
          { status: 403 },
        )
      }
    }

    let headName: string | null = null
    if (family.head_its_no !== null) {
      const { data: head } = await admin
        .from('mumin')
        .select('name')
        .eq('its_no', family.head_its_no)
        .maybeSingle()
      headName = head?.name ?? null
    }

    const { count: memberCount, error: countErr } = await admin
      .from('mumin')
      .select('its_no', { count: 'exact', head: true })
      .eq('sabeel_no', sabeelNo)

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })

    return NextResponse.json({
      exists: true,
      family: {
        sabeel_no: family.sabeel_no,
        paci_no: family.paci_no,
        subsector_id: subsectorId,
        building_name: buildingName,
        head_its_no: family.head_its_no,
        head_name: headName,
        member_count: memberCount ?? 0,
      },
    })
  },
)
