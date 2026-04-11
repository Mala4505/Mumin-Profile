import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { ImportForm } from '@/components/import/ImportForm'

export default async function ImportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/members')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Import Data</h1>
      <ImportForm />
    </div>
  )
}
