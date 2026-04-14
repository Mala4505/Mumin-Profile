'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  related_form_id?: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {})
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = async (id: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    })
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors text-sm ${
                  n.read ? 'opacity-60' : 'font-medium'
                }`}
                onClick={() => markRead(n.id)}
              >
                <p className="text-foreground">{n.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{n.body}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
