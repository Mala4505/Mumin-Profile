import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { ImportForm } from '@/components/import/ImportForm'
import { FormImportSection } from '@/components/import/FormImportSection'

export default async function ImportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/members')

  return (
    <div className="p-6 space-y-10">
      <div>
        <h1 className="text-xl font-semibold mb-1">Member & Profile Data</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Import core member records and profile field values.
        </p>
        <ImportForm />
      </div>

      {(['SuperAdmin', 'Admin', 'Masool'] as string[]).includes(session.role) && (
        <>
          <hr className="border-border" />
          <div>
            <h2 className="text-xl font-semibold mb-1">Form Response Data</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Bulk-import CSV responses into a published form. Static answers update member
              profiles permanently; historical answers appear in profile timelines.
            </p>
            <FormImportSection />
          </div>
        </>
      )}
    </div>
  )
}
