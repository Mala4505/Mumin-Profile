'use client'
import { switchToAdminView } from '@/app/actions/mode'
import { ArrowLeftRight } from 'lucide-react'

export function AdminModeButton() {
  return (
    <form action={switchToAdminView}>
      <button type="submit"
        className="flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-400/25 transition-colors">
        <ArrowLeftRight className="h-3 w-3" />
        Back to Admin
      </button>
    </form>
  )
}
