import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { BulkFillForm } from '@/components/forms/BulkFillForm'

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

  return (
    <BulkFillForm
      formId={id}
      role={session.role}
      itsNo={session.its_no}
      isHof={isHof}
      hofSabelNo={isHof ? session.sabeel_no : undefined}
    />
  )
}
