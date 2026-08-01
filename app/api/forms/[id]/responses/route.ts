// app/api/forms/[id]/responses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import type { FillerAccess } from '@/lib/types/forms'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()
  const { data: form, error: formErr } = await supabase.from('forms').select('*').eq('id', id).single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  const isStaff = ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'].includes(session.role)
  const responseViewerRoles = form.response_viewer_roles as string[] | null

  // Determine if this role can view responses under the new granular gate.
  // null = open to all (fall through to legacy logic).
  // non-null = must be in the list (Admin/SuperAdmin always pass).
  function roleCanViewResponses(): boolean {
    if (isAdmin) return true
    if (responseViewerRoles !== null) {
      return responseViewerRoles.includes(session!.role)
    }
    // Legacy: staff_only check
    if (form!.viewable_by_roles === 'staff_only') return isStaff
    return true
  }

  // Fetch form_fields so we can strip hidden question answers
  const { data: formFields } = await supabase
    .from('form_fields')
    .select('field_id, hidden_from_roles')
    .eq('form_id', id)

  // Build set of field_ids hidden from the viewer's role (Admin sees all)
  const hiddenFieldIds = new Set<number>()
  if (!isAdmin && formFields) {
    for (const ff of formFields) {
      const hidden = (ff.hidden_from_roles as string[]) ?? []
      if (hidden.includes(session.role)) hiddenFieldIds.add(ff.field_id as number)
    }
  }

  function stripHiddenAnswers(responses: any[]): any[] {
    if (isAdmin || hiddenFieldIds.size === 0) return responses
    return responses.filter(r => !hiddenFieldIds.has(r.profile_field_id as number))
  }

  // Mumin: can only see own responses if allowed by visibility gate
  if (session.role === 'Mumin') {
    if (!roleCanViewResponses()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: ownResponses, error: respErr } = await supabase
      .from('form_responses')
      .select('*, mumin!filled_for(name, its_no)')
      .eq('form_id', id)
      .eq('filled_for', Number(session.its_no))
      .eq('submitted', true)
      .order('submitted_at', { ascending: false })

    if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })
    return NextResponse.json({ form, responses: stripHiddenAnswers(ownResponses ?? []), audience: [] })
  }

  if (!isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Masool/Musaid: check they're authorized to view this form's responses
  if (session.role === 'Masool' || session.role === 'Musaid') {
    // Must be able to view responses (new gate)
    if (!roleCanViewResponses()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isCreator = Number(session.its_no) === form.created_by
    const fillerAccess = form.filler_access as FillerAccess | null
    if (!isCreator && (!fillerAccess || !isAuthorizedFiller(fillerAccess, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // UmoorCoordinator: may view responses for own forms or forms in their assigned umoors
  if (session.role === 'UmoorCoordinator') {
    if (!roleCanViewResponses()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isCreator = Number(session.its_no) === form.created_by
    const isUmoorScoped =
      form.umoor_category_id !== null &&
      (session.umoor_ids ?? []).includes(form.umoor_category_id)
    if (!isCreator && !isUmoorScoped) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: responses, error: respErr } = await supabase
    .from('form_responses')
    .select('*, mumin!filled_for(name, its_no)')
    .eq('form_id', id)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  const { data: audience, error: audErr } = await supabase
    .from('form_audience')
    .select('its_no, mumin!its_no(name, subsector!subsector_id(name))')
    .eq('form_id', id)

  if (audErr) return NextResponse.json({ error: audErr.message }, { status: 500 })

  return NextResponse.json({
    form,
    responses: stripHiddenAnswers(responses ?? []),
    audience: audience ?? [],
  })
}
