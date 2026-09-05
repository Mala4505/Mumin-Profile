import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { naturalCompare } from '@/lib/utils'

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async function handler(
    req: NextRequest,
    ctx,
    routeCtx?: { params: Promise<Record<string, string>> },
  ) {
    const { id } = (await routeCtx?.params) ?? {}
    const buildingId = parseInt(id ?? '', 10)
    if (isNaN(buildingId)) {
      return NextResponse.json({ error: 'Invalid building id' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: building, error: buildingErr } = await admin
      .from('building')
      .select('building_id, building_name, subsector_id')
      .eq('building_id', buildingId)
      .maybeSingle()

    if (buildingErr) return NextResponse.json({ error: buildingErr.message }, { status: 500 })
    if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 })

    if (ctx.scopedSubsectorIds !== null && !ctx.scopedSubsectorIds.includes(building.subsector_id)) {
      return NextResponse.json({ error: 'Forbidden — outside your assigned subsectors' }, { status: 403 })
    }

    const { data: houses, error: housesErr } = await admin
      .from('house')
      .select('paci_no, floor_no, flat_no')
      .eq('building_id', buildingId)

    if (housesErr) return NextResponse.json({ error: housesErr.message }, { status: 500 })

    const paciNos = (houses ?? []).map((h) => h.paci_no)

    const occupancyByPaci = new Map<string, number>()
    if (paciNos.length > 0) {
      const { data: families, error: familiesErr } = await admin
        .from('family')
        .select('paci_no, sabeel_no')
        .in('paci_no', paciNos)

      if (familiesErr) return NextResponse.json({ error: familiesErr.message }, { status: 500 })

      for (const f of families ?? []) {
        if (!f.paci_no) continue
        occupancyByPaci.set(f.paci_no, (occupancyByPaci.get(f.paci_no) ?? 0) + 1)
      }
    }

    const flats = (houses ?? [])
      .map((h) => ({
        paci_no: h.paci_no,
        floor_no: h.floor_no,
        flat_no: h.flat_no,
        occupancy: occupancyByPaci.get(h.paci_no) ?? 0,
      }))
      .sort(
        (a, b) => naturalCompare(a.floor_no, b.floor_no) || naturalCompare(a.flat_no, b.flat_no),
      )

    return NextResponse.json({
      building: {
        building_id: building.building_id,
        building_name: building.building_name,
        subsector_id: building.subsector_id,
      },
      flats,
    })
  },
)
