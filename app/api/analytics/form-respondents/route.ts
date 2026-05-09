import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export interface RespondentRow {
  its_no: string
  name: string
  answer: string
  phone?: string
  sector_name?: string
  subsector_name?: string
  submitted_at?: string
}
type ResponseRecord = { answer: string | null; filled_for: number | null; submitted_at: string }
type MemberRecord = { name: string; phone?: string; sector_name: string; subsector_name: string }

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

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { scopedSubsectorIds }) => {
    try {
      const { searchParams } = req.nextUrl
      const formId = searchParams.get('form_id')
      const fieldIdStr = searchParams.get('field_id')

      if (!formId || !fieldIdStr) {
        return NextResponse.json({ error: 'form_id and field_id required' }, { status: 400 })
      }

      const fieldId = parseInt(fieldIdStr)
      const supabase = await createClient()

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

      if (itsNoFilter !== null) {
        q = q.in('filled_for', itsNoFilter)
      }

      const { data: responses, error: respError } = await q
      if (respError) throw respError
      if (!responses || responses.length === 0) return NextResponse.json([])

      const uniqueIds = [...new Set(responses.map((r: any) => r.filled_for).filter(Boolean))]
      const memberMap = new Map<number, MemberRecord>()
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

      const finalData = buildRespondentRows(responses as ResponseRecord[], memberMap)
      return NextResponse.json(finalData)
    } catch (err: any) {
      console.error('RESPONDENTS ERROR:', err.message)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
)
