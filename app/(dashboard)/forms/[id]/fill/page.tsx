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
  if (!['Masool', 'Musaid'].includes(session.role)) redirect('/dashboard')

  return <BulkFillForm formId={id} role={session.role} />
}
