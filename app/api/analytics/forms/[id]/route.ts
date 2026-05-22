import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

// ── Exported types (re-exported here for backward-compat with component imports) ──

export interface FormRate {
  id: string
  title: string
  responses: number
  total: number
  pct: number
}

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

export interface RespondentRow {
  its_no: string
  name: string
  answer: string
  phone?: string
  sector_name?: string
  subsector_name?: string
  submitted_at?: string
}

export interface SubsectorCompletion {
  subsector_id: number
  name: string
  total: number
  responded: number
  pct: number
}

export interface SectorCompletion {
  sector_id: number
  name: string
  total: number
  responded: number
  pct: number
  subsectors: SubsectorCompletion[]
}

export type ResponseRecord = { answer: string | null; filled_for: number | null; submitted_at: string }
export type MemberRecord = { name: string; phone?: string; sector_name: string; subsector_name: string }

export function buildRespondentRows(
  responses: ResponseRecord[],
  memberMap: Map<number, MemberRecord>
): RespondentRow[] {
  const rows: RespondentRow[] = []
  for (const r of responses) {
    if (r.filled_for !== null && r.answer) {
      const member = memberMap.get(r.filled_for) ?? {
        name: 'Unknown',
        phone: undefined,
        sector_name: 'N/A',
        subsector_name: 'N/A',
      }
      rows.push({
        its_no: String(r.filled_for),
        name: member.name,
        answer: r.answer as string,
        phone: member.phone,
        sector_name: member.sector_name,
        subsector_name: member.subsector_name,
        submitted_at: r.submitted_at,
      })
    }
  }
  return rows.sort((a, b) => {
    const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return dateB - dateA
  })
}

// Consolidates: form-rates, form-answers, form-respondents, sector-completion
// Usage:
//   GET /api/analytics/forms/all?section=rates
//   GET /api/analytics/forms/:formId?section=answers[&field_id=N&group_by=sector|subsector]
//   GET /api/analytics/forms/:formId?section=respondents&field_id=N
//   GET /api/analytics/forms/:formId?section=completion

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { scopedSubsectorIds }, routeCtx) => {
    const params = await routeCtx?.params
    const formId = params?.id
    const section = req.nextUrl.searchParams.get('section')
    const supabase = await createClient()

    // ── rates ─────────────────────────────────────────────────────────────────
    if (section === 'rates') {
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
          return NextResponse.json(forms.map(f => ({ id: f.id, title: f.title, responses: 0, total: 0, pct: 0 })))
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

    if (!formId || formId === 'all') {
      return NextResponse.json({ error: 'form id required for this section' }, { status: 400 })
    }

    // ── answers ───────────────────────────────────────────────────────────────
    if (section === 'answers') {
      try {
        const fieldIdStr = req.nextUrl.searchParams.get('field_id')
        const groupBy = (req.nextUrl.searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

        const { data: formFieldsData, error: fError } = await supabase
          .from('form_fields')
          .select('field_id, sort_order, is_required, profile_field(id, caption, field_type, behavior)')
          .eq('form_id', formId)
          .order('sort_order')

        if (fError) throw fError

        const fields = (formFieldsData ?? []).map((ff: any) => ({
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
        const field = fields.find((f: any) => f.id === fieldId)
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

        if (itsNoFilter !== null) q = q.in('filled_for', itsNoFilter)

        const { data: responses, error: rError } = await q
        if (rError) throw rError

        if (!responses || responses.length === 0) {
          return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
        }

        const uniqueIds: number[] = [...new Set(
          responses.map((r: any) => r.filled_for).filter((id: any): id is number => id !== null)
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

        const allDist = Array.from(distMap.entries())
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count)

        // Limit text fields to top 20 unique values so the chart stays readable
        const distribution = field.field_type === 'text' ? allDist.slice(0, 20) : allDist

        const bySector = Array.from(sectorMap.entries())
          .map(([name, answers]) => ({
            name,
            ...answers,
            total: Object.values(answers).reduce((a: any, b: any) => a + b, 0),
          }))
          .sort((a, b) => (b.total as number) - (a.total as number))

        // Include raw text entries for text fields alongside the chart data
        const textEntries = field.field_type === 'text'
          ? responses
              .filter((r: any) => r.answer && r.filled_for !== null)
              .map((r: any) => {
                const m = memberMap.get(r.filled_for!)
                return { its_no: r.filled_for!, name: m?.name ?? 'Unknown', value: r.answer!, submitted_at: r.submitted_at }
              })
          : []

        return NextResponse.json({ fields, field, distribution, bySector, textEntries })
      } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      }
    }

    // ── respondents ───────────────────────────────────────────────────────────
    if (section === 'respondents') {
      try {
        const fieldIdStr = req.nextUrl.searchParams.get('field_id')
        if (!fieldIdStr) return NextResponse.json({ error: 'field_id required' }, { status: 400 })
        const fieldId = parseInt(fieldIdStr)

        let itsNoFilter: number[] | null = null

        if (scopedSubsectorIds !== null) {
          const { data: scopedMembers } = await supabase
            .from('mumin')
            .select('its_no')
            .in('subsector_id', scopedSubsectorIds)
            .eq('status', 'active')
          itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
          if (itsNoFilter.length === 0) return NextResponse.json([])
        }

        let q = supabase
          .from('form_responses')
          .select('answer, filled_for, submitted_at')
          .eq('form_id', formId)
          .eq('profile_field_id', fieldId)
          .not('filled_for', 'is', null)
          .limit(2000)

        if (itsNoFilter !== null) q = q.in('filled_for', itsNoFilter)

        const { data: responses, error: respError } = await q
        if (respError) throw respError
        if (!responses || responses.length === 0) return NextResponse.json([])

        const uniqueIds = [...new Set(responses.map((r: any) => r.filled_for).filter(Boolean))]
        const memberMap = new Map<number, any>()
        const CHUNK_SIZE = 500

        for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
          const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
          const { data: memberData } = await supabase
            .from('mumin')
            .select(`its_no, name, phone, subsector:subsector_id (subsector_name, sector:sector_id (sector_name))`)
            .in('its_no', chunk)

          memberData?.forEach((m: any) => {
            memberMap.set(m.its_no, {
              name: m.name,
              sector_name: m.subsector?.sector?.sector_name ?? 'N/A',
              subsector_name: m.subsector?.subsector_name ?? 'N/A',
              phone: m.phone ?? undefined,
            })
          })
        }

        return NextResponse.json(buildRespondentRows(responses as any, memberMap))
      } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      }
    }

    // ── completion ────────────────────────────────────────────────────────────
    if (section === 'completion') {
      const { data: formFieldRows } = await supabase
        .from('form_fields')
        .select('field_id, profile_field!field_id(behavior)')
        .eq('form_id', formId)

      const staticFieldIds: number[] = []
      const historicalFieldIds: number[] = []

      for (const ff of (formFieldRows ?? []) as any[]) {
        const behavior = ff.profile_field?.behavior ?? 'static'
        if (behavior === 'static') staticFieldIds.push(ff.field_id)
        else historicalFieldIds.push(ff.field_id)
      }

      if (staticFieldIds.length === 0 && historicalFieldIds.length === 0) {
        return NextResponse.json([])
      }

      let membersQuery = supabase
        .from('mumin')
        .select('its_no, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
        .eq('status', 'active')

      if (scopedSubsectorIds !== null) {
        membersQuery = membersQuery.in('subsector_id', scopedSubsectorIds)
      }

      const [{ data: allMembers }, pvRows, frRows] = await Promise.all([
        membersQuery,
        staticFieldIds.length > 0
          ? supabase.from('profile_value').select('its_no').in('field_id', staticFieldIds).eq('data_active', true).then(r => r.data ?? [])
          : Promise.resolve([]),
        historicalFieldIds.length > 0
          ? supabase.from('form_responses').select('filled_for').eq('form_id', formId).in('profile_field_id', historicalFieldIds).not('filled_for', 'is', null).then(r => r.data ?? [])
          : Promise.resolve([]),
      ])

      const respondedSet = new Set<number>([
        ...(pvRows as any[]).map((r: any) => r.its_no as number),
        ...(frRows as any[]).map((r: any) => r.filled_for as number),
      ])

      type SubAgg = { subsector_id: number; name: string; total: number; responded: number; pct: number }
      type SecAgg = { sector_id: number; name: string; total: number; responded: number; pct: number; subsectors: SubAgg[] }

      const sectorMap = new Map<number, SecAgg>()
      const subsectorMap = new Map<number, SubAgg>()

      for (const m of (allMembers ?? []) as any[]) {
        const sub = m.subsector
        if (!sub) continue
        const sec = sub.sector
        if (!sec) continue

        const sectorId: number = sub.sector_id
        const subsectorId: number = m.subsector_id

        if (!sectorMap.has(sectorId)) {
          sectorMap.set(sectorId, { sector_id: sectorId, name: sec.sector_name, total: 0, responded: 0, pct: 0, subsectors: [] })
        }

        if (!subsectorMap.has(subsectorId)) {
          const newSub: SubAgg = { subsector_id: subsectorId, name: sub.subsector_name, total: 0, responded: 0, pct: 0 }
          subsectorMap.set(subsectorId, newSub)
          sectorMap.get(sectorId)!.subsectors.push(newSub)
        }

        const secAgg = sectorMap.get(sectorId)!
        const subAgg = subsectorMap.get(subsectorId)!
        const responded = respondedSet.has(m.its_no)

        secAgg.total++
        subAgg.total++
        if (responded) {
          secAgg.responded++
          subAgg.responded++
        }
      }

      const result = Array.from(sectorMap.values())
        .map(s => ({
          ...s,
          pct: s.total > 0 ? Math.round((s.responded / s.total) * 100) : 0,
          subsectors: s.subsectors
            .map(sub => ({ ...sub, pct: sub.total > 0 ? Math.round((sub.responded / sub.total) * 100) : 0 }))
            .sort((a, b) => a.pct - b.pct),
        }))
        .sort((a, b) => a.pct - b.pct)

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'section must be rates|answers|respondents|completion' }, { status: 400 })
  }
)
