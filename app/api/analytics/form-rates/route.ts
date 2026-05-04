import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface FormRate {
  id: string
  title: string
  responses: number
  total: number
  pct: number
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: forms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  if (!forms || forms.length === 0) return NextResponse.json([])

  // Resolve scope and member total
  let memberTotal: number
  let itsNoFilter: number[] | null = null // null = no filter (SuperAdmin)

  if (session.role !== 'SuperAdmin') {
    // Resolve subsector IDs for this role
    let assignedSubsectorIds: any[] = []

    if (session.role === 'Musaid') {
      assignedSubsectorIds = session.subsector_ids ?? []
    } else {
      // Admin or Masool: resolve via sector_ids
      const sectorIds = session.sector_ids ?? []
      if (sectorIds.length > 0) {
        const { data: subsectorRows } = await supabase
          .from('subsector')
          .select('id')
          .in('sector_id', sectorIds)
        assignedSubsectorIds = (subsectorRows ?? []).map((s: any) => s.id)
      }
    }

    if (assignedSubsectorIds.length === 0) {
      return NextResponse.json(
        (forms as Array<{ id: string; title: string }>).map(f => ({
          id: f.id, title: f.title, responses: 0, total: 0, pct: 0,
        }))
      )
    }

    const { data: scopedMembers } = await supabase
      .from('mumin')
      .select('its_no')
      .in('subsector_id', assignedSubsectorIds)
      .eq('status', 'active')

    itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
    memberTotal = itsNoFilter.length
  } else {
    const { count } = await supabase
      .from('mumin')
      .select('its_no', { count: 'exact', head: true })
      .eq('status', 'active')
    memberTotal = count ?? 0
  }

  const rates = await Promise.all(
    (forms as Array<{ id: string; title: string }>).map(async (form) => {
      let query = supabase
        .from('form_responses')
        .select('filled_for', { count: 'exact', head: true })
        .eq('form_id', form.id)

      if (itsNoFilter !== null) {
        query = query.in('filled_for', itsNoFilter)
      }

      const { count } = await query
      const responses = count ?? 0
      const pct = memberTotal > 0 ? Math.round((responses / memberTotal) * 100) : 0
      return { id: form.id, title: form.title, responses, total: memberTotal, pct }
    })
  )

  rates.sort((a, b) => a.pct - b.pct)

  return NextResponse.json(rates)
}
