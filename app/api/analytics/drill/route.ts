import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const groupBy = req.nextUrl.searchParams.get('groupBy') ?? 'sector'
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Missing name param' }, { status: 400 })

  const supabase = await createClient()

  // Fetch members with their subsector and sector names, plus last profile update
  const { data: muminRows, error } = await supabase
    .from('mumin')
    .select('its_no, name, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
    .eq('status', 'active')
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type MuminWithJoins = {
    its_no: number
    name: string
    subsector_id: number | null
    subsector: { subsector_name: string; sector_id: number; sector: { sector_name: string } } | null
  }

  // Filter to the selected group
  const filtered = ((muminRows ?? []) as unknown as MuminWithJoins[]).filter(row => {
    if (groupBy === 'subsector') return row.subsector?.subsector_name === name
    return row.subsector?.sector?.sector_name === name
  })

  // Fetch last profile update dates for these members
  const itsNos = filtered.map(r => r.its_no)
  let lastUpdateMap = new Map<number, string>()

  if (itsNos.length > 0) {
    const { data: pvRows } = await supabase
      .from('profile_value')
      .select('its_no, updated_at')
      .in('its_no', itsNos)

    for (const pv of (pvRows ?? []) as Array<{ its_no: number; updated_at: string }>) {
      const existing = lastUpdateMap.get(pv.its_no)
      if (!existing || pv.updated_at > existing) {
        lastUpdateMap.set(pv.its_no, pv.updated_at)
      }
    }
  }

  const result = filtered.map(row => ({
    its_no: row.its_no,
    name: row.name,
    sector_name: row.subsector?.sector?.sector_name ?? null,
    subsector_name: row.subsector?.subsector_name ?? null,
    last_profile_update: lastUpdateMap.get(row.its_no) ?? null,
  }))

  return NextResponse.json(result)
}
