import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Fetch total active members
  const { count: totalMembers } = await supabase
    .from('mumin')
    .select('its_no', { count: 'exact', head: true })
    .eq('status', 'active')

  if (!totalMembers || totalMembers === 0) return NextResponse.json([])

  // Fetch profile categories with fields and value counts
  const { data: categories, error: catError } = await supabase
    .from('profile_category')
    .select('name, profile_field!category_id(id)')
    .order('sort_order', { ascending: true })

  if (catError) return NextResponse.json([])

  // For each category, count distinct members who have at least one value for its fields
  const result: Array<{ name: string; value: number }> = []

  for (const cat of (categories ?? []) as Array<{
    name: string
    profile_field: Array<{ id: string }>
  }>) {
    const fieldIds = cat.profile_field.map(f => f.id)
    if (fieldIds.length === 0) continue

    const { data: valuedRows } = await supabase
      .from('profile_value')
      .select('its_no')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in('field_id', fieldIds as any)

    const distinctMembers = new Set((valuedRows ?? []).map((r: { its_no: number }) => r.its_no)).size
    const pct = Math.round((distinctMembers / totalMembers) * 100)
    result.push({ name: cat.name, value: pct })
  }

  return NextResponse.json(result)
}
