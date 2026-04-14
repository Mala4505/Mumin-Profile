// import { redirect } from 'next/navigation'
// import { getSession } from '@/lib/auth/getSession'
// import { createClient } from '@/lib/supabase/server'
// import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
// import { FormResponsesClient } from '@/components/forms/FormResponsesClient'

// export default async function FormResponsesPage({
//   params,
// }: {
//   params: Promise<{ id: string }>
// }) {
//   const session = await getSession()
//   if (!session || session.role === 'Mumin') redirect('/dashboard')

//   const { id } = await params
//   const supabase = await createClient()

//   // Fetch the form
//   const { data: form, error: formErr } = await supabase
//     .from('forms')
//     .select('*')
//     .eq('id', id)
//     .single()

//   if (formErr || !form) redirect('/forms')

//   // Masool/Musaid: must be an authorized filler to view responses
//   if (session.role === 'Masool' || session.role === 'Musaid') {
//     if (!isAuthorizedFiller(form.filler_access, session)) redirect('/forms')
//   }

//   // Fetch responses joined with mumin name
//   const { data: responses } = await supabase
//     .from('form_response')
//     .select('*, mumin!filled_for(name, its_no)')
//     .eq('form_id', id)
//     .eq('submitted', true)
//     .order('submitted_at', { ascending: false })

//   // Fetch audience joined with subsector name
//   const { data: audience } = await supabase
//     .from('form_audience')
//     .select('its_no, mumin!its_no(name, subsector!subsector_id(name))')
//     .eq('form_id', id)

//   return (
//     <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
//       <FormResponsesClient
//         form={form}
//         responses={responses ?? []}
//         audience={audience ?? []}
//         role={session.role}
//       />
//     </div>
//   )
// }
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import { FormResponsesClient } from '@/components/forms/FormResponsesClient'
import { Database } from '@/lib/types/database'
import type { Form as DomainForm, FillerAccess, FormQuestion, AudienceFilters } from '@/lib/types/forms' // 👈 your domain model

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role === 'Mumin') redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  // Fetch the form from Supabase
  type DbForm = Database['public']['Tables']['forms']['Row']

  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single<DbForm>()

  if (formErr || !form) redirect('/forms')

  // Cast Supabase row into your domain Form type
const domainForm: DomainForm = {
  id: form.id,
  title: form.title,
  description: form.description ?? undefined,
  umoor_category_id: form.umoor_category_id?.toString(),
  created_by: form.created_by?.toString() ?? '',
  form_type: form.form_type as DomainForm['form_type'],
  questions: (form.questions as unknown as FormQuestion[]) ?? [],
  audience_filters: (form.audience_filters as unknown as AudienceFilters) ?? {},
  filler_access: (form.filler_access as unknown as FillerAccess) ?? { fillers: [] },
  status: form.status as DomainForm['status'],
  approved_by: form.approved_by?.toString(),
  approved_at: form.approved_at ?? undefined,
  expires_at: form.expires_at ?? undefined,
  published_at: form.published_at ?? undefined,
  created_at: form.created_at ?? '',
}


  // Masool/Musaid: must be an authorized filler to view responses
  if (session.role === 'Masool' || session.role === 'Musaid') {
    if (!isAuthorizedFiller(domainForm.filler_access, session)) {
      redirect('/forms')
    }
  }

  // Fetch responses joined with mumin name
  const { data: responses } = await supabase
    .from('form_response')
    .select('*, mumin!filled_for(name, its_no)')
    .eq('form_id', id)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })

  // Fetch audience joined with subsector name
  const { data: audience } = await supabase
    .from('form_audience')
    .select('its_no, mumin!its_no(name, subsector!subsector_id(name))')
    .eq('form_id', id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <FormResponsesClient
        form={domainForm}
        responses={responses ?? []}
        audience={audience ?? []}
        role={session.role}
      />
    </div>
  )
}
