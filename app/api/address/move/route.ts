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

    if (body.member_its_nos == null) {
      if (!Array.isArray(body.sources) || body.sources.length === 0) {
        return NextResponse.json({ error: 'sources must be a non-empty array' }, { status: 400 })
      }
    } else {
      if (!Array.isArray(body.member_its_nos) || body.member_its_nos.length === 0 ||
          !body.member_its_nos.every((n: unknown) => typeof n === 'number')) {
        return NextResponse.json({ error: 'member_its_nos must be a non-empty array of numbers' }, { status: 400 })
      }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('rpc_move_household', {
      p_payload: body,
      p_moved_by: Number(ctx.session.its_no),
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
