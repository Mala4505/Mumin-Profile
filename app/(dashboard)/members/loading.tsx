import { Skeleton } from '@/components/ui/skeleton'
import { LumaSpin } from '@/components/ui/luma-spin'

export default function MembersLoading() {
  return (
    <>
      {/* Full-screen overlay spinner */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
        <LumaSpin size={65} />
      </div>

      {/* Page skeleton behind the overlay */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-6 rounded" />
            <Skeleton className="h-9 flex-1 min-w-48 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="flex gap-2 pt-1 border-t border-border/50">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-44 rounded-lg" />
          </div>
          <div className="hidden md:block">
            <div className="bg-muted/40 border-b border-border px-4 py-3 flex gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-6 px-4 py-3 border-b border-border last:border-0">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="md:hidden divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-10 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
