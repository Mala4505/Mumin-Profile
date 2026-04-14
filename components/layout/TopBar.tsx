import { createClient } from '@/lib/supabase/server'
import NotificationBell from './NotificationBell'
import { UserMenu } from './UserMenu'
import type { SessionUser } from '@/lib/types/app'

interface TopBarProps {
  session: SessionUser
}

export async function TopBar({ session }: TopBarProps) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mumin')
    .select('name')
    .eq('its_no', session.its_no)
    .single()

  const name = data?.name ?? `#${session.its_no}`

  console.log("TopBar session:", session)

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background">
      <div className="flex items-center gap-1 ml-auto">
        <UserMenu name={name} role={session.role} its_no={session.its_no} />
        <NotificationBell />
      </div>
    </div>
  )
}
