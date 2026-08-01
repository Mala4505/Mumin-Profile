import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['Masool', 'Musaid'] as const
type ValidRole = (typeof VALID_ROLES)[number]

function isValidRole(role: string | null): role is ValidRole {
  return !!role && (VALID_ROLES as readonly string[]).includes(role)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = request.nextUrl.searchParams.get('role')
  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: authAccounts } = await admin
    .from('auth_accounts')
    .select('its_no')
    .eq('role', role)

  const itsNos = (authAccounts ?? []).map((r) => r.its_no)

  if (itsNos.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const { data: mumin } = await admin
    .from('mumin')
    .select('its_no, name')
    .in('its_no', itsNos)

  const members = (mumin ?? []).map((m) => ({ its_no: m.its_no, name: m.name }))

  return NextResponse.json({ members })
}
