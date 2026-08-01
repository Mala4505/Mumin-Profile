import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth/getSession'
import {
  getSuperAdminStats,
  getAdminStats,
  getMasoolStats,
  getMusaidStats,
  getMuminStats,
  getUmoorCoordinatorStats,
} from '@/lib/dashboard/getStats'
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import MasoolDashboard from '@/components/dashboard/MasoolDashboard'
import MusaidDashboard from '@/components/dashboard/MusaidDashboard'
import MuminDashboard from '@/components/dashboard/MuminDashboard'
import UmoorCoordinatorDashboard from '@/components/dashboard/UmoorCoordinatorDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import type { SessionUser } from '@/lib/types/app'

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <Skeleton className="h-5 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

async function SuperAdminContent() {
  const stats = await getSuperAdminStats()
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <SuperAdminDashboard stats={stats} />
    </div>
  )
}

async function AdminContent({ session }: { session: SessionUser }) {
  const stats = await getAdminStats(session)
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <AdminDashboard stats={stats} />
    </div>
  )
}

async function MasoolContent({ session }: { session: SessionUser }) {
  const stats = await getMasoolStats(session)
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <MasoolDashboard stats={stats} />
    </div>
  )
}

async function MusaidContent({ session }: { session: SessionUser }) {
  const stats = await getMusaidStats(session)
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <MusaidDashboard stats={stats} />
    </div>
  )
}

async function UmoorCoordinatorContent({ session }: { session: SessionUser }) {
  const stats = await getUmoorCoordinatorStats(session)
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <UmoorCoordinatorDashboard stats={stats} />
    </div>
  )
}

async function MuminContent({ itsNo }: { itsNo: number }) {
  const stats = await getMuminStats(itsNo)
  if (!stats) redirect('/members')
  return <MuminDashboard stats={stats} />
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const headersList = await headers()
  const loginMode = headersList.get('x-login-mode') ?? 'admin'

  if (loginMode === 'user') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <MuminContent itsNo={session.its_no} />
      </Suspense>
    )
  }

  if (session.role === 'SuperAdmin') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <SuperAdminContent />
      </Suspense>
    )
  }

  if (session.role === 'Admin') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminContent session={session} />
      </Suspense>
    )
  }

  if (session.role === 'Masool') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <MasoolContent session={session} />
      </Suspense>
    )
  }

  if (session.role === 'Musaid') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <MusaidContent session={session} />
      </Suspense>
    )
  }

  if (session.role === 'UmoorCoordinator') {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <UmoorCoordinatorContent session={session} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MuminContent itsNo={session.its_no} />
    </Suspense>
  )
}
