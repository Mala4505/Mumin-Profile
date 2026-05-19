import { Skeleton } from '@/components/ui/skeleton'
import { LumaSpin } from '@/components/ui/luma-spin'

export default function AnalyticsLoading() {
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
        <LumaSpin size={65} />
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <Skeleton className="h-3 w-48 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Widget row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Bar chart skeleton */}
        <div className="bg-card border border-border rounded-lg p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[260px] w-full rounded-md" />
        </div>

        {/* Bottom two charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-[220px] w-full rounded-md" />
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <Skeleton className="h-5 w-44 mb-4" />
            <Skeleton className="h-[220px] w-full rounded-md" />
          </div>
        </div>

        {/* Form rates section */}
        <div className="bg-card border border-border rounded-lg p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
