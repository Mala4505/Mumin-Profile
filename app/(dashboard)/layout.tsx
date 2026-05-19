import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import type { Role } from '@/lib/types/app'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TopBar } from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const rawRole = headersList.get('x-user-role')
  const its_no = parseInt(headersList.get('x-user-its') ?? '0', 10)

  // proxy.ts sets these headers for all authenticated requests before layout renders
  if (!rawRole) redirect('/login')

  const role = rawRole as Role

  if (role === 'Mumin') {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader role={role} />
        <TopBar role={role} its_no={its_no} />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-6">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <AppSidebar role={role} itsNo={its_no} />
      </div>
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header — shown only on mobile */}
        <div className="md:hidden">
          <MobileHeader role={role} />
        </div>
        {/* Desktop top bar now uses TopBar */}
        <TopBar role={role} its_no={its_no} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
