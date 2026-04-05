import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getJwtMeta(accessToken: string): { role?: string; its_no?: number; sector_ids?: number[]; subsector_ids?: number[] } {
  try {
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.app_metadata ?? {}
  } catch { return {} }
}

// GET — return requests submitted by the calling user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = getJwtMeta(session.access_token)
  if (!['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(meta.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // SuperAdmin sees all; others see their own
  let query = admin
    .from('change_request')
    .select('id, sabeel_no, remark, status, created_at, requester:requested_by(its_no, name)')
    .order('created_at', { ascending: false })

  if (meta.role !== 'SuperAdmin') {
    query = query.eq('requested_by', meta.its_no!)
  }

  const { data: rawData, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const requests = rawData ?? []

  if (requests.length === 0) return NextResponse.json(requests)

  // Enrich with HoF data
  const sabeelNos = [...new Set(requests.map((r: any) => r.sabeel_no as string))]
  const { data: familyRows } = await admin
    .from('family')
    .select('sabeel_no, head_its_no')
    .in('sabeel_no', sabeelNos)

  const sabeelToHeadIts = new Map<string, number>()
  for (const f of (familyRows ?? []) as any[]) {
    if (f.head_its_no) sabeelToHeadIts.set(f.sabeel_no, f.head_its_no)
  }

  const headItsNos = [...new Set(Array.from(sabeelToHeadIts.values()))]
  const hofMuminMap = new Map<number, { its_no: number; name: string }>()
  if (headItsNos.length > 0) {
    const { data: muminRows } = await admin
      .from('mumin')
      .select('its_no, name')
      .in('its_no', headItsNos)
    for (const m of (muminRows ?? []) as any[]) {
      hofMuminMap.set(m.its_no, m)
    }
  }

  const enriched = requests.map((r: any) => {
    const headIts = sabeelToHeadIts.get(r.sabeel_no)
    const hofMumin = headIts ? hofMuminMap.get(headIts) : null
    return { ...r, hof: hofMumin ? { head_its_no: headIts, mumin: hofMumin } : null }
  })

  return NextResponse.json(enriched)
}

// POST — create a new change request
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = getJwtMeta(session.access_token)
  if (!['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(meta.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as { sabeel_no: string; remark: string }
  if (!body.sabeel_no || !body.remark?.trim()) {
    return NextResponse.json({ error: 'sabeel_no and remark are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Validate the sabeel is within the caller's scope (skip for SuperAdmin)
  if (meta.role !== 'SuperAdmin') {
    // Get the subsector_id for any member of this sabeel
    const { data: familyMember } = await admin
      .from('mumin')
      .select('subsector_id, subsector(sector_id)')
      .eq('sabeel_no', body.sabeel_no)
      .limit(1)
      .maybeSingle()

    if (!familyMember) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    const subsectorId = (familyMember as any).subsector_id
    const sectorId = (familyMember as any).subsector?.sector_id

    const sectorIds: number[] = meta.sector_ids ?? []
    const subsectorIds: number[] = meta.subsector_ids ?? []

    if (meta.role === 'Musaid') {
      if (!subsectorIds.includes(subsectorId)) {
        return NextResponse.json({ error: 'Family not in your assigned subsectors' }, { status: 403 })
      }
    } else {
      // Admin / Masool — scope by sector
      if (!sectorIds.includes(sectorId)) {
        return NextResponse.json({ error: 'Family not in your assigned sectors' }, { status: 403 })
      }
    }
  }

  const { data, error } = await admin
    .from('change_request')
    .insert({ requested_by: meta.its_no!, sabeel_no: body.sabeel_no, remark: body.remark.trim() })
    .select('id, sabeel_no, remark, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
