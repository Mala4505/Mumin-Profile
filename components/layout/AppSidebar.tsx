'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/app'
import { ROUTES } from '@/lib/constants'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin'],
  },
  {
    label: 'Members',
    href: ROUTES.MEMBERS,
    icon: Users,
    roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  },
  {
    label: 'Import',
    href: ROUTES.IMPORT,
    icon: Upload,
    roles: ['SuperAdmin', 'Admin', 'Masool'],
  },
  {
    label: 'Reports',
    href: ROUTES.REPORTS,
    icon: BarChart3,
    roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  },
  {
    label: 'Forms',
    href: ROUTES.FORMS,
    icon: FileText,
    roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  },
  {
    label: 'Requests',
    href: ROUTES.REQUESTS,
    icon: ClipboardList,
    roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  },
  {
    label: 'Admin',
    href: ROUTES.ADMIN_USERS,
    icon: Settings,
    roles: ['SuperAdmin'],
  },
  {
    label: 'Request Review',
    href: ROUTES.ADMIN_REQUESTS,
    icon: ClipboardCheck,
    roles: ['SuperAdmin'],
  },
]

const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Masool: 'Masool',
  Musaid: 'Musaid',
  Mumin: 'Mumin',
}

interface AppSidebarProps {
  role: Role
  itsNo?: number
  userName?: string
}

export function AppSidebar({ role, itsNo, userName }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(ROUTES.LOGIN)
  }

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col bg-sidebar-bg border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-bg text-sidebar-fg hover:bg-sidebar-accent transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Header / Logo */}
      <div
        className={cn(
          'flex flex-col border-b border-sidebar-border',
          collapsed ? 'items-center px-2 py-4' : 'px-5 py-5'
        )}
      >
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-fg font-bold text-lg select-none">
            M
          </div>
          {!collapsed && (
            <div>
              <p className="text-sidebar-fg font-bold text-base leading-tight">Mumin System</p>
              <p className="text-[11px] leading-tight opacity-50 text-sidebar-fg">
                Community Management
              </p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-sidebar-primary px-2.5 py-0.5 text-xs font-semibold text-sidebar-primary-fg">
              {ROLE_LABELS[role]}
            </span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-colors',
                    collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5 gap-3',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-fg'
                      : 'text-sidebar-fg hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom user area */}
      <div className={cn('border-t border-sidebar-border', collapsed ? 'px-2 py-3' : 'px-3 py-4')}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg text-sidebar-fg hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-fg text-xs font-semibold select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {userName && (
                <p className="text-sidebar-fg text-sm font-medium truncate leading-tight">
                  {userName}
                </p>
              )}
              {itsNo && (
                <p className="text-[11px] truncate leading-tight opacity-50 text-sidebar-fg">
                  ITS: {itsNo}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-fg hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
