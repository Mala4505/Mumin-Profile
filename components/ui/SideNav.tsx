'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/types/app'
import { ROUTES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SideNavProps {
  role: Role
}

export function SideNav({ role }: SideNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: ROUTES.MEMBERS, label: 'Members', show: true },
    { href: ROUTES.IMPORT, label: 'CSV Import', show: role !== 'Mumin' },
    { href: ROUTES.REPORTS, label: 'Reports & Export', show: true },
    { href: ROUTES.ADMIN_USERS, label: 'User Management', show: role === 'SuperAdmin' },
  ].filter(item => item.show)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Mumin System</h1>
        <p className="text-xs text-gray-500 mt-0.5">{role}</p>
      </div>
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
