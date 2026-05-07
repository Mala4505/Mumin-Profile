// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'

// export async function GET(req: NextRequest) {
//   const session = await getSession()
//   if (!session || session.role !== 'SuperAdmin') {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const groupBy = req.nextUrl.searchParams.get('groupBy') ?? 'sector'
//   const supabase = await createClient()

//   // Fetch all mumin with their subsector join
//   const { data: muminRows, error } = await supabase
//     .from('mumin')
//     .select('subsector_id, subsector(subsector_name, sector_id, sector(sector_name))')
//     .eq('status', 'active')

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//   // Aggregate by sector or subsector
//   const counts = new Map<string, number>()

//   for (const row of (muminRows ?? []) as unknown as Array<{
//     subsector_id: number | null
//     subsector: { subsector_name: string; sector_id: number; sector: { sector_name: string } } | null
//   }>) {
//     let key: string | null = null
//     if (groupBy === 'subsector') {
//       key = row.subsector?.subsector_name ?? null
//     } else {
//       key = row.subsector?.sector?.sector_name ?? null
//     }
//     if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
//   }

//   const result = Array.from(counts.entries())
//     .map(([name, count]) => ({ name, count }))
//     .sort((a, b) => b.count - a.count)

//   return NextResponse.json(result)
// }

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  
  // ─── CHANGE START ──────────────────────────────────────────────────────────
  // Define all roles allowed to see the analytics
  const allowedRoles = ['SuperAdmin', 'Admin', 'Masool', 'Musaid']

  if (!session || !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ─── CHANGE END ────────────────────────────────────────────────────────────

  const groupBy = req.nextUrl.searchParams.get('groupBy') ?? 'sector'
  const supabase = await createClient()

  // Fetch all mumin with their subsector join
  const { data: muminRows, error } = await supabase
    .from('mumin')
    .select('subsector_id, subsector(subsector_name, sector_id, sector(sector_name))')
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by sector or subsector
  const counts = new Map<string, number>()

  for (const row of (muminRows ?? []) as unknown as Array<{
    subsector_id: number | null
    subsector: { subsector_name: string; sector_id: number; sector: { sector_name: string } } | null
  }>) {
    let key: string | null = null
    if (groupBy === 'subsector') {
      key = row.subsector?.subsector_name ?? null
    } else {
      key = row.subsector?.sector?.sector_name ?? null
    }
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const result = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(result)
}