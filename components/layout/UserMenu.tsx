  'use client'

  import * as React from 'react'
  import { useRouter } from 'next/navigation'
  import { ChevronDown, User, KeyRound, LogOut } from 'lucide-react'
  import { createClient } from '@/lib/supabase/client'
  import type { Role } from '@/lib/types/app'

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
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-foreground leading-tight">{name}</span>
            <span className="text-[10px] pt-1 text-primary font-semibold leading-tight">{its_no}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50 py-1">
            <button
              onClick={() => { setOpen(false); router.push(`/members/${its_no}`) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              My Profile
            </button>
            <button
              onClick={() => { setOpen(false); router.push('/change-password') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Change Password
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    )
  }
