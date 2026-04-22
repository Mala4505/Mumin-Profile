import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface SubsectorCompletion {
  subsector_id: number
  name: string
  total: number
  responded: number
  pct: number
}

export interface SectorCompletion {
  sector_id: number
  name: string
  total: number
  responded: number
  pct: number
  subsectors: SubsectorCompletion[]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formId = req.nextUrl.searchParams.get('form_id')
  if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })

  const supabase = await createClient()

  const [{ data: allMembers }, { data: respondedRows }] = await Promise.all([
    supabase
      .from('mumin')
      .select('its_no, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
      .eq('status', 'active'),
    supabase
      .from('form_responses')
      .select('filled_for')
      .eq('form_id', formId),
  ])

  const respondedSet = new Set((respondedRows ?? []).map((r: any) => r.filled_for as number))

  const sectorMap = new Map<number, SectorCompletion>()
  const subsectorMap = new Map<number, SubsectorCompletion>()

  for (const m of (allMembers ?? []) as any[]) {
    const sub = m.subsector
    if (!sub) continue
    const sec = sub.sector
    if (!sec) continue

    const sectorId: number = sub.sector_id
    const subsectorId: number = m.subsector_id

    if (!sectorMap.has(sectorId)) {
      sectorMap.set(sectorId, {
        sector_id: sectorId,
        name: sec.sector_name,
        total: 0,
        responded: 0,
        pct: 0,
        subsectors: [],
      })
    }

    if (!subsectorMap.has(subsectorId)) {
      const newSub: SubsectorCompletion = {
        subsector_id: subsectorId,
        name: sub.subsector_name,
        total: 0,
        responded: 0,
        pct: 0,
      }
      subsectorMap.set(subsectorId, newSub)
      sectorMap.get(sectorId)!.subsectors.push(newSub)
    }

    const secAgg = sectorMap.get(sectorId)!
    const subAgg = subsectorMap.get(subsectorId)!
    const responded = respondedSet.has(m.its_no)

    secAgg.total++
    subAgg.total++
    if (responded) {
      secAgg.responded++
      subAgg.responded++
    }
  }

  const result: SectorCompletion[] = Array.from(sectorMap.values())
    .map(s => ({
      ...s,
      pct: s.total > 0 ? Math.round((s.responded / s.total) * 100) : 0,
      subsectors: s.subsectors
        .map(sub => ({
          ...sub,
          pct: sub.total > 0 ? Math.round((sub.responded / sub.total) * 100) : 0,
        }))
        .sort((a, b) => a.pct - b.pct),
    }))
    .sort((a, b) => a.pct - b.pct)

  return NextResponse.json(result)
}
