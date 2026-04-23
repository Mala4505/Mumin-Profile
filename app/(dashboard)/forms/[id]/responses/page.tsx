import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import { FormResponsesClient } from '@/components/forms/FormResponsesClient'
import { Database } from '@/lib/types/database'
import type { Form as DomainForm, FillerAccess, AudienceFilters } from '@/lib/types/forms'

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role === 'Mumin') redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  type DbForm = Database['public']['Tables']['forms']['Row']
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*, questions')
    .eq('id', id)
    .single<DbForm & { questions: Array<{ profile_field_id: number; question_text: string }> | null }>()

  if (formErr || !form) redirect('/forms')

  const domainForm: DomainForm = {
    id: form.id,
    title: form.title,
    description: form.description ?? undefined,
    umoor_category_id: form.umoor_category_id ?? undefined,
    created_by: form.created_by ?? 0, // keep as number
    form_type: form.form_type as DomainForm['form_type'],
    audience_filters: (form.audience_filters as unknown as AudienceFilters) ?? {},
    filler_access: (form.filler_access as unknown as FillerAccess) ?? { fillers: [] },
    status: form.status as DomainForm['status'],
    approved_by: form.approved_by ?? undefined,
    approved_at: form.approved_at ?? undefined,
    expires_at: form.expires_at ?? undefined,
    published_at: form.published_at ?? undefined,
    created_at: form.created_at ?? '',
    // questions removed — use form_fields instead in future
  }

  if (session.role === 'Masool' || session.role === 'Musaid') {
    if (!isAuthorizedFiller(domainForm.filler_access, session)) {
      redirect('/forms')
    }
  }

  // Fetch raw responses (one row per answer)
  const { data: rawResponses } = await supabase
    .from('form_responses')
    .select('*')
    .eq('form_id', id)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })

  // Fetch audience with its_no
  const { data: audienceData } = await supabase
    .from('form_audience')
    .select('its_no')
    .eq('form_id', id)

  // Fetch all mumins needed for audience (to get name and subsector)
  const audienceItsNos = audienceData?.map(a => a.its_no) ?? []
  let mumins: Array<{ its_no: number; name: string; subsector_id: number }> = []
  if (audienceItsNos.length > 0) {
    const { data: muminData } = await supabase
      .from('mumin')
      .select('its_no, name, subsector_id')
      .in('its_no', audienceItsNos)
    mumins = muminData ?? []
  }

  // Fetch subsectors for audience
  const subsectorIds = [...new Set(mumins.map(m => m.subsector_id))]
  let subsectors: Record<number, string> = {}
  if (subsectorIds.length > 0) {
    const { data: subsectorData } = await supabase
      .from('subsector')
      .select('subsector_id, subsector_name')
      .in('subsector_id', subsectorIds)
    subsectors = Object.fromEntries(
      (subsectorData ?? []).map(s => [s.subsector_id, s.subsector_name])
    )
  }

  // Build audience array with mumin info
  const audience = (audienceData ?? []).map(a => {
    const mumin = mumins.find(m => m.its_no === a.its_no)
    return {
      its_no: a.its_no,
      mumin: mumin ? {
        name: mumin.name,
        subsector: subsectors[mumin.subsector_id] ? { name: subsectors[mumin.subsector_id] } : undefined
      } : undefined
    }
  })

  // Use form questions for the charts tab
  const formFields = (form.questions as any) ?? []

  // Group responses by person
  type ResponseRow = NonNullable<typeof rawResponses>[number]
  const responsesByPerson = new Map<number, ResponseRow[]>()
  for (const r of rawResponses ?? []) {
    const itsNo = r.filled_for ?? 0
    if (!responsesByPerson.has(itsNo)) {
      responsesByPerson.set(itsNo, [])
    }
    responsesByPerson.get(itsNo)!.push(r)
  }

  // Fetch mumin info for responses
  const responseItsNos = Array.from(responsesByPerson.keys())
  let responseMumins: Record<number, { name: string; its_no: number }> = {}
  if (responseItsNos.length > 0) {
    const { data: muminResponseData } = await supabase
      .from('mumin')
      .select('its_no, name')
      .in('its_no', responseItsNos)
    responseMumins = Object.fromEntries(
      (muminResponseData ?? []).map(m => [m.its_no, m])
    )
  }

  // Transform to component format
  const responses = Array.from(responsesByPerson.entries()).map(([itsNo, rows]) => {
    const firstRow = rows[0]!
    return {
      id: firstRow.id,
      filled_for: itsNo,
      responses: rows.map(r => ({
        profile_field_id: r.profile_field_id ?? 0,
        answer: r.answer ?? ''
      })),
      submitted_at: firstRow.submitted_at,
      mumin: responseMumins[itsNo]
    }
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <FormResponsesClient
        form={domainForm}
        formFields={formFields}
        responses={responses}
        audience={audience}
        role={session.role}
      />
    </div>
  )
}
