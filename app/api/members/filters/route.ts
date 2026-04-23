import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sectorId = req.nextUrl.searchParams.get('sector_id')
  const supabase = await createClient()
  const admin = createAdminClient()

  // ── Sectors ────────────────────────────────────────────────────────────────
  let sectorsQuery = supabase
    .from('sector')
    .select('sector_id, sector_name')
    .order('sector_id', { ascending: true })

  if (session.role === 'Masool' && session.sector_ids?.length) {
    sectorsQuery = sectorsQuery.in('sector_id', session.sector_ids)
  }
  const { data: sectors } = await sectorsQuery

  // ── Subsectors ─────────────────────────────────────────────────────────────
  let subsectorQuery = admin
    .from('subsector')
    .select('subsector_id, subsector_name, sector_id')
    .order('subsector_id', { ascending: true })
    .not('subsector_name', 'eq', '0')
    .not('subsector_name', 'eq', '')

  if (session.role === 'Masool' && session.sector_ids?.length)
    subsectorQuery = subsectorQuery.in('sector_id', session.sector_ids)
  if (session.role === 'Musaid' && session.subsector_ids?.length)
    subsectorQuery = subsectorQuery.in('subsector_id', session.subsector_ids)
  if (sectorId)
    subsectorQuery = subsectorQuery.eq('sector_id', Number(sectorId))

  const { data: subsectorRows } = await subsectorQuery
  const allSubsectorIds = (subsectorRows ?? []).map((s: any) => s.subsector_id as number)

  // ── Musaid assignments ─────────────────────────────────────────────────────
  const musaidNameMap = new Map<number, string>()
  // subsector_id → musaid names[]
  const subsectorMusaidMap = new Map<number, string[]>()

  if (allSubsectorIds.length > 0) {
    const { data: uSubRows } = await admin
      .from('user_subsector')
      .select('its_no, subsector_id')
      .in('subsector_id', allSubsectorIds)

    const musaidItsNos = [...new Set((uSubRows ?? []).map((r: any) => r.its_no as number))]

    if (musaidItsNos.length > 0) {
      const { data: muminRows } = await admin
        .from('mumin')
        .select('its_no, name')
        .in('its_no', musaidItsNos)
      for (const m of (muminRows ?? []) as any[])
        musaidNameMap.set(m.its_no, m.name)
    }

    for (const r of (uSubRows ?? []) as any[]) {
      const name = musaidNameMap.get(r.its_no)
      if (!name) continue
      if (!subsectorMusaidMap.has(r.subsector_id))
        subsectorMusaidMap.set(r.subsector_id, [])
      subsectorMusaidMap.get(r.subsector_id)!.push(name)
    }
  }

  // ── Expand: one option per musaid (or one with null if unassigned) ─────────
  type SubsectorOption = {
    subsector_id: number
    subsector_name: string
    sector_id: number
    musaid_name: string | null
  }

  const subsectors: SubsectorOption[] = []
  for (const ss of (subsectorRows ?? []) as any[]) {
    const musaids = subsectorMusaidMap.get(ss.subsector_id)
    if (musaids && musaids.length > 0) {
      for (const name of musaids) {
        subsectors.push({
          subsector_id: ss.subsector_id,
          subsector_name: ss.subsector_name,
          sector_id: ss.sector_id,
          musaid_name: name,
        })
      }
    } else {
      subsectors.push({
        subsector_id: ss.subsector_id,
        subsector_name: ss.subsector_name,
        sector_id: ss.sector_id,
        musaid_name: null,
      })
    }
  }

  // ── Musaids dropdown list (deduplicated, sorted by name) ───────────────────
  let musaidsQuery = admin
    .from('user_subsector')
    .select('its_no, mumin!inner(name)')

  if (session.role === 'Masool' && session.sector_ids?.length && allSubsectorIds.length > 0)
    musaidsQuery = musaidsQuery.in('subsector_id', allSubsectorIds)
  else if (session.role === 'Musaid' && session.subsector_ids?.length)
    musaidsQuery = musaidsQuery.in('subsector_id', session.subsector_ids)

  const { data: musaidRows } = await musaidsQuery
  const musaidMap = new Map<number, string>()
  for (const row of (musaidRows ?? []) as any[]) {
    if (!musaidMap.has(row.its_no))
      musaidMap.set(row.its_no, row.mumin?.name ?? '')
  }
  const musaids = Array.from(musaidMap.entries())
    .map(([its_no, name]) => ({ its_no, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ sectors: sectors ?? [], subsectors, musaids })
}