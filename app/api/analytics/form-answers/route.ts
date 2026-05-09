import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
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
  value: string
  submitted_at: string
}

export interface FormAnswersResponse {
  fields: FormFieldMeta[]
  field?: FormFieldMeta
  distribution: AnswerDist[]
  bySector: SectorBreakdown[]
  textEntries: TextEntry[]
}

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { scopedSubsectorIds }) => {
    try {
      const { searchParams } = req.nextUrl
      const formId = searchParams.get('form_id')
      const fieldIdStr = searchParams.get('field_id')
      const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

      if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })
      const supabase = await createClient()

      const { data: formFieldsData, error: fError } = await supabase
        .from('form_fields')
        .select('field_id, sort_order, is_required, profile_field(id, caption, field_type, behavior)')
        .eq('form_id', formId)
        .order('sort_order')

      if (fError) throw fError

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

      let itsNoFilter: number[] | null = null

      if (scopedSubsectorIds !== null) {
        if ((scopedSubsectorIds as number[]).includes(-1)) {
          itsNoFilter = [-1]
        } else {
          const { data: scopedMembers } = await supabase
            .from('mumin')
            .select('its_no')
            .in('subsector_id', scopedSubsectorIds)
            .eq('status', 'active')
          itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
        }
      }

      let q = supabase
        .from('form_responses')
        .select('answer, filled_for, submitted_at')
        .eq('form_id', formId)
        .eq('profile_field_id', fieldId)
        .not('filled_for', 'is', null)

      if (itsNoFilter !== null) {
        q = q.in('filled_for', itsNoFilter)
      }

      const { data: responses, error: rError } = await q
      if (rError) throw rError

      if (!responses || responses.length === 0) {
        return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
      }

      const uniqueIds: number[] = [...new Set(
        responses.map((r: any) => r.filled_for).filter((id): id is number => id !== null)
      )]

      const memberMap = new Map<number, any>()
      const CHUNK_SIZE = 500

      for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
        const { data: mData } = await supabase
          .from('mumin')
          .select(`its_no, name, subsector:subsector_id (subsector_name, sector:sector_id (sector_name))`)
          .in('its_no', chunk)
        mData?.forEach((m: any) => memberMap.set(m.its_no, m))
      }

      if (field.field_type === 'text') {
        const textEntries: TextEntry[] = responses
          .filter((r: any) => r.answer && r.filled_for !== null)
          .map((r: any) => {
            const m = memberMap.get(r.filled_for!)
            return { its_no: r.filled_for!, name: m?.name ?? 'Unknown', value: r.answer!, submitted_at: r.submitted_at }
          })
        return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries } satisfies FormAnswersResponse)
      }

      const distMap = new Map<string, number>()
      const sectorMap = new Map<string, Record<string, number>>()

      for (const r of responses) {
        const ans = (r as any).answer ?? '(blank)'
        distMap.set(ans, (distMap.get(ans) ?? 0) + 1)

        if ((r as any).filled_for !== null) {
          const m = memberMap.get((r as any).filled_for)
          if (m) {
            const groupName = groupBy === 'sector'
              ? m.subsector?.sector?.sector_name
              : m.subsector?.subsector_name
            if (groupName) {
              if (!sectorMap.has(groupName)) sectorMap.set(groupName, {})
              const g = sectorMap.get(groupName)!
              g[ans] = (g[ans] ?? 0) + 1
            }
          }
        }
      }

      const distribution: AnswerDist[] = Array.from(distMap.entries())
        .map(([answer, count]) => ({ answer, count }))
        .sort((a, b) => b.count - a.count)

      const bySector: SectorBreakdown[] = Array.from(sectorMap.entries())
        .map(([name, answers]) => ({
          name,
          ...answers,
          total: Object.values(answers).reduce((a: any, b: any) => a + b, 0),
        }))
        .sort((a, b) => (b.total as number) - (a.total as number))

      return NextResponse.json({ fields, field, distribution, bySector, textEntries: [] } satisfies FormAnswersResponse)
    } catch (err: any) {
      console.error('CRITICAL API ERROR:', err.message)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
)
