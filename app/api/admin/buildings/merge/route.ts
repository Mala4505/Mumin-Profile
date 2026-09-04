import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export const POST = withAuth(
  ['SuperAdmin'],
  async function handler(req: NextRequest, ctx) {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    if (typeof body.source_building_id !== 'number' || typeof body.target_building_id !== 'number') {
      return NextResponse.json(
        { error: 'source_building_id and target_building_id must be numbers' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('rpc_merge_buildings', {
      p_source_building_id: body.source_building_id,
      p_target_building_id: body.target_building_id,
      p_merged_by: Number(ctx.session.its_no),
    })

    if (error) {
      if (error.message.startsWith('CONFLICT:')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, result: data })
  },
)
