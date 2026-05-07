// import { NextResponse } from 'next/server'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'

// export interface FormRate {
//   id: string
//   title: string
//   responses: number
//   total: number
//   pct: number
// }

// export async function GET() {
//   const session = await getSession()
//   if (!session) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   const supabase = await createClient()
//   const now = new Date().toISOString()

//   const { data: forms } = await supabase
//     .from('forms')
//     .select('id, title')
//     .eq('status', 'published')
//     .or(`expires_at.is.null,expires_at.gt.${now}`)

//   if (!forms || forms.length === 0) return NextResponse.json([])

//   // Resolve scope and member total
//   let memberTotal: number
//   let itsNoFilter: number[] | null = null // null = no filter (SuperAdmin)

//   if (session.role !== 'SuperAdmin') {
//     // Resolve subsector IDs for this role
//     let assignedSubsectorIds: any[] = []

//     if (session.role === 'Musaid') {
//       assignedSubsectorIds = session.subsector_ids ?? []
//     } else {
//       // Admin or Masool: resolve via sector_ids
//       const sectorIds = session.sector_ids ?? []
//       if (sectorIds.length > 0) {
//         const { data: subsectorRows } = await supabase
//           .from('subsector')
//           .select('id')
//           .in('sector_id', sectorIds)
//         assignedSubsectorIds = (subsectorRows ?? []).map((s: any) => s.id)
//       }
//     }

//     if (assignedSubsectorIds.length === 0) {
//       return NextResponse.json(
//         (forms as Array<{ id: string; title: string }>).map(f => ({
//           id: f.id, title: f.title, responses: 0, total: 0, pct: 0,
//         }))
//       )
//     }

//     const { data: scopedMembers } = await supabase
//       .from('mumin')
//       .select('its_no')
//       .in('subsector_id', assignedSubsectorIds)
//       .eq('status', 'active')

//     itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
//     memberTotal = itsNoFilter.length
//   } else {
//     const { count } = await supabase
//       .from('mumin')
//       .select('its_no', { count: 'exact', head: true })
//       .eq('status', 'active')
//     memberTotal = count ?? 0
//   }

//   // Pre-fetch valid field IDs for all forms so orphaned form_responses rows are excluded
//   const formIds = (forms as Array<{ id: string; title: string }>).map(f => f.id)
//   const { data: allFormFields } = await supabase
//     .from('form_fields')
//     .select('form_id, field_id')
//     .in('form_id', formIds)

//   const formFieldMap = new Map<string, number[]>()
//   for (const ff of (allFormFields ?? []) as any[]) {
//     const existing = formFieldMap.get(ff.form_id) ?? []
//     existing.push(ff.field_id)
//     formFieldMap.set(ff.form_id, existing)
//   }

//   const rates = await Promise.all(
//     (forms as Array<{ id: string; title: string }>).map(async (form) => {
//       const validFieldIds = formFieldMap.get(form.id) ?? []
//       if (validFieldIds.length === 0) {
//         return { id: form.id, title: form.title, responses: 0, total: memberTotal, pct: 0 }
//       }

//       let query = supabase
//         .from('form_responses')
//         .select('filled_for')
//         .eq('form_id', form.id)
//         .in('profile_field_id', validFieldIds)
//         .not('filled_for', 'is', null)

//       if (itsNoFilter !== null) {
//         query = query.in('filled_for', itsNoFilter)
//       }

//       const { data: respondentRows } = await query
//       const responses = new Set((respondentRows ?? []).map((r: any) => r.filled_for)).size
//       const pct = memberTotal > 0 ? Math.round((responses / memberTotal) * 100) : 0
//       return { id: form.id, title: form.title, responses, total: memberTotal, pct }
//     })
//   )

//   rates.sort((a, b) => a.pct - b.pct)

//   return NextResponse.json(rates)
// }


import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { resolveScope } from '@/lib/analytics/resolveScope'

export interface FormRate {
  id: string
  title: string
  responses: number
  total: number
  pct: number
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // 1. Fetch Active Forms
  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('id, title')
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  if (formsError) throw formsError
  if (!forms || forms.length === 0) return NextResponse.json([])

  // 2. Resolve Scope using the bypass logic
  // If resolveScope returns null, the user sees everything (SuperAdmin/Masool/Musaid bypass)
  const scopedSubsectorIds = await resolveScope(session)
  let itsNoFilter: number[] | null = null
  let memberTotal: number = 0

  if (scopedSubsectorIds !== null) {
    // If scope is restricted, filter mumin count by those subsectors
    const { data: scopedMembers, count } = await supabase
      .from('mumin')
      .select('its_no', { count: 'exact' })
      .in('subsector_id', scopedSubsectorIds)
      .eq('status', 'active')

    itsNoFilter = (scopedMembers ?? []).map((m: any) => m.its_no)
    memberTotal = count ?? 0
    
    // Safety: if assigned scope has 0 members, return 0 for all forms
    if (memberTotal === 0) {
      return NextResponse.json(forms.map(f => ({
        id: f.id, title: f.title, responses: 0, total: 0, pct: 0
      })))
    }
  } else {
    // Bypass: Get global count
    const { count } = await supabase
      .from('mumin')
      .select('its_no', { count: 'exact', head: true })
      .eq('status', 'active')
    memberTotal = count ?? 0
  }

  // 3. Pre-fetch Field IDs to filter responses accurately
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

  // 4. Calculate Rates per Form
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
      // Count unique ITS numbers who responded to this specific form
      const uniqueRespondents = new Set((respondentRows ?? []).map((r: any) => r.filled_for)).size
      
      const pct = memberTotal > 0 ? Math.round((uniqueRespondents / memberTotal) * 100) : 0
      
      return { 
        id: form.id, 
        title: form.title, 
        responses: uniqueRespondents, 
        total: memberTotal, 
        pct 
      }
    })
  )

  return NextResponse.json(rates.sort((a, b) => a.pct - b.pct))
}