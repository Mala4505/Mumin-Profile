import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types/app'

const STAFF_ROLES: Role[] = ['SuperAdmin', 'Admin', 'Masool', 'Musaid']

// family_address_history was added in migration 024, after the last
// `supabase gen types` run — lib/types/database.ts has no entry for it, so
// its row shape is hand-typed here rather than pulled from Database[...].
interface FamilyAddressHistoryRow {
  id: number
  from_paci_no: string | null
  to_paci_no: string | null
  effective_date: string
  reason: string | null
  moved_by: number | null
  created_at: string
}

/**
 * Resolves a family's current subsector_id for staff scope checks.
 *   - paci_no set and it resolves to a house/building row → that building's
 *     subsector_id.
 *   - paci_no null, or the PACI has no matching house row → fall back to
 *     any member's mumin.subsector_id (kept correct by the 023 triggers
 *     independent of family.paci_no).
 */
async function resolveFamilySubsector(
  admin: ReturnType<typeof createAdminClient>,
  family: { sabeel_no: string; paci_no: string | null },
): Promise<number | null> {
  if (family.paci_no) {
    const { data: houseRow } = await admin
      .from('house')
      .select('building!building_id(subsector_id)')
      .eq('paci_no', family.paci_no)
      .maybeSingle()
    const building = (houseRow as unknown as {
      building: { subsector_id: number } | null
    } | null)?.building ?? null
    if (building) return building.subsector_id
  }

  const { data: member } = await admin
    .from('mumin')
    .select('subsector_id')
    .eq('sabeel_no', family.sabeel_no)
    .limit(1)
    .maybeSingle()

  return member?.subsector_id ?? null
}

// GET /api/families/[sabeel_no]/address-history
// Feeds the "Moved <date> from <building>" line on a member's profile page.
// Returns up to the 10 most recent moves, newest first.
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
      .select('sabeel_no, paci_no')
      .eq('sabeel_no', sabeelNo)
      .maybeSingle()

    if (familyErr) return NextResponse.json({ error: familyErr.message }, { status: 500 })
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

    const isStaff = STAFF_ROLES.includes(ctx.session.role)
    const isSelf = ctx.session.role === 'Mumin' && ctx.session.sabeel_no === sabeelNo

    if (!isStaff && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (isStaff && ctx.scopedSubsectorIds !== null) {
      const subsectorId = await resolveFamilySubsector(admin, family)
      if (subsectorId === null || !ctx.scopedSubsectorIds.includes(subsectorId)) {
        return NextResponse.json(
          { error: 'Forbidden — outside your assigned subsectors' },
          { status: 403 },
        )
      }
    }

    const { data: rawRows, error: historyErr } = await admin
      // family_address_history isn't in the generated Database type yet
      // (see FamilyAddressHistoryRow above) — cast the table name so the
      // typed client will still let us query it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('family_address_history' as any)
      .select('id, from_paci_no, to_paci_no, effective_date, reason, moved_by, created_at')
      .eq('sabeel_no', sabeelNo)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyErr) return NextResponse.json({ error: historyErr.message }, { status: 500 })

    const rows = (rawRows ?? []) as unknown as FamilyAddressHistoryRow[]

    // Batch-resolve building names for the union of every distinct PACI
    // involved (from + to, across all rows) in one query rather than N+1.
    const paciNos = Array.from(
      new Set(
        rows.flatMap((r) => [r.from_paci_no, r.to_paci_no]).filter((p): p is string => !!p),
      ),
    )

    const buildingNameByPaci = new Map<string, string>()
    if (paciNos.length > 0) {
      const { data: houseRows, error: housesErr } = await admin
        .from('house')
        .select('paci_no, building!building_id(building_name)')
        .in('paci_no', paciNos)

      if (housesErr) return NextResponse.json({ error: housesErr.message }, { status: 500 })

      const typedHouseRows = houseRows as unknown as
        | { paci_no: string; building: { building_name: string } | null }[]
        | null
      for (const h of typedHouseRows ?? []) {
        const name = h.building?.building_name
        if (name) buildingNameByPaci.set(h.paci_no, name)
      }
    }

    // Batch-resolve mover names for the union of every distinct moved_by its_no.
    const moverItsNos = Array.from(
      new Set(rows.map((r) => r.moved_by).filter((n): n is number => n != null)),
    )

    const moverNameByIts = new Map<number, string>()
    if (moverItsNos.length > 0) {
      const { data: movers, error: moversErr } = await admin
        .from('mumin')
        .select('its_no, name')
        .in('its_no', moverItsNos)

      if (moversErr) return NextResponse.json({ error: moversErr.message }, { status: 500 })

      for (const m of movers ?? []) {
        moverNameByIts.set(m.its_no, m.name)
      }
    }

    const history = rows.map((r) => ({
      id: r.id,
      from_paci_no: r.from_paci_no,
      to_paci_no: r.to_paci_no,
      from_building_name: r.from_paci_no ? buildingNameByPaci.get(r.from_paci_no) ?? null : null,
      to_building_name: r.to_paci_no ? buildingNameByPaci.get(r.to_paci_no) ?? null : null,
      effective_date: r.effective_date,
      reason: r.reason,
      moved_by_name: r.moved_by != null ? moverNameByIts.get(r.moved_by) ?? null : null,
      created_at: r.created_at,
    }))

    return NextResponse.json({ history })
  },
)
