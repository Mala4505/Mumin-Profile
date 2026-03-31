import Link from 'next/link'
import type { AdminStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'
import SectorMuminChart from './charts/SectorMuminChart'

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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

const LayoutGridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
)

interface Props {
  stats: AdminStats
}

export default function AdminDashboard({ stats }: Props) {
  const sectorLabel = stats.assignedSectors.map(s => s.sector_name).join(', ') || 'Unassigned'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Admin Dashboard
          </p>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">
            {stats.assignedSectors.length > 1 ? 'My Sectors' : 'My Sector'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{sectorLabel}</p>
        </div>
        <Link
          href="/members"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors self-start"
        >
          View Members →
        </Link>
      </div>

      {/* Stat Cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Sectors"
          value={stats.assignedSectors.length}
          subtitle="Assigned to you"
          icon={<MapPinIcon />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
        <StatCard
          title="Subsectors"
          value={stats.totalSubsectors}
          subtitle="Across all sectors"
          icon={<LayoutGridIcon />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Total Mumineen"
          value={stats.totalMumineen}
          subtitle="In assigned sectors"
          icon={<UsersIcon />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
      </div>

      {/* Stat Cards — row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          subtitle="Registered buildings"
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
        <StatCard
          title="Families"
          value={stats.totalFamilies}
          subtitle="By Sabeel no."
          icon={<UsersIcon />}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
        />
      </div>

      {/* Sector Breakdown Table */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Sector Breakdown</h2>
        {stats.sectorBreakdown.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
            No sectors assigned.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subsectors</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Members</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Buildings</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Flats</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Families</th>
                </tr>
              </thead>
              <tbody>
                {stats.sectorBreakdown.map((s, idx) => (
                  <tr
                    key={s.sector_id}
                    className={`hover:bg-muted/30 transition-colors ${idx !== stats.sectorBreakdown.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">{s.sector_name}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">{s.subsector_count}</td>
                    <td className="px-5 py-3.5 text-right text-foreground tabular-nums">{s.mumin_count.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground hidden sm:table-cell tabular-nums">{s.building_count}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground hidden sm:table-cell tabular-nums">{s.flat_count}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground hidden md:table-cell tabular-nums">{s.family_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Sector Chart */}
      <SectorMuminChart
        sectors={stats.sectorBreakdown.map(s => ({
          sector_name: s.sector_name,
          mumin_count: s.mumin_count,
          flat_count: s.flat_count,
        }))}
      />
    </div>
  )
}
