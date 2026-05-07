// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'

// export interface FormFieldMeta {
//   id: number
//   caption: string
//   field_type: string
//   behavior: string
//   is_required: boolean
//   sort_order: number
// }

// export interface AnswerDist {
//   answer: string
//   count: number
// }

// export interface SectorBreakdown {
//   name: string
//   total: number
//   [answer: string]: string | number
// }

// export interface TextEntry {
//   its_no: number
//   name: string
//   answer: string
//   submitted_at: string
// }

// export interface FormAnswersResponse {
//   fields: FormFieldMeta[]
//   field?: FormFieldMeta
//   distribution: AnswerDist[]
//   bySector: SectorBreakdown[]
//   textEntries: TextEntry[]
// }

// // Returns the subsector IDs that the session user is scoped to.
// // Returns null for SuperAdmin (no filter), empty array if role has no assignments.
// async function resolveSubsectorIds(
//   session: Awaited<ReturnType<typeof getSession>> & object,
//   supabase: Awaited<ReturnType<typeof createClient>>
// ): Promise<number[] | null> {
//   if (session.role === 'SuperAdmin') return null

//   if (session.role === 'Musaid') {
//     return session.subsector_ids ?? []
//   }

//   // Admin or Masool: assigned to sectors — resolve their subsectors
//   const sectorIds = session.sector_ids ?? []
//   if (!sectorIds.length) return []

//   const { data } = await supabase
//     .from('subsector')
//     .select('id')
//     .in('sector_id', sectorIds)

//   return (data ?? []).map((s: any) => s.id)
// }

// export async function GET(req: NextRequest) {
//   const session = await getSession()
//   if (!session) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const { searchParams } = req.nextUrl
//   const formId = searchParams.get('form_id')
//   const fieldIdStr = searchParams.get('field_id')
//   const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

//   if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })

//   const supabase = await createClient()

//   // Fetch form fields (unscoped — all roles see the same field list)
//   const { data: formFieldsData } = await supabase
//     .from('form_fields')
//     .select('field_id, sort_order, is_required, profile_field(id, caption, field_type, behavior)')
//     .eq('form_id', formId)
//     .order('sort_order')

//   const fields: FormFieldMeta[] = (formFieldsData ?? []).map((ff: any) => ({
//     id: ff.profile_field?.id ?? ff.field_id,
//     caption: ff.profile_field?.caption ?? 'Unknown',
//     field_type: ff.profile_field?.field_type ?? 'text',
//     behavior: ff.profile_field?.behavior ?? 'static',
//     is_required: ff.is_required ?? false,
//     sort_order: ff.sort_order ?? 0,
//   }))

//   if (!fieldIdStr) {
//     return NextResponse.json({ fields, distribution: [], bySector: [], textEntries: [] })
//   }

//   const fieldId = parseInt(fieldIdStr)
//   const field = fields.find(f => f.id === fieldId)
//   if (!field) return NextResponse.json({ error: 'Field not in this form' }, { status: 404 })

//   // Resolve scope: for non-SuperAdmin, get the ITS numbers of their assigned Mumineen
//   const scopedSubsectorIds = await resolveSubsectorIds(session, supabase)
//   let itsNoFilter: number[] | null = null

//   if (scopedSubsectorIds !== null) {
//     if (scopedSubsectorIds.length === 0) {
//       return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
//     }
//     const { data: scopedMembers } = await supabase
//       .from('mumin')
//       .select('its_no')
//       .in('subsector_id', scopedSubsectorIds)
//       .eq('status', 'active')
//     itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
//   }

//   // Fetch responses for this form + field, scoped if needed.
//   // Static fields: use profile_value (current upserted value) scoped to members who submitted this form.
//   // Historical fields: use form_responses (full audit trail — each submission is a distinct data point).
//   let responses: Array<{ answer: string | null; filled_for: number | null; submitted_at: string }> = []

//   if (field.behavior === 'static') {
//     // Get the distinct members who submitted this field for this form
//     const { data: submitterRows } = await supabase
//       .from('form_responses')
//       .select('filled_for')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)
//       .not('filled_for', 'is', null)

//     let submitterIds = [...new Set((submitterRows ?? []).map((r: any) => r.filled_for as number))]
//     if (itsNoFilter !== null) {
//       const filterSet = new Set(itsNoFilter)
//       submitterIds = submitterIds.filter(id => filterSet.has(id))
//     }

//     if (submitterIds.length === 0) {
//       return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
//     }

//     const { data: pvData, error } = await supabase
//       .from('profile_value')
//       .select('its_no, value, updated_at')
//       .eq('field_id', fieldId)
//       .eq('data_active', true)
//       .in('its_no', submitterIds)

//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//     responses = (pvData ?? []).map((pv: any) => ({
//       answer: pv.value,
//       filled_for: pv.its_no,
//       submitted_at: pv.updated_at,
//     }))
//   } else {
//     let responsesQuery = supabase
//       .from('form_responses')
//       .select('answer, filled_for, submitted_at')
//       .eq('form_id', formId)
//       .eq('profile_field_id', fieldId)

//     if (itsNoFilter !== null) {
//       responsesQuery = responsesQuery.in('filled_for', itsNoFilter)
//     }

//     const { data, error } = await responsesQuery
//     if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//     responses = data ?? []
//   }

//   if (responses.length === 0) {
//     return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
//   }

//   // Distribution
//   const distMap = new Map<string, number>()
//   for (const r of responses) {
//     const ans = r.answer ?? '(blank)'
//     distMap.set(ans, (distMap.get(ans) ?? 0) + 1)
//   }
//   const distribution: AnswerDist[] = Array.from(distMap.entries())
//     .map(([answer, count]) => ({ answer, count }))
//     .sort((a, b) => b.count - a.count)

//   const filledForIds = responses
//     .map(r => r.filled_for)
//     .filter((x): x is number => x !== null)
//   const uniqueFilledForIds = [...new Set(filledForIds)]

//   // Text fields — return entries table
//   if (field.field_type === 'text') {
//     const { data: memberData } = await supabase
//       .from('mumin')
//       .select('its_no, name')
//       .in('its_no', uniqueFilledForIds)

//     const memberMap = new Map((memberData ?? []).map((m: any) => [m.its_no, m.name]))

//     const textEntries: TextEntry[] = responses
//       .filter(r => r.answer && r.filled_for !== null)
//       .map(r => ({
//         its_no: r.filled_for as number,
//         name: memberMap.get(r.filled_for as number) ?? 'Unknown',
//         answer: r.answer as string,
//         submitted_at: r.submitted_at,
//       }))
//       .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

//     return NextResponse.json({ fields, field, distribution, bySector: [], textEntries })
//   }

//   // Select/radio/number — build sector/subsector breakdown
//   // Sector breakdown is naturally scoped because uniqueFilledForIds is already scoped
//   const { data: memberData } = await supabase
//     .from('mumin')
//     .select('its_no, subsector_id, subsector!subsector_id(subsector_name, sector_id, sector!sector_id(sector_name))')
//     .in('its_no', uniqueFilledForIds)

//   const memberGroupMap = new Map<number, string>()
//   for (const m of (memberData ?? []) as any[]) {
//     const group =
//       groupBy === 'sector'
//         ? m.subsector?.sector?.sector_name
//         : m.subsector?.subsector_name
//     if (group) memberGroupMap.set(m.its_no, group)
//   }

//   const sectorMap = new Map<string, Record<string, number>>()
//   for (const r of responses) {
//     if (r.filled_for === null) continue
//     const group = memberGroupMap.get(r.filled_for)
//     if (!group) continue
//     const ans = r.answer ?? '(blank)'
//     if (!sectorMap.has(group)) sectorMap.set(group, {})
//     const g = sectorMap.get(group)!
//     g[ans] = (g[ans] ?? 0) + 1
//   }

//   const bySector: SectorBreakdown[] = Array.from(sectorMap.entries())
//     .map(([name, answers]) => ({
//       name,
//       ...answers,
//       total: Object.values(answers).reduce((a, b) => a + b, 0),
//     }))
//     .sort((a, b) => (b.total as number) - (a.total as number))

//   return NextResponse.json({ fields, field, distribution, bySector, textEntries: [] } satisfies FormAnswersResponse)
// }
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { resolveScope } from '@/lib/analytics/resolveScope'

export interface FormFieldMeta {
  id: number;
  caption: string;
  field_type: string;
  behavior: string;
  is_required: boolean;
  sort_order: number;
}

export interface AnswerDist {
  answer: string;
  count: number;
}

export interface SectorBreakdown {
  name: string;
  total: number;
  [answer: string]: string | number;
}
export interface TextEntry {
  its_no: number;
  name: string;
  value: string; // Use 'value' to match Supabase
  submitted_at: string;
}

export interface FormAnswersResponse {
  meta: FormFieldMeta;      // Instead of 'fields'
  distribution: AnswerDist[];
  breakdown: SectorBreakdown[]; // Instead of 'bySector'
  textEntries: TextEntry[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = req.nextUrl
    const formId = searchParams.get('form_id')
    const fieldIdStr = searchParams.get('field_id')
    const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

    if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })
    const supabase = await createClient()

    // 1. Fetch Form Structure (Global fetch to prevent 404s)
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

    // 2. Resolve Access Scope
    const scopedSubsectorIds = await resolveScope(session)
    let itsNoFilter: number[] | null = null

    // If resolveScope returns null (Bypass), we don't apply the itsNoFilter
    if (scopedSubsectorIds !== null) {
      if (scopedSubsectorIds.length === 0 || (scopedSubsectorIds as number[]).includes(-1)) {
        itsNoFilter = [-1] // Safe exclusion
      } else {
        const { data: scopedMembers } = await supabase
          .from('mumin')
          .select('its_no')
          .in('subsector_id', scopedSubsectorIds)
          .eq('status', 'active')
        itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
      }
    }

    // 3. Fetch Responses
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

    // 4. Batched Member Lookup (The 1500+ record fix)
    // We use a type guard to ensure uniqueIds is purely number[]
    const uniqueIds: number[] = [...new Set(
      responses
        .map((r: any) => r.filled_for)
        .filter((id): id is number => id !== null)
    )]
    
    const memberMap = new Map<number, any>()
    const CHUNK_SIZE = 500

    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
      const { data: mData } = await supabase
        .from('mumin')
        .select(`
          its_no, 
          name, 
          subsector:subsector_id (
            subsector_name, 
            sector:sector_id (sector_name)
          )
        `)
        .in('its_no', chunk)
      
      mData?.forEach((m: any) => memberMap.set(m.its_no, m))
    }

    // 5. Build Aggregates
    const distMap = new Map<string, number>()
    const sectorMap = new Map<string, Record<string, number>>()

    for (const r of responses) {
      const ans = r.answer ?? '(blank)'
      distMap.set(ans, (distMap.get(ans) ?? 0) + 1)

      if (r.filled_for !== null) {
        const m = memberMap.get(r.filled_for)
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
        total: Object.values(answers).reduce((a: any, b: any) => a + b, 0)
      }))
      .sort((a, b) => (b.total as number) - (a.total as number))

    return NextResponse.json({ fields, field, distribution, bySector })

  } catch (err: any) {
    console.error('CRITICAL API ERROR:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// import { NextRequest, NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'

// // ... (Keep your Interfaces the same) ...

// async function resolveSubsectorIds(session: any, supabase: any): Promise<number[] | null> {
//   if (session.role === 'SuperAdmin') return null
//   if (session.role === 'Musaid') return session.subsector_ids ?? []
//   const sectorIds = session.sector_ids ?? []
//   if (!sectorIds.length) return []
//   const { data } = await supabase.from('subsector').select('id').in('sector_id', sectorIds)
//   return (data ?? []).map((s: any) => s.id)
// }

// // Helper to batch fetch members to avoid 413/Request Entity Too Large errors
// async function getBatchedMembers(supabase: any, ids: number[], groupBy: 'sector' | 'subsector') {
//   const CHUNK_SIZE = 500;
//   let allMemberData: any[] = [];
  
//   for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
//     const chunk = ids.slice(i, i + CHUNK_SIZE);
//     const { data } = await supabase
//       .from('mumin')
//       .select('its_no, name, subsector!subsector_id(subsector_name, sector!sector_id(sector_name))')
//       .in('its_no', chunk);
//     if (data) allMemberData = [...allMemberData, ...data];
//   }
//   return allMemberData;
// }

// export async function GET(req: NextRequest) {
//   try {
//     const session = await getSession()
//     if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

//     const { searchParams } = req.nextUrl
//     const formId = searchParams.get('form_id')
//     const fieldIdStr = searchParams.get('field_id')
//     const groupBy = (searchParams.get('group_by') ?? 'sector') as 'sector' | 'subsector'

//     if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 })
//     const supabase = await createClient()

//     // 1. Fetch Form Fields
//     const { data: formFieldsData } = await supabase
//       .from('form_fields')
//       .select('field_id, sort_order, is_required, profile_field(id, caption, field_type, behavior)')
//       .eq('form_id', formId)
//       .order('sort_order')

//     const fields = (formFieldsData ?? []).map((ff: any) => ({
//       id: ff.profile_field?.id ?? ff.field_id,
//       caption: ff.profile_field?.caption ?? 'Unknown',
//       field_type: ff.profile_field?.field_type ?? 'text',
//       behavior: ff.profile_field?.behavior ?? 'static',
//       is_required: ff.is_required ?? false,
//       sort_order: ff.sort_order ?? 0,
//     }))

//     if (!fieldIdStr) return NextResponse.json({ fields, distribution: [], bySector: [], textEntries: [] })

//     const fieldId = parseInt(fieldIdStr)
//     const field = fields.find(f => f.id === fieldId)
//     if (!field) return NextResponse.json({ error: 'Field not in this form' }, { status: 404 })

//     // 2. Resolve Scope
//     const scopedSubsectorIds = await resolveSubsectorIds(session, supabase)
//     let itsNoFilter: number[] | null = null

//     if (scopedSubsectorIds !== null) {
//       if (scopedSubsectorIds.length === 0) return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })
//       const { data: scopedMembers } = await supabase.from('mumin').select('its_no').in('subsector_id', scopedSubsectorIds).eq('status', 'active')
//       itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
//     }

//     // 3. Optimized Response Fetching
//     let responses: any[] = []
//     if (field.behavior === 'static') {
//       // Use a single join query if possible, otherwise keep the 2-step but add batching
//       const { data: submitterRows } = await supabase.from('form_responses').select('filled_for').eq('form_id', formId).eq('profile_field_id', fieldId).not('filled_for', 'is', null)
//       let submitterIds = [...new Set((submitterRows ?? []).map((r: any) => r.filled_for as number))]
      
//       if (itsNoFilter !== null) {
//         const filterSet = new Set(itsNoFilter)
//         submitterIds = submitterIds.filter(id => filterSet.has(id))
//       }

//       if (submitterIds.length > 0) {
//         // Batch the profile_value fetch
//         for (let i = 0; i < submitterIds.length; i += 500) {
//           const chunk = submitterIds.slice(i, i + 500);
//           const { data } = await supabase.from('profile_value').select('its_no, value, updated_at').eq('field_id', fieldId).eq('data_active', true).in('its_no', chunk)
//           if (data) responses = [...responses, ...data.map(pv => ({ answer: pv.value, filled_for: pv.its_no, submitted_at: pv.updated_at }))]
//         }
//       }
//     } else {
//       let q = supabase.from('form_responses').select('answer, filled_for, submitted_at').eq('form_id', formId).eq('profile_field_id', fieldId)
//       if (itsNoFilter !== null) q = q.in('filled_for', itsNoFilter)
//       const { data, error } = await q
//       if (error) throw error
//       responses = data ?? []
//     }

//     if (responses.length === 0) return NextResponse.json({ fields, field, distribution: [], bySector: [], textEntries: [] })

//     // 4. Distribution Logic (Memory Efficient)
//     const distMap = new Map<string, number>()
//     const uniqueIds = new Set<number>()
//     for (const r of responses) {
//       const ans = r.answer ?? '(blank)'
//       distMap.set(ans, (distMap.get(ans) ?? 0) + 1)
//       if (r.filled_for) uniqueIds.add(r.filled_for)
//     }

//     const distribution = Array.from(distMap.entries()).map(([answer, count]) => ({ answer, count })).sort((a, b) => b.count - a.count)
    
//     // 5. Batched Member Enrichment
//     const memberData = await getBatchedMembers(supabase, Array.from(uniqueIds), groupBy)
//     const memberMap = new Map(memberData.map((m: any) => [m.its_no, m]))

//     // 6. Final Formatting
//     if (field.field_type === 'text') {
//       const textEntries = responses
//         .filter(r => r.answer && r.filled_for && memberMap.has(r.filled_for))
//         .map(r => ({
//           its_no: r.filled_for,
//           name: memberMap.get(r.filled_for)?.name || 'Unknown',
//           answer: r.answer,
//           submitted_at: r.submitted_at
//         }))
//         .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
//       return NextResponse.json({ fields, field, distribution, bySector: [], textEntries })
//     }

//     const sectorMap = new Map<string, Record<string, number>>()
//     for (const r of responses) {
//       const m = memberMap.get(r.filled_for)
//       if (!m) continue
//       const group = groupBy === 'sector' ? m.subsector?.sector?.sector_name : m.subsector?.subsector_name
//       if (!group) continue
      
//       if (!sectorMap.has(group)) sectorMap.set(group, {})
//       const g = sectorMap.get(group)!
//       const ans = r.answer ?? '(blank)'
//       g[ans] = (g[ans] ?? 0) + 1
//     }

//     const bySector = Array.from(sectorMap.entries()).map(([name, answers]) => ({
//       name,
//       ...answers,
//       total: Object.values(answers).reduce((a, b) => a + b, 0),
//     })).sort((a, b) => (b.total as number) - (a.total as number))

//     return NextResponse.json({ fields, field, distribution, bySector, textEntries: [] })

//   } catch (err: any) {
//     console.error('CRITICAL API ERROR:', err.message)
//     return NextResponse.json({ error: 'Data processing timeout or error' }, { status: 500 })
//   }
// }