import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import { BulkFillForm } from '@/components/forms/BulkFillForm'
import type { FillerAccess } from '@/lib/types/forms'

export default async function FillFormPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const isStaff = ['Masool', 'Musaid'].includes(session.role)
  const isHof = session.is_hof

  if (!isStaff && !isHof) redirect('/dashboard')

  // Load form and verify this user is an authorized filler
  const supabase = createAdminClient()
  const { data: form, error } = await supabase
    .from('forms')
    .select('id, status, expires_at, filler_access')
    .eq('id', id)
    .single()

  if (error || !form) redirect('/forms')
  if (form.status !== 'published') redirect('/forms')
  if (form.expires_at && new Date(form.expires_at) < new Date()) redirect('/forms')

  // HOF fills for their family — bypass filler_access check
  if (!isHof) {
    const fillerAccess = form.filler_access as FillerAccess | null
    if (!fillerAccess || !isAuthorizedFiller(fillerAccess, session)) {
      redirect('/forms')
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <BulkFillForm
        formId={id}
        role={session.role}
        itsNo={session.its_no}
      />
    </div>
  )
}
