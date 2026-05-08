// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'

// export interface RespondentRow {
//   its_no: string
//   name: string
//   answer: string
//   sector_name: string
//   subsector_name: string
//   submitted_at: string
// }

// type ResponseRecord = { answer: string | null; filled_for: number | null; submitted_at: string }
// type MemberRecord = { name: string; sector_name: string; subsector_name: string }

// export function buildRespondentRows(
//   responses: ResponseRecord[],
//   memberMap: Map<number, MemberRecord>
// ): RespondentRow[] {
//   return responses
//     .filter(r => r.filled_for !== null && r.answer)
//     .map(r => {
//       const member = memberMap.get(r.filled_for!) ?? { name: 'Unknown', sector_name: '', subsector_name: '' }
//       return {
//         its_no: String(r.filled_for),
//         name: member.name,
//         answer: r.answer as string,
//         sector_name: member.sector_name,
//         subsector_name: member.subsector_name,
//         submitted_at: r.submitted_at,
//       }
//     })
//     .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
// }

// async function resolveSubsectorIds(
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   session: any,
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   supabase: any
// ): Promise<number[] | null> {
//   if (session.role === 'SuperAdmin') return null
//   if (session.role === 'Musaid') return session.subsector_ids ?? []
//   const sectorIds = session.sector_ids ?? []
//   if (!sectorIds.length) return []
//   const { data } = await supabase.from('subsector').select('id').in('sector_id', sectorIds)
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   return (data ?? []).map((s: any) => s.id)
// }

// export async function GET(req: NextRequest) {
//   const session = await getSession()
//   if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

//   const { searchParams } = req.nextUrl
//   const formId = searchParams.get('form_id')
//   const fieldIdStr = searchParams.get('field_id')

//   if (!formId || !fieldIdStr) {
//     return NextResponse.json({ error: 'form_id and field_id required' }, { status: 400 })
//   }

//   const fieldId = parseInt(fieldIdStr)
//   const supabase = await createClient()

//   const scopedSubsectorIds = await resolveSubsectorIds(session, supabase)
//   let itsNoFilter: number[] | null = null

//   if (scopedSubsectorIds !== null) {
//     if (scopedSubsectorIds.length === 0) return NextResponse.json([])
//     const { data: scopedMembers } = await supabase
//       .from('mumin')
//       .select('its_no')
//       .in('subsector_id', scopedSubsectorIds)
//       .eq('status', 'active')
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
//   }

//   // Determine field behavior to decide data source
//   const { data: fieldMeta } = await supabase
//     .from('profile_field')
//     .select('behavior')
//     .eq('id', fieldId)
//     .single()

//   const isStatic = fieldMeta?.behavior === 'static'

//   let responses: ResponseRecord[]

//   if (isStatic) {
//     // Get distinct submitters from form_responses for scope, then read current value from profile_value
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let submitterQuery: any = supabase
//       .from('form_responses')
//       .select('filled_for')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)
//       .not('filled_for', 'is', null)
//     if (itsNoFilter !== null) submitterQuery = submitterQuery.in('filled_for', itsNoFilter)

//     const { data: submitterRows } = await submitterQuery
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const submitterIds = [...new Set((submitterRows ?? []).map((r: any) => r.filled_for as number))]

//     if (submitterIds.length === 0) return NextResponse.json([])

//     const { data: pvData, error } = await supabase
//       .from('profile_value')
//       .select('its_no, value, updated_at')
//       .eq('field_id', fieldId)
//       .eq('data_active', true)
//       .in('its_no', submitterIds)

//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//     responses = (pvData ?? []).map((pv: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
//       answer: pv.value,
//       filled_for: pv.its_no,
//       submitted_at: pv.updated_at,
//     }))
//   } else {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let q: any = supabase
//       .from('form_responses')
//       .select('answer, filled_for, submitted_at')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)
//     if (itsNoFilter !== null) q = q.in('filled_for', itsNoFilter)

//     const { data, error } = await q
//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//     responses = data ?? []
//   }

//   if (!responses.length) return NextResponse.json([])

//   const uniqueIds = [
//     ...new Set(
//       responses.map(r => r.filled_for).filter((x): x is number => x !== null)
//     ),
//   ]

//   const { data: memberData } = await supabase
//     .from('mumin')
//     .select('its_no, name, subsector!subsector_id(subsector_name, sector!sector_id(sector_name))')
//     .in('its_no', uniqueIds)

//   const memberMap = new Map<number, MemberRecord>()
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   for (const m of (memberData ?? []) as any[]) {
//     memberMap.set(m.its_no, {
//       name: m.name,
//       sector_name: m.subsector?.sector?.sector_name ?? '',
//       subsector_name: m.subsector?.subsector_name ?? '',
//     })
//   }

//   return NextResponse.json(buildRespondentRows(responses, memberMap))
// }

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { resolveScope } from '@/lib/analytics/resolveScope'

export interface RespondentRow {
  its_no: string
  name: string
  answer: string
  phone?: string
  sector_name?: string;
  subsector_name?: string;
  submitted_at?: string;
}
type ResponseRecord = { answer: string | null; filled_for: number | null; submitted_at: string }
type MemberRecord = { name: string; phone?: string; sector_name: string; subsector_name: string }

/**
 * Builds rows efficiently for large datasets.
 */
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
        subsector_name: 'N/A' 
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
    const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return dateB - dateA;
  })
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = req.nextUrl
    const formId = searchParams.get('form_id')
    const fieldIdStr = searchParams.get('field_id')

    if (!formId || !fieldIdStr) {
      return NextResponse.json({ error: 'form_id and field_id required' }, { status: 400 })
    }

    const fieldId = parseInt(fieldIdStr)
    const supabase = await createClient()

    // 1. Resolve Access (Ensure this returns null for Masool/Musaid in your resolveScope.ts)
    const scopedSubsectorIds = await resolveScope(session)
    let itsNoFilter: number[] | null = null

    if (scopedSubsectorIds !== null) {
      // If we are filtering, get the ITS numbers first
      const { data: scopedMembers } = await supabase
        .from('mumin')
        .select('its_no')
        .in('subsector_id', scopedSubsectorIds)
        .eq('status', 'active')
      itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
      
      // If a restricted user has no members, return empty early
      if (itsNoFilter.length === 0) return NextResponse.json([])
    }

    // 2. Fetch Responses (Primary Data)
    let q = supabase
      .from('form_responses')
      .select('answer, filled_for, submitted_at')
      .eq('form_id', formId)
      .eq('profile_field_id', fieldId)
      .not('filled_for', 'is', null)
      .limit(2000) // Safety for high-volume forms

    if (itsNoFilter !== null) {
      q = q.in('filled_for', itsNoFilter)
    }

    const { data: responses, error: respError } = await q
    if (respError) throw respError
    if (!responses || responses.length === 0) return NextResponse.json([])

    // 3. Batched Member Name Fetch (The 1500+ record fix)
    const uniqueIds = [...new Set(responses.map((r: any) => r.filled_for).filter(Boolean))]
    const memberMap = new Map<number, MemberRecord>()
    const CHUNK_SIZE = 500

    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
      const { data: memberData } = await supabase
        .from('mumin')
        .select(`
          its_no, 
          name,
          phone,
          subsector:subsector_id (
            subsector_name, 
            sector:sector_id (sector_name)
          )
        `)
        .in('its_no', chunk)

      memberData?.forEach((m: any) => {
        memberMap.set(m.its_no, {
          name: m.name,
          sector_name: m.subsector?.sector?.sector_name ?? 'N/A',
          subsector_name: m.subsector?.subsector_name ?? 'N/A',
          phone: m.phone ?? undefined
        })
      })
    }

    // 4. Final Processing
    const finalData = buildRespondentRows(responses as ResponseRecord[], memberMap)
    return NextResponse.json(finalData)

  } catch (err: any) {
    console.error('RESPONDENTS ERROR:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'
// import { resolveScope } from '@/lib/analytics/resolveScope'

// export interface RespondentRow {
//   its_no: string
//   name: string
//   answer: string
//   sector_name: string
//   subsector_name: string
//   submitted_at: string
// }

// type ResponseRecord = { answer: string | null; filled_for: number | null; submitted_at: string }
// type MemberRecord = { name: string; sector_name: string; subsector_name: string }

// /**
//  * Maps raw database responses to the flat format required by the UI table.
//  */
// export function buildRespondentRows(
//   responses: ResponseRecord[],
//   memberMap: Map<number, MemberRecord>
// ): RespondentRow[] {
//   return responses
//     .filter(r => r.filled_for !== null && r.answer)
//     .map(r => {
//       const member = memberMap.get(r.filled_for!) ?? { name: 'Unknown', sector_name: '', subsector_name: '' }
//       return {
//         its_no: String(r.filled_for),
//         name: member.name,
//         answer: r.answer as string,
//         sector_name: member.sector_name,
//         subsector_name: member.subsector_name,
//         submitted_at: r.submitted_at,
//       }
//     })
//     .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
// }

// export async function GET(req: NextRequest) {
//   const session = await getSession()

//   // 1. Updated Authorization: Allow management roles
//   const allowedRoles = ['SuperAdmin', 'Admin', 'Masool', 'Musaid']
//   if (!session || !allowedRoles.includes(session.role)) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const { searchParams } = req.nextUrl
//   const formId = searchParams.get('form_id')
//   const fieldIdStr = searchParams.get('field_id')

//   if (!formId || !fieldIdStr) {
//     return NextResponse.json({ error: 'form_id and field_id required' }, { status: 400 })
//   }

//   const fieldId = parseInt(fieldIdStr)
//   const supabase = await createClient()

//   // 2. Resolve Scope using the shared utility
//   const scope = await resolveScope(session)
//   let itsNoFilter: number[] | null = null

//   if (scope !== null) {
//     // If a Masool/Musaid has no assigned subsectors, return empty early
//     if (scope.length === 0) return NextResponse.json([])

//     const { data: scopedMembers } = await supabase
//       .from('mumin')
//       .select('its_no')
//       .in('subsector_id', scope as number[]) // Fixed TS Error: added 'as number[]'
//       .eq('status', 'active')

//     itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)

//     // If scope is active but no members exist in it, return empty
//     if (itsNoFilter.length === 0) return NextResponse.json([])
//   }

//   // 3. Determine field behavior (Static vs Historical)
//   const { data: fieldMeta } = await supabase
//     .from('profile_field')
//     .select('behavior')
//     .eq('id', fieldId)
//     .single()

//   const isStatic = fieldMeta?.behavior === 'static'
//   let responses: ResponseRecord[] = []

//   if (isStatic) {
//     // Logic: Find who submitted this form, then get their CURRENT profile value
//     let submitterQuery = supabase
//       .from('form_responses')
//       .select('filled_for')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)
//       .not('filled_for', 'is', null)

//     if (itsNoFilter !== null) {
//       submitterQuery = submitterQuery.in('filled_for', itsNoFilter as number[])
//     }

//     const { data: submitterRows } = await submitterQuery
//     const submitterIds = [...new Set((submitterRows ?? []).map((r: any) => r.filled_for as number))]

//     if (submitterIds.length === 0) return NextResponse.json([])

//     const { data: pvData, error } = await supabase
//       .from('profile_value')
//       .select('its_no, value, updated_at')
//       .eq('field_id', fieldId)
//       .eq('data_active', true)
//       .in('its_no', submitterIds as number[])

//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//     responses = (pvData ?? []).map((pv: any) => ({
//       answer: pv.value,
//       filled_for: pv.its_no,
//       submitted_at: pv.updated_at,
//     }))
//   } else {
//     // Logic: Fetch every historical entry for this form field
//     let q = supabase
//       .from('form_responses')
//       .select('answer, filled_for, submitted_at')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)

//     if (itsNoFilter !== null) {
//       q = q.in('filled_for', itsNoFilter as number[])
//     }

//     const { data, error } = await q
//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//     responses = data ?? []
//   }

//   if (!responses.length) return NextResponse.json([])

//   // 4. Enrich responses with Member names and Sector/Subsector names
//   const uniqueIds = [
//     ...new Set(
//       responses.map(r => r.filled_for).filter((x): x is number => x !== null)
//     ),
//   ]

//   const { data: memberData } = await supabase
//     .from('mumin')
//     .select('its_no, name, subsector!subsector_id(subsector_name, sector!sector_id(sector_name))')
//     .in('its_no', uniqueIds as number[])

//   const memberMap = new Map<number, MemberRecord>()
//   for (const m of (memberData ?? []) as any[]) {
//     memberMap.set(m.its_no, {
//       name: m.name,
//       sector_name: m.subsector?.sector?.sector_name ?? '',
//       subsector_name: m.subsector?.subsector_name ?? '',
//     })
//   }

//   // 5. Final output
//   return NextResponse.json(buildRespondentRows(responses, memberMap))
// }
