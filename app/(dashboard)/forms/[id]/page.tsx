import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { FormEditClient } from '@/components/forms/FormEditClient'
import type { Role } from '@/lib/types/app'

export default async function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  if (formErr || !form) redirect('/forms')

  const isCreator = Number(session.its_no) === form.created_by
  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  // Umoor Coordinators may manage forms belonging to their assigned umoor categories
  const isUmoorScoped =
    session.role === 'UmoorCoordinator' &&
    form.umoor_category_id !== null &&
    (session.umoor_ids ?? []).includes(form.umoor_category_id)
  if (!isCreator && !isAdmin && !isUmoorScoped) redirect('/forms')

  const { data: fieldRows } = await supabase
    .from('form_fields')
    .select(`
      id,
      field_id,
      sort_order,
      is_required,
      question_text,
      field_type_override,
      options_override,
      profile_field!inner (
        id,
        caption,
        field_type,
        behavior,
        options
      )
    `)
    .eq('form_id', id)
    .order('sort_order')

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <FormEditClient
        form={{
          id: form.id,
          title: form.title ?? '',
          description: form.description ?? '',
          status: form.status ?? 'draft',
          form_type: form.form_type ?? 'simple',
          created_by: form.created_by ?? 0,
          created_at: form.created_at ?? '',
        }}
        fields={(fieldRows ?? []) as any}
        role={session.role as Role}
        itsNo={session.its_no}
        umoorIds={session.umoor_ids}
      />
    </div>
  )
}
