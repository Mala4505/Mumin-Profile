import { createClient } from '@/lib/supabase/server'
import NotificationBell from './NotificationBell'
import { UserMenu } from './UserMenu'
import { AdminModeButton } from './AdminModeButton'
import type { Role, LoginMode } from '@/lib/types/app'

interface TopBarProps {
  role: Role
  its_no: number
  /** Resolved once in the dashboard layout and shared with MobileHeader. */
  userName: string
  loginMode: LoginMode
}

export async function TopBar({ role, its_no, userName, loginMode }: TopBarProps) {
  const supabase = await createClient()

  const { data: notifData } = await supabase
    .from('notifications')
    .select('id, type, title, body, read, related_form_id, created_at')
    .eq('its_no', its_no)
    .order('created_at', { ascending: false })
    .limit(20)

  const name = userName
  const initialNotifications = (notifData ?? []).map((n) => ({
    ...n,
    created_at: n.created_at ?? new Date().toISOString(),
  }))

  return (
    <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border bg-background">
      {role !== 'Mumin' && loginMode === 'user' && <AdminModeButton />}
      <div className="flex items-center gap-1 ml-auto">
        <UserMenu name={name} role={role} its_no={its_no} />
        <NotificationBell initialNotifications={initialNotifications} />
      </div>
    </div>
  )
}
