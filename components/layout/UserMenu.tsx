'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, User, KeyRound, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/app'
import { MemberAvatar, MemberIdentity } from '@/components/members/MemberPrimitives'

interface UserMenuProps {
  name: string
  role: Role
  its_no: number
}

export function UserMenu({ name, role, its_no }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted"
      >
        <MemberAvatar name={name} size="xs" />
        <MemberIdentity
          name={name}
          itsNo={its_no}
          size="sm"
          className="max-w-[12rem] text-left"
        />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-background py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-xs text-muted-foreground">{role}</p>
          <div className="my-1 border-t border-border" />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); router.push(`/members/${its_no}`) }}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            My Profile
          </button>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); router.push('/change-password') }}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            Change Password
          </button>
          <div className="my-1 border-t border-border" />
          <button
            role="menuitem"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
