import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest, { scopedSubsectorIds }) => {
    const supabase = await createClient()

    let muminQuery = supabase
      .from('mumin')
      .select('its_no', { count: 'exact', head: true })
      .eq('status', 'active')

    if (scopedSubsectorIds !== null) {
      muminQuery = muminQuery.in('subsector_id', scopedSubsectorIds)
    }

    const { count: totalMembers } = await muminQuery

    if (!totalMembers || totalMembers === 0) return NextResponse.json([])

    const { data: categories, error: catError } = await supabase
      .from('profile_category')
      .select('name, profile_field(id)')
      .order('sort_order', { ascending: true })

    if (catError) return NextResponse.json([])

    const result: Array<{ name: string; value: number }> = []

    for (const cat of (categories ?? []) as unknown as Array<{
      name: string
      profile_field: Array<{ id: string }>
    }>) {
      const fieldIds = cat.profile_field.map(f => f.id)
      if (fieldIds.length === 0) continue

      const { data: valuedRows } = await supabase
        .from('profile_value')
        .select('its_no')
        .in('field_id', fieldIds as any)

      const distinctMembers = new Set((valuedRows ?? []).map((r: { its_no: number }) => r.its_no)).size
      const pct = Math.round((distinctMembers / totalMembers) * 100)
      result.push({ name: cat.name, value: pct })
    }

    return NextResponse.json(result)
  }
)
