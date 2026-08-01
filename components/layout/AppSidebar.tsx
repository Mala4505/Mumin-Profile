'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  FileText,
  FileSearch,
  LineChart,
  ListChecks,
  UserCircle,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role, LoginMode } from '@/lib/types/app'
import { ROUTES } from '@/lib/constants'
import { switchToUserView, switchToAdminView } from '@/app/actions/mode'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin', 'UmoorCoordinator'] },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { label: 'Members', href: ROUTES.MEMBERS, icon: Users, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'] },
      { label: 'Import', href: ROUTES.IMPORT, icon: Upload, roles: ['SuperAdmin', 'Admin', 'Masool'] },
    ],
  },
  {
    label: 'ACTIVITY',
    items: [
      { label: 'Forms', href: ROUTES.FORMS, icon: FileText, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'] },
      { label: 'Requests', href: ROUTES.REQUESTS, icon: ClipboardList, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'] },
      { label: 'Analytics', href: '/analytics', icon: LineChart, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid'] },
      { label: 'Response Explorer', href: ROUTES.REPORTS, icon: FileSearch, roles: ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'UmoorCoordinator'] },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Admin', href: ROUTES.ADMIN_USERS, icon: Settings, roles: ['SuperAdmin'] },
      { label: 'Request Review', href: ROUTES.ADMIN_REQUESTS, icon: ClipboardCheck, roles: ['SuperAdmin'] },
      { label: 'Profile Fields', href: ROUTES.ADMIN_PROFILE_FIELDS, icon: ListChecks, roles: ['SuperAdmin', 'Admin', 'UmoorCoordinator'] },
    ],
  },
]

const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Masool: 'Masool',
  Musaid: 'Musaid',
  Mumin: 'Mumin',
  UmoorCoordinator: 'Umoor Coordinator',
}

interface AppSidebarProps {
  role: Role
  loginMode: LoginMode
}

export function AppSidebar({ role, loginMode }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

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
              <p className="text-sidebar-fg font-bold text-base leading-tight">Masool/Musaid System</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-sidebar-primary px-2.5 py-0.5 text-xs font-semibold text-sidebar-primary-fg">
              {ROLE_LABELS[role]}
            </span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-4">
          {NAV_GROUPS.map((group) => {
            const visibleGroupItems = group.items.filter((item) => item.roles.includes(role))
            if (visibleGroupItems.length === 0) return null
            return (
              <div key={group.label ?? 'root'}>
                {!collapsed && group.label && (
                  <p className="mb-1 px-3 text-[9px] font-semibold tracking-widest uppercase opacity-30 text-sidebar-fg">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleGroupItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            'relative overflow-hidden flex items-center rounded-lg transition-colors',
                            collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5 gap-3',
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary'
                              : 'text-sidebar-fg hover:bg-sidebar-accent'
                          )}
                        >
                          {isActive && !collapsed && (
                            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-full" />
                          )}
                          <Icon className="h-5 w-5 shrink-0" />
                          {!collapsed && (
                            <span className="text-sm font-medium">{item.label}</span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Mode toggle */}
      <div className={cn('px-3 py-2 border-t border-sidebar-border/50', collapsed ? 'px-2' : '')}>
        {!collapsed ? (
          loginMode === 'user' ? (
            <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-2">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-amber-500 mb-1.5">
                User View Active
              </p>
              <form action={switchToAdminView}>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Back to Admin
                </button>
              </form>
            </div>
          ) : (
            <form action={switchToUserView}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-fg opacity-60 hover:opacity-100 hover:bg-sidebar-accent transition-all"
              >
                <UserCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Switch to User View</span>
                <ArrowLeftRight className="h-4 w-4 ml-auto" />
              </button>
            </form>
          )
        ) : (
          loginMode === 'user' ? (
            <div className="flex justify-center">
              <form action={switchToAdminView}>
                <button
                  type="submit"
                  title="Back to Admin"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 hover:bg-amber-400/25 transition-colors"
                >
                  <UserCircle className="h-5 w-5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex justify-center">
              <form action={switchToUserView}>
                <button
                  type="submit"
                  title="Switch to User View"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-fg opacity-60 hover:opacity-100 hover:bg-sidebar-accent transition-all"
                >
                  <UserCircle className="h-5 w-5" />
                </button>
              </form>
            </div>
          )
        )}
      </div>

    </aside>
  )
}
