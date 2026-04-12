import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { FormsClient } from '@/components/forms/FormsClient'

export default async function FormsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/dashboard')

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Forms
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create, manage and review community forms
        </p>
      </div>
      <FormsClient role={session.role} />
    </div>
  )
}
