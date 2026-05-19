import { createClient } from '@/lib/supabase/server'
import NotificationBell from './NotificationBell'
import { UserMenu } from './UserMenu'
import type { Role } from '@/lib/types/app'

interface TopBarProps {
  role: Role
  its_no: number
}

export async function TopBar({ role, its_no }: TopBarProps) {
  const supabase = await createClient()

  const [{ data: muminData }, { data: notifData }] = await Promise.all([
    supabase.from('mumin').select('name').eq('its_no', its_no).single(),
    supabase
      .from('notifications')
      .select('id, type, title, body, read, related_form_id, created_at')
      .eq('its_no', its_no)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const name = muminData?.name ?? `#${its_no}`
  const initialNotifications = notifData ?? []

  return (
    <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border bg-background">
      {/* {role !== 'Mumin' && <GlobalSearch />} */}
      {role !== 'Mumin'}
      <div className="flex items-center gap-1 ml-auto">
        <UserMenu name={name} role={role} its_no={its_no} />
        <NotificationBell initialNotifications={initialNotifications} />
      </div>
    </div>
  )
}
