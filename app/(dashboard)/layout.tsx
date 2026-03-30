import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.role === 'Mumin') {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:hidden">
          <MobileHeader role={session.role} />
        </div>
        <main className="max-w-2xl mx-auto px-4 py-6 md:py-10">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <AppSidebar role={session.role} itsNo={session.its_no} />
      </div>
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header — shown only on mobile */}
        <div className="md:hidden">
          <MobileHeader role={session.role} />
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
