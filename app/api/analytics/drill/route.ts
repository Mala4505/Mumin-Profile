import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

/** Whole years elapsed since DOB; null when DOB is missing/invalid. */
function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { scopedSubsectorIds }) => {
    const groupBy = req.nextUrl.searchParams.get('groupBy') ?? 'sector'
    const name = req.nextUrl.searchParams.get('name')
    if (!name) return NextResponse.json({ error: 'Missing name param' }, { status: 400 })

    const supabase = await createClient()

    let query = supabase
      .from('mumin')
      .select('its_no, name, gender, date_of_birth, status, phone, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
      .limit(500)

    if (scopedSubsectorIds !== null) {
      query = query.in('subsector_id', scopedSubsectorIds)
    }

    const { data: muminRows, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type MuminWithJoins = {
      its_no: number
      name: string
      gender: string | null
      date_of_birth: string | null
      status: string | null
      phone: string | null
      subsector_id: number | null
      subsector: { subsector_name: string; sector_id: number; sector: { sector_name: string } } | null
    }

    const filtered = ((muminRows ?? []) as unknown as MuminWithJoins[]).filter(row => {
      if (groupBy === 'subsector') return row.subsector?.subsector_name === name
      return row.subsector?.sector?.sector_name === name
    })

    const itsNos = filtered.map(r => r.its_no)
    const lastUpdateMap = new Map<number, string>()

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
      gender: row.gender ?? null,
      date_of_birth: row.date_of_birth ?? null,
      age: ageFromDob(row.date_of_birth ?? null),
      status: row.status ?? null,
      phone: row.phone ?? null,
      sector_name: row.subsector?.sector?.sector_name ?? null,
      subsector_name: row.subsector?.subsector_name ?? null,
      last_profile_update: lastUpdateMap.get(row.its_no) ?? null,
    }))

    return NextResponse.json(result)
  }
)
