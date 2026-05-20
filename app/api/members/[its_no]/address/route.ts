import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ its_no: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden — SuperAdmin only' }, { status: 403 })
  }

  const { its_no } = await params
  const targetItsNo = parseInt(its_no, 10)
  if (isNaN(targetItsNo)) {
    return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })
  }

  const body = await req.json() as {
    building_name: string
    subsector_id: number
    floor_no?: string
    flat_no?: string
  }

  if (!body.building_name?.trim()) return NextResponse.json({ error: 'building_name is required' }, { status: 400 })
  if (!body.subsector_id) return NextResponse.json({ error: 'subsector_id is required' }, { status: 400 })

  const admin = createAdminClient()

  // Load mumin to get sabeel_no
  const { data: mumin } = await admin
    .from('mumin')
    .select('sabeel_no, subsector_id')
    .eq('its_no', targetItsNo)
    .maybeSingle()

  if (!mumin) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // house is linked via family.paci_no = house.paci_no (not house.sabeel_no)
  const { data: family } = await admin
    .from('family')
    .select('paci_no')
    .eq('sabeel_no', mumin.sabeel_no)
    .maybeSingle()

  if (!family?.paci_no) return NextResponse.json({ error: 'No house record found for this member' }, { status: 404 })

  // Load current house for activity log
  const { data: currentHouse } = await admin
    .from('house')
    .select('paci_no, building_id, floor_no, flat_no')
    .eq('paci_no', family.paci_no)
    .maybeSingle()

  if (!currentHouse) return NextResponse.json({ error: 'No house record found for this member' }, { status: 404 })

  // Load old building name for activity log
  const { data: oldBuilding } = await admin
    .from('building')
    .select('building_name, subsector_id')
    .eq('building_id', currentHouse.building_id)
    .maybeSingle()

  // Step 1: Resolve building — find existing or create new
  const buildingName = body.building_name.trim()
  let buildingId: number

  const { data: existingBuilding } = await admin
    .from('building')
    .select('building_id')
    .eq('building_name', buildingName)
    .eq('subsector_id', body.subsector_id)
    .maybeSingle()

  if (existingBuilding) {
    buildingId = existingBuilding.building_id
  } else {
    const { data: newBuilding, error: buildingErr } = await admin
      .from('building')
      .insert({ building_name: buildingName, subsector_id: body.subsector_id })
      .select('building_id')
      .single()

    if (buildingErr || !newBuilding) {
      return NextResponse.json({ error: buildingErr?.message ?? 'Failed to create building' }, { status: 500 })
    }
    buildingId = newBuilding.building_id
  }

  // Step 2: Update house record (identified by paci_no via family)
  // The existing trigger trg_house_sync_subsector will auto-update mumin.subsector_id
  // when building_id changes, so no explicit mumin update is needed.
  const { error: houseErr } = await admin
    .from('house')
    .update({
      building_id: buildingId,
      floor_no: body.floor_no?.trim() || null,
      flat_no: body.flat_no?.trim() || null,
    })
    .eq('paci_no', family.paci_no)

  if (houseErr) return NextResponse.json({ error: houseErr.message }, { status: 500 })

  // Activity log
  try {
    await admin.from('activity_log').insert({
      performed_by_its: session.its_no,
      action: 'edit_member_address',
      entity_type: 'mumin',
      entity_id: String(targetItsNo),
      metadata: {
        changes: [
          { field: 'building_name', old_value: oldBuilding?.building_name ?? '', new_value: buildingName },
          { field: 'floor_no', old_value: currentHouse.floor_no ?? '', new_value: body.floor_no ?? '' },
          { field: 'flat_no', old_value: currentHouse.flat_no ?? '', new_value: body.flat_no ?? '' },
          { field: 'subsector_id', old_value: String(oldBuilding?.subsector_id ?? ''), new_value: String(body.subsector_id) },
        ],
      },
    } as any)
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true })
}
