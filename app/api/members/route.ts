import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/members?sabeel_no=XXX&limit=50
 *
 * Returns members belonging to a given sabeel_no.
 * Used by the Request Edit modal to populate the member picker.
 */
export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'],
  async function handler(req: NextRequest, { session, scopedSubsectorIds }) {
    const { searchParams } = req.nextUrl
    const sabeelNo = searchParams.get('sabeel_no')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)

    if (!sabeelNo) {
      return NextResponse.json({ error: 'sabeel_no is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── Scope check: verify the family belongs to the caller's sector/subsector ──
    // SuperAdmin and Admin have null scopedSubsectorIds → unrestricted
    if (scopedSubsectorIds !== null) {
      const { data: familyMember } = await admin
        .from('mumin')
        .select('subsector_id, subsector(sector_id)')
        .eq('sabeel_no', sabeelNo)
        .limit(1)
        .maybeSingle()

      if (!familyMember) {
        return NextResponse.json({ error: 'Family not found' }, { status: 404 })
      }

      const subsectorId = (familyMember as any).subsector_id as number
      const sectorId = (familyMember as any).subsector?.sector_id as number

      if (session.role === 'Musaid') {
        if (!session.subsector_ids.includes(subsectorId)) {
          return NextResponse.json({ error: 'Family not in your assigned subsectors' }, { status: 403 })
        }
      } else {
        // Masool — scope by sector
        if (!session.sector_ids.includes(sectorId)) {
          return NextResponse.json({ error: 'Family not in your assigned sectors' }, { status: 403 })
        }
      }
    }

    const { data, error } = await admin
      .from('mumin')
      .select(
        'its_no, name, gender, date_of_birth, balig_status, phone, alternate_phone, email, status, notes'
      )
      .eq('sabeel_no', sabeelNo)
      .order('name', { ascending: true })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ members: data ?? [] })
  }
)
