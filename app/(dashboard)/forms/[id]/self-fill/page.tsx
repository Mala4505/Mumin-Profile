import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { SelfFillForm } from '@/components/forms/SelfFillForm'
import type { Form, FormQuestion, FillerAccess } from '@/lib/types/forms'

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

  const { data: formData, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !formData) notFound()
  const form = formData as unknown as Form

  if (form.status !== 'published') redirect('/forms')
  if (form.expires_at && new Date(form.expires_at) < new Date()) redirect('/forms')

  // Verify self-fill is enabled for this form
  const fillerAccess = form.filler_access as FillerAccess | null
  const selfAllowed = fillerAccess?.fillers?.some((f) => f.type === 'self') ?? false
  if (!selfAllowed) redirect('/forms')

  // Verify this mumin is in the form audience
  const { data: inAudience } = await (supabase as any)
    .from('form_audience')
    .select('its_no')
    .eq('form_id', id)
    .eq('its_no', Number(session.its_no))
    .single()

  if (!inAudience) redirect('/forms')

  // Load form fields with options
  const { data: fieldsData } = await (supabase as any)
    .from('form_fields')
    .select(`
      field_id,
      sort_order,
      is_required,
      question_text,
      field_type_override,
      options_override,
      profile_field:field_id (
        caption,
        field_type,
        behavior,
        options
      )
    `)
    .eq('form_id', id)
    .order('sort_order')

  const formFields: (FormQuestion & { field_type: string; options?: string[] | null })[] = (
    fieldsData ?? []
  ).map((ff: any) => ({
    profile_field_id: ff.field_id,
    question_text: ff.question_text ?? ff.profile_field?.caption ?? '',
    sort_order: ff.sort_order ?? 0,
    behavior: ff.profile_field?.behavior ?? 'historical',
    field_type: ff.field_type_override ?? ff.profile_field?.field_type ?? 'text',
    options: ff.options_override ?? ff.profile_field?.options ?? null,
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <SelfFillForm form={form} itsNo={session.its_no} formFields={formFields} />
    </div>
  )
}
