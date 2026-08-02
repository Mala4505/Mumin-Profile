import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import type { Role, LoginMode } from '@/lib/types/app'
import { createClient } from '@/lib/supabase/server'
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
  const loginMode = (headersList.get('x-login-mode') ?? 'admin') as LoginMode
  const isUserViewMode = role !== 'Mumin' && loginMode === 'user'

  // Resolved once here and shared by both chrome components — MobileHeader used
  // to receive no name at all, so its avatar was permanently the literal "U".
  const supabase = await createClient()
  const { data: muminData } = await supabase
    .from('mumin')
    .select('name')
    .eq('its_no', its_no)
    .single()
  const userName = muminData?.name ?? `#${its_no}`

  if (role === 'Mumin' || isUserViewMode) {
    return (
      <div className="min-h-screen bg-background">
        {/* MobileHeader is the phone/tablet bar, TopBar is the desktop one —
            each must hide where the other takes over, or both render at once. */}
        <div className="md:hidden">
          <MobileHeader role={role} userName={userName} loginMode={loginMode} />
        </div>
        <TopBar role={role} its_no={its_no} userName={userName} loginMode={loginMode} />
        <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] pb-6 md:pt-0">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <AppSidebar role={role} loginMode={loginMode} />
      </div>
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header — shown only on mobile */}
        <div className="md:hidden">
          <MobileHeader role={role} userName={userName} loginMode={loginMode} />
        </div>
        {/* Desktop top bar now uses TopBar */}
        <TopBar role={role} its_no={its_no} userName={userName} loginMode={loginMode} />
        <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
