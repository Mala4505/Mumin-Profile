import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import {
  getSuperAdminStats,
  getAdminStats,
  getMasoolStats,
  getMusaidStats,
  getMuminStats,
} from '@/lib/dashboard/getStats'
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import MasoolDashboard from '@/components/dashboard/MasoolDashboard'
import MusaidDashboard from '@/components/dashboard/MusaidDashboard'
import MuminDashboard from '@/components/dashboard/MuminDashboard'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.role === 'SuperAdmin') {
    const stats = await getSuperAdminStats()
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <SuperAdminDashboard stats={stats} />
      </div>
    )
  }

  if (session.role === 'Admin') {
    const stats = await getAdminStats(session)
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <AdminDashboard stats={stats} />
      </div>
    )
  }

  if (session.role === 'Masool') {
    const stats = await getMasoolStats(session)
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <MasoolDashboard stats={stats} />
      </div>
    )
  }

  if (session.role === 'Musaid') {
    const stats = await getMusaidStats(session)
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <MusaidDashboard stats={stats} />
      </div>
    )
  }

  // Mumin
  const stats = await getMuminStats(session.its_no)
  if (!stats) redirect('/members')
  return <MuminDashboard stats={stats} />
}
