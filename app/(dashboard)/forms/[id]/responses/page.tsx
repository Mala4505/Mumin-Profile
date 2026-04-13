import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import { FormResponsesClient } from '@/components/forms/FormResponsesClient'

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role === 'Mumin') redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  // Fetch the form
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  if (formErr || !form) redirect('/forms')

  // Masool/Musaid: must be an authorized filler to view responses
  if (session.role === 'Masool' || session.role === 'Musaid') {
    if (!isAuthorizedFiller(form.filler_access, session)) redirect('/forms')
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
        form={form}
        responses={responses ?? []}
        audience={audience ?? []}
        role={session.role}
      />
    </div>
  )
}
