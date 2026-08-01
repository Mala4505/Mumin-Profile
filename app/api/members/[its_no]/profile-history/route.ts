import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ its_no: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { its_no } = await params
  const targetItsNo = parseInt(its_no)
  if (isNaN(targetItsNo)) return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })

  if (session.role === 'Mumin' && session.its_no !== targetItsNo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('form_responses')
    .select(`
      profile_field_id,
      answer,
      submitted_at,
      event:event_id(title),
      forms:form_id(title, viewable_by_roles),
      profile_field:profile_field_id(
        caption, field_type, visibility_level, category_id,
        profile_category!inner(name, sort_order)
      )
    `)
    .eq('filled_for', targetItsNo)
    .eq('submitted', true)
    .not('profile_field_id', 'is', null)
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fieldMap = new Map<number, {
    field_id: number
    caption: string
    field_type: string
    category_name: string
    category_sort_order: number
    entries: { answer: string; submitted_at: string; label: string | null }[]
  }>()

  // UmoorCoordinators only see history for fields in their assigned umoors
  // (app-level filter — this route uses the service-role client which bypasses RLS)
  const scopedCategoryIds =
    session.role === 'UmoorCoordinator'
      ? (session.umoor_ids.length > 0 ? session.umoor_ids : [-1])
      : null

  for (const row of (data ?? []) as any[]) {
    const pf = row.profile_field as any
    if (!pf) continue

    // Umoor scope gate for coordinators
    if (scopedCategoryIds !== null && !scopedCategoryIds.includes(pf.category_id)) continue

    // Skip entries from staff_only forms
    const formMeta = row.forms as any
    if (formMeta?.viewable_by_roles === 'staff_only') continue

    const fieldId = row.profile_field_id as number

    if (!fieldMap.has(fieldId)) {
      fieldMap.set(fieldId, {
        field_id: fieldId,
        caption: pf.caption,
        field_type: pf.field_type,
        category_name: pf.profile_category?.name ?? '',
        category_sort_order: pf.profile_category?.sort_order ?? 0,
        entries: [],
      })
    }

    const eventTitle = (row.event as any)?.title ?? null
    const formTitle = formMeta?.title ?? null
    const label = eventTitle ?? formTitle

    fieldMap.get(fieldId)!.entries.push({
      answer: row.answer ?? '',
      submitted_at: row.submitted_at,
      label,
    })
  }

  const history = Array.from(fieldMap.values())

  return NextResponse.json({ history })
}
