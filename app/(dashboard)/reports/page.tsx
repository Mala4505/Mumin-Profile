import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { getSectors } from '@/lib/members/getMembers'
import { ReportsClient } from '@/components/reports/ReportsClient'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/members')

  const sectors = await getSectors()

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Reports &amp; Export
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Filter members and export to Excel
        </p>
      </div>
      <ReportsClient sectors={sectors} role={session.role} />
    </div>
  )
}
