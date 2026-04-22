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

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const formId = searchParams.get('form_id')
  const fieldIdStr = searchParams.get('field_id')
  const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

  if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })

  const supabase = await createClient()

  // Fetch form fields
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

  // Fetch all responses for this form + field
  const { data: responses, error } = await supabase
    .from('form_responses')
    .select('answer, filled_for, submitted_at')
    .eq('form_id', formId)
    .eq('profile_field_id', fieldId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!responses || responses.length === 0) {
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
