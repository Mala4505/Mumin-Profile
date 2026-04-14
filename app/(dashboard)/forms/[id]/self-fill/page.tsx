import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { SelfFillForm } from '@/components/forms/SelfFillForm'
import type { Form } from '@/lib/types/forms'

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

  // Fetch the form
  const { data: formData, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !formData) notFound()

  const form = formData as unknown as Form

  // Only allow self-fill on published, non-expired forms
  if (form.status !== 'published') redirect('/dashboard')
  if (form.expires_at && new Date(form.expires_at) < new Date()) redirect('/dashboard')

  // Verify the Mumin is in the form's audience
  const { data: inAudience } = await supabase
    .from('form_audience')
    .select('its_no')
    .eq('form_id', id)
    .eq('its_no', String(session.its_no))
    .single()

  if (!inAudience) redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <SelfFillForm form={form} itsNo={session.its_no} />
    </div>
  )
}
