import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { FormsClient } from '@/components/forms/FormsClient'

export default async function FormsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  // Mumin can visit /forms — they see only their self-fill forms (filtered in FormsClient)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Forms
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {session.role === 'Mumin'
            ? 'Forms assigned to you'
            : 'Create, manage and review masool/musaid forms'}
        </p>
      </div>
      <FormsClient role={session.role} itsNo={session.its_no} />
    </div>
  )
}
