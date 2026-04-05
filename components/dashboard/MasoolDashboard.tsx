import Link from 'next/link'
import type { MasoolStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'
import SubsectorMuminChart from './charts/SubsectorMuminChart'
import BuildingFlatsChart from './charts/BuildingFlatsChart'

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

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
  </svg>
)

interface Props {
  stats: MasoolStats
}

export default function MasoolDashboard({ stats }: Props) {
  const sectorLabel = stats.sectorNames.join(', ') || 'Unassigned'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {stats.sectorNames.length > 1 ? 'My Sectors' : 'My Sector'}: {sectorLabel}
        </h1>
        <p className="text-muted-foreground mt-1">Sector overview and subsector management</p>
      </div>

      {/* Stat Cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Mumineen"
          value={stats.muminCount}
          subtitle="Across all subsectors"
          icon={<UsersIcon />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Subsectors"
          value={stats.subsectorCount}
          subtitle={`In ${stats.sectorNames.length > 1 ? 'assigned sectors' : sectorLabel}`}
          icon={<LayoutGridIcon />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
        <StatCard
          title="Families"
          value={stats.totalFamilies}
          subtitle="By Sabeel no."
          icon={<UsersIcon />}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
        />
      </div>

      {/* Stat Cards — row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          subtitle="In this sector"
          icon={<BuildingIcon />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Flats"
          value={stats.totalFlats}
          subtitle="By PACI no."
          icon={<BuildingIcon />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Masools in My Sector */}
      {stats.sector_masools.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Masools in My Sector</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ITS No</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                </tr>
              </thead>
              <tbody>
                {stats.sector_masools.map((m, idx) => (
                  <tr key={m.its_no} className={`hover:bg-muted/20 transition-colors ${idx !== stats.sector_masools.length - 1 ? 'border-b border-border' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.its_no}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{ss.subsector_name}</h3>
                    <span className="text-sm font-bold text-primary">{ss.mumin_count}</span>
                  </div>
                  {stats.sectorNames.length > 1 && (
                    <p className="text-xs text-muted-foreground mb-1">{ss.sector_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-2">
                    {ss.mumin_count} member{ss.mumin_count !== 1 ? 's' : ''} · {pct}% of total
                  </p>
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

      {/* Subsector Chart */}
      <SubsectorMuminChart subsectors={stats.subsectors} />

      {/* Buildings */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Buildings</h2>
        {stats.buildings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No buildings found in this sector.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.buildings.map((b) => {
              const pct = stats.totalFlats > 0
                ? Math.round((b.flat_count / stats.totalFlats) * 100)
                : 0
              return (
                <div
                  key={b.building_id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-foreground leading-tight">{b.building_name}</h3>
                    <span className="text-sm font-bold text-primary tabular-nums ml-2 flex-shrink-0">{b.flat_count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {b.subsector_name} · {b.flat_count} flat{b.flat_count !== 1 ? 's' : ''} · {pct}% of sector
                  </p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Buildings Chart */}
      <BuildingFlatsChart buildings={stats.buildings} />

      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          View All Members
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
