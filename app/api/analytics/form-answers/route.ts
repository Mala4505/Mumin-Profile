import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export interface FormFieldMeta {
  id: number
  caption: string
  field_type: string
  behavior: string
  is_required: boolean
  sort_order: number
}

export interface AnswerDist {
  answer: string
  count: number
}

export interface SectorBreakdown {
  name: string
  total: number
  [answer: string]: string | number
}

export interface TextEntry {
  its_no: number
  name: string
  answer: string
  submitted_at: string
}

export interface FormAnswersResponse {
  fields: FormFieldMeta[]
  field?: FormFieldMeta
  distribution: AnswerDist[]
  bySector: SectorBreakdown[]
  textEntries: TextEntry[]
}

// Returns the subsector IDs that the session user is scoped to.
// Returns null for SuperAdmin (no filter), empty array if role has no assignments.
async function resolveSubsectorIds(
  session: Awaited<ReturnType<typeof getSession>> & object,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number[] | null> {
  if (session.role === 'SuperAdmin') return null

  if (session.role === 'Musaid') {
    return session.subsector_ids ?? []
  }

  // Admin or Masool: assigned to sectors — resolve their subsectors
  const sectorIds = session.sector_ids ?? []
  if (!sectorIds.length) return []

  const { data } = await supabase
    .from('subsector')
    .select('id')
    .in('sector_id', sectorIds)

  return (data ?? []).map((s: any) => s.id)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const formId = searchParams.get('form_id')
  const fieldIdStr = searchParams.get('field_id')
  const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

  if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })

  const supabase = await createClient()

  // Fetch form fields (unscoped — all roles see the same field list)
  const { data: formFieldsData } = await supabase
    .from('form_fields')
    .select('field_id, sort_order, is_required, profile_field(id, caption, field_type, behavior)')
    .eq('form_id', formId)
    .order('sort_order')

  const fields: FormFieldMeta[] = (formFieldsData ?? []).map((ff: any) => ({
    id: ff.profile_field?.id ?? ff.field_id,
    caption: ff.profile_field?.caption ?? 'Unknown',
    field_type: ff.profile_field?.field_type ?? 'text',
    behavior: ff.profile_field?.behavior ?? 'static',
    is_required: ff.is_required ?? false,
    sort_order: ff.sort_order ?? 0,
  }))

  if (!fieldIdStr) {
    return NextResponse.json({ fields, distribution: [], bySector: [], textEntries: [] })
  }

  const fieldId = parseInt(fieldIdStr)
  const field = fields.find(f => f.id === fieldId)
  if (!field) return NextResponse.json({ error: 'Field not in this form' }, { status: 404 })

  // Resolve scope: for non-SuperAdmin, get the ITS numbers of their assigned Mumineen
  const scopedSubsectorIds = await resolveSubsectorIds(session, supabase)
  let itsNoFilter: number[] | null = null

  if (scopedSubsectorIds !== null) {
    if (scopedSubsectorIds.length === 0) {
      return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
    }
    const { data: scopedMembers } = await supabase
      .from('mumin')
      .select('its_no')
      .in('subsector_id', scopedSubsectorIds)
      .eq('status', 'active')
    itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
  }

  // Fetch responses for this form + field, scoped if needed.
  // Static fields: use profile_value (current upserted value) scoped to members who submitted this form.
  // Historical fields: use form_responses (full audit trail — each submission is a distinct data point).
  let responses: Array<{ answer: string | null; filled_for: number | null; submitted_at: string }> = []

  if (field.behavior === 'static') {
    // Get the distinct members who submitted this field for this form
    const { data: submitterRows } = await supabase
      .from('form_responses')
      .select('filled_for')
      .eq('form_id', formId)
      .eq('profile_field_id', fieldId)
      .not('filled_for', 'is', null)

    let submitterIds = [...new Set((submitterRows ?? []).map((r: any) => r.filled_for as number))]
    if (itsNoFilter !== null) {
      const filterSet = new Set(itsNoFilter)
      submitterIds = submitterIds.filter(id => filterSet.has(id))
    }

    if (submitterIds.length === 0) {
      return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
    }

    const { data: pvData, error } = await supabase
      .from('profile_value')
      .select('its_no, value, updated_at')
      .eq('field_id', fieldId)
      .eq('data_active', true)
      .in('its_no', submitterIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    responses = (pvData ?? []).map((pv: any) => ({
      answer: pv.value,
      filled_for: pv.its_no,
      submitted_at: pv.updated_at,
    }))
  } else {
    let responsesQuery = supabase
      .from('form_responses')
      .select('answer, filled_for, submitted_at')
      .eq('form_id', formId)
      .eq('profile_field_id', fieldId)

    if (itsNoFilter !== null) {
      responsesQuery = responsesQuery.in('filled_for', itsNoFilter)
    }

    const { data, error } = await responsesQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    responses = data ?? []
  }

  if (responses.length === 0) {
    return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
  }

  // Distribution
  const distMap = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answer ?? '(blank)'
    distMap.set(ans, (distMap.get(ans) ?? 0) + 1)
  }
  const distribution: AnswerDist[] = Array.from(distMap.entries())
    .map(([answer, count]) => ({ answer, count }))
    .sort((a, b) => b.count - a.count)

  const filledForIds = responses
    .map(r => r.filled_for)
    .filter((x): x is number => x !== null)
  const uniqueFilledForIds = [...new Set(filledForIds)]

  // Text fields — return entries table
  if (field.field_type === 'text') {
    const { data: memberData } = await supabase
      .from('mumin')
      .select('its_no, name')
      .in('its_no', uniqueFilledForIds)

    const memberMap = new Map((memberData ?? []).map((m: any) => [m.its_no, m.name]))

    const textEntries: TextEntry[] = responses
      .filter(r => r.answer && r.filled_for !== null)
      .map(r => ({
        its_no: r.filled_for as number,
        name: memberMap.get(r.filled_for as number) ?? 'Unknown',
        answer: r.answer as string,
        submitted_at: r.submitted_at,
      }))
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    return NextResponse.json({ fields, field, distribution, bySector: [], textEntries })
  }

  // Select/radio/number — build sector/subsector breakdown
  // Sector breakdown is naturally scoped because uniqueFilledForIds is already scoped
  const { data: memberData } = await supabase
    .from('mumin')
    .select('its_no, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
    .in('its_no', uniqueFilledForIds)

  const memberGroupMap = new Map<number, string>()
  for (const m of (memberData ?? []) as any[]) {
    const group =
      groupBy === 'sector'
        ? m.subsector?.sector?.sector_name
        : m.subsector?.subsector_name
    if (group) memberGroupMap.set(m.its_no, group)
  }

  const sectorMap = new Map<string, Record<string, number>>()
  for (const r of responses) {
    if (r.filled_for === null) continue
    const group = memberGroupMap.get(r.filled_for)
    if (!group) continue
    const ans = r.answer ?? '(blank)'
    if (!sectorMap.has(group)) sectorMap.set(group, {})
    const g = sectorMap.get(group)!
    g[ans] = (g[ans] ?? 0) + 1
  }

  const bySector: SectorBreakdown[] = Array.from(sectorMap.entries())
    .map(([name, answers]) => ({
      name,
      ...answers,
      total: Object.values(answers).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => (b.total as number) - (a.total as number))

  return NextResponse.json({ fields, field, distribution, bySector, textEntries: [] } satisfies FormAnswersResponse)
}
