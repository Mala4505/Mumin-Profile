import Link from 'next/link'
import { UserX } from 'lucide-react'

export default function MemberNotFound() {
  return (
    <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <UserX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-1">Member not found</h1>
      <p className="text-muted-foreground text-sm mb-6">
        This ITS number doesn't exist or you don't have access to it.
      </p>
      <Link
        href="/members"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Back to Members
      </Link>
    </div>
  )
}
