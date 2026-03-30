import type { MasoolStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const LayoutGridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
)

interface Props {
  stats: MasoolStats
}

export default function MasoolDashboard({ stats }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Sector: {stats.sectorName}</h1>
        <p className="text-muted-foreground mt-1">Sector overview and subsector management</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Members"
          value={stats.muminCount}
          subtitle="Across all subsectors"
          icon={<UsersIcon />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Subsectors"
          value={stats.subsectorCount}
          subtitle={`In ${stats.sectorName}`}
          icon={<LayoutGridIcon />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
      </div>

      {/* Subsector Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Subsector Breakdown</h2>
        {stats.subsectors.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No subsectors assigned to this sector yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.subsectors.map((ss) => {
              const pct = stats.muminCount > 0
                ? Math.round((ss.mumin_count / stats.muminCount) * 100)
                : 0
              return (
                <div
                  key={ss.subsector_id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{ss.subsector_name}</h3>
                    <span className="text-sm font-bold text-primary">{ss.mumin_count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {ss.mumin_count} member{ss.mumin_count !== 1 ? 's' : ''} · {pct}% of sector
                  </p>
                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
