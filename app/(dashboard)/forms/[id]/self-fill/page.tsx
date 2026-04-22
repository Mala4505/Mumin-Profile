import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { SelfFillForm } from '@/components/forms/SelfFillForm'
import type { Form, FormQuestion } from '@/lib/types/forms'

export default async function SelfFillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'Mumin') redirect('/dashboard')

  const supabase = createAdminClient()

  // Load form metadata
  const { data: formData, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !formData) notFound()
  const form = formData as unknown as Form

  if (form.status !== 'published') redirect('/dashboard')
  if (form.expires_at && new Date(form.expires_at) < new Date()) redirect('/dashboard')

  // Verify this mumin is in the form audience
  const { data: inAudience } = await (supabase as any)
    .from('form_audience')
    .select('its_no')
    .eq('form_id', id)
    .eq('its_no', Number(session.its_no))
    .single()

  if (!inAudience) redirect('/dashboard')

  // Load form fields (questions) from the relational form_fields table
  const { data: fieldsData } = await (supabase as any)
    .from('form_fields')
    .select(`
      field_id,
      sort_order,
      is_required,
      profile_field:field_id (
        caption,
        field_type,
        behavior
      )
    `)
    .eq('form_id', id)
    .order('sort_order')

  const formFields: (FormQuestion & { field_type: string })[] = (fieldsData ?? []).map(
    (ff: any) => ({
      profile_field_id: ff.field_id,
      question_text: ff.profile_field?.caption ?? '',
      sort_order: ff.sort_order ?? 0,
      behavior: ff.profile_field?.behavior ?? 'static',
      field_type: ff.profile_field?.field_type ?? 'text',
    })
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <SelfFillForm form={form} itsNo={session.its_no} formFields={formFields} />
    </div>
  )
}
