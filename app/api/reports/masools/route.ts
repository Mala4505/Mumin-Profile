import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  let query = admin
    .from('user_sector')
    .select('its_no, mumin!inner(name, role)')
    .eq('mumin.role', 'Masool')

  if (session.role === 'Masool' && session.sector_ids?.length) {
    query = query.in('sector_id', session.sector_ids)
  }

  const { data } = await query

  const masoolMap = new Map<number, string>()
  for (const row of (data ?? []) as any[]) {
    if (!masoolMap.has(row.its_no)) masoolMap.set(row.its_no, row.mumin?.name ?? '')
  }

  const masools = Array.from(masoolMap.entries())
    .map(([its_no, name]) => ({ its_no, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ masools })
}
