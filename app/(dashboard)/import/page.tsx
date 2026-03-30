import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { ImportForm } from '@/components/import/ImportForm'

export default async function ImportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/members')

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          CSV Import
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Import member data from a CSV file.{' '}
          {session.role === 'SuperAdmin'
            ? 'Import core member records.'
            : 'Import profile data.'}
        </p>
      </div>
      <ImportForm role={session.role} />
    </div>
  )
}
