import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface FieldHistoryEntry {
  id: string
  answer: string | null
  remarks: string | null
  submitted_at: string
  event_title: string | null
  filled_by_its: number | null
  filled_by_name: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ its_no: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { its_no: itsNoStr } = await params
  const itsNo = parseInt(itsNoStr)
  if (isNaN(itsNo)) return NextResponse.json({ error: 'Invalid ITS' }, { status: 400 })

  const isStaff = ['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(session.role)
  if (!isStaff && session.its_no !== itsNo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const fieldId = searchParams.get('field_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const eventId = searchParams.get('event_id')

  if (!fieldId) return NextResponse.json({ error: 'field_id required' }, { status: 400 })

  const supabase = await createClient()

  let query = supabase
    .from('form_responses')
    .select('id, answer, remarks, submitted_at, filled_by, event_id')
    .eq('filled_for', itsNo)
    .eq('profile_field_id', parseInt(fieldId))
    .order('submitted_at', { ascending: false })

  if (from) query = query.gte('submitted_at', from)
  if (to) query = query.lte('submitted_at', to + 'T23:59:59Z')
  if (eventId) query = query.eq('event_id', parseInt(eventId))

  const { data: responses, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!responses || responses.length === 0) return NextResponse.json([])

  const eventIds = [...new Set(responses.map(r => r.event_id).filter((x): x is number => x !== null))]
  const fillerItsNos = [...new Set(responses.map(r => r.filled_by).filter((x): x is number => x !== null))]

  const [{ data: eventsData }, { data: fillersData }] = await Promise.all([
    eventIds.length > 0
      ? supabase.from('event').select('id, title').in('id', eventIds)
      : Promise.resolve({ data: [] as Array<{ id: number; title: string }> }),
    fillerItsNos.length > 0
      ? supabase.from('mumin').select('its_no, name').in('its_no', fillerItsNos)
      : Promise.resolve({ data: [] as Array<{ its_no: number; name: string }> }),
  ])

  const eventTitleMap = new Map((eventsData ?? []).map((e: any) => [e.id, e.title as string]))
  const fillerNameMap = new Map((fillersData ?? []).map((m: any) => [m.its_no, m.name as string]))

  const result: FieldHistoryEntry[] = responses.map(r => ({
    id: r.id,
    answer: r.answer,
    remarks: r.remarks,
    submitted_at: r.submitted_at,
    event_title: r.event_id ? (eventTitleMap.get(r.event_id) ?? null) : null,
    filled_by_its: r.filled_by ?? null,
    filled_by_name: r.filled_by ? (fillerNameMap.get(r.filled_by) ?? null) : null,
  }))

  return NextResponse.json(result)
}
