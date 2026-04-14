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
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const [{ data: forms }, { count: total }] = await Promise.all([
    supabase
      .from('forms')
      .select('id, title')
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    supabase
      .from('mumin')
      .select('its_no', { count: 'exact', head: true })
      .eq('status', 'active'),
  ])

  if (!forms || forms.length === 0) return NextResponse.json([])

  const memberTotal = total ?? 0

  // Fetch response counts for each form in parallel
  const rates = await Promise.all(
    (forms as Array<{ id: string; title: string }>).map(async (form) => {
      const { count } = await supabase
        .from('form_response')
        .select('its_no', { count: 'exact', head: true })
        .eq('form_id', form.id)

      const responses = count ?? 0
      const pct = memberTotal > 0 ? Math.round((responses / memberTotal) * 100) : 0
      return { id: form.id, title: form.title, responses, total: memberTotal, pct }
    })
  )

  // Sort by pct ascending (most urgent first)
  rates.sort((a, b) => a.pct - b.pct)

  return NextResponse.json(rates)
}
