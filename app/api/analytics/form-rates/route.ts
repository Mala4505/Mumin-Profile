import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export interface FormRate {
  id: string
  title: string
  responses: number
  total: number
  pct: number
}

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest, { scopedSubsectorIds }) => {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`)

    if (formsError) throw formsError
    if (!forms || forms.length === 0) return NextResponse.json([])

    let itsNoFilter: number[] | null = null
    let memberTotal = 0

    if (scopedSubsectorIds !== null) {
      const { data: scopedMembers, count } = await supabase
        .from('mumin')
        .select('its_no', { count: 'exact' })
        .in('subsector_id', scopedSubsectorIds)
        .eq('status', 'active')

      itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
      memberTotal = count ?? 0

      if (memberTotal === 0) {
        return NextResponse.json(forms.map(f => ({
          id: f.id, title: f.title, responses: 0, total: 0, pct: 0,
        })))
      }
    } else {
      const { count } = await supabase
        .from('mumin')
        .select('its_no', { count: 'exact', head: true })
        .eq('status', 'active')
      memberTotal = count ?? 0
    }

    const formIds = forms.map(f => f.id)
    const { data: allFormFields } = await supabase
      .from('form_fields')
      .select('form_id, field_id')
      .in('form_id', formIds)

    const formFieldMap = new Map<string, number[]>()
    for (const ff of (allFormFields ?? []) as any[]) {
      const existing = formFieldMap.get(ff.form_id) ?? []
      existing.push(ff.field_id)
      formFieldMap.set(ff.form_id, existing)
    }

    const rates = await Promise.all(
      forms.map(async (form) => {
        const validFieldIds = formFieldMap.get(form.id) ?? []
        if (validFieldIds.length === 0) {
          return { id: form.id, title: form.title, responses: 0, total: memberTotal, pct: 0 }
        }

        let query = supabase
          .from('form_responses')
          .select('filled_for')
          .eq('form_id', form.id)
          .in('profile_field_id', validFieldIds)
          .not('filled_for', 'is', null)

        if (itsNoFilter !== null) {
          query = query.in('filled_for', itsNoFilter)
        }

        const { data: respondentRows } = await query
        const uniqueRespondents = new Set((respondentRows ?? []).map((r: any) => r.filled_for)).size
        const pct = memberTotal > 0 ? Math.round((uniqueRespondents / memberTotal) * 100) : 0

        return { id: form.id, title: form.title, responses: uniqueRespondents, total: memberTotal, pct }
      })
    )

    return NextResponse.json(rates.sort((a, b) => a.pct - b.pct))
  }
)
