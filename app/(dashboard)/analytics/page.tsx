import { getSession } from '@/lib/auth/getSession'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') redirect('/dashboard')
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <AnalyticsDashboard />
    </div>
  )
}
