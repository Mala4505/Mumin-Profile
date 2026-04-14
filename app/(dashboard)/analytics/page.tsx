import { getSession } from '@/lib/auth/getSession'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') redirect('/dashboard')
  return <AnalyticsDashboard />
}
