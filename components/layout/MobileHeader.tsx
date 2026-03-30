'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  LayoutDashboard,
  Users,
  Upload,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/app'
import { ROUTES } from '@/lib/constants'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
    roles: ['SuperAdmin', 'Masool', 'Musaid', 'Mumin'],
  },
  {
    label: 'Members',
    href: ROUTES.MEMBERS,
    icon: Users,
    roles: ['SuperAdmin', 'Masool', 'Musaid'],
  },
  {
    label: 'Import',
    href: ROUTES.IMPORT,
    icon: Upload,
    roles: ['SuperAdmin'],
  },
  {
    label: 'Reports',
    href: ROUTES.REPORTS,
    icon: BarChart3,
    roles: ['SuperAdmin', 'Masool', 'Musaid'],
  },
  {
    label: 'Admin',
    href: ROUTES.ADMIN_USERS,
    icon: Settings,
    roles: ['SuperAdmin'],
  },
]

interface MobileHeaderProps {
  role: Role
  userName?: string
}

export function MobileHeader({ role, userName }: MobileHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)

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
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between bg-white border-b border-border shadow-sm px-4">
      {/* Left: Menu button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center: App name */}
      <span className="text-foreground font-bold text-base tracking-tight">Mumin System</span>

      {/* Right: User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {userName && (
            <>
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile nav sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base select-none">
                M
              </div>
              <SheetTitle className="text-foreground font-bold">Mumin System</SheetTitle>
            </div>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-border px-3 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
