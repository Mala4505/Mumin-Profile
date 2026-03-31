import Link from 'next/link'
import type { SuperAdminStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'
import SectorMuminChart from './charts/SectorMuminChart'

function timeAgo(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    csv_import: 'CSV Import',
    role_change: 'Role Changed',
    profile_update: 'Profile Updated',
    status_change: 'Status Updated',
  }
  return map[action] ?? action.charAt(0).toUpperCase() + action.slice(1)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).toUpperCase()
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const UserCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
)

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const Building2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
)

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
  </svg>
)

const BarChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  stats: SuperAdminStats
}

export default function SuperAdminDashboard({ stats }: Props) {
  const today = formatDate(new Date())

  return (
    <div className="space-y-8">

      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {today}
          </p>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System-wide statistics across all sectors
          </p>
        </div>

        {/* Quick action buttons — header area */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:border-primary/60 hover:text-primary transition-all shadow-sm"
          >
            <UploadIcon />
            Import
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:border-primary/60 hover:text-primary transition-all shadow-sm"
          >
            <SettingsIcon />
            Users
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:border-primary/60 hover:text-primary transition-all shadow-sm"
          >
            <BarChartIcon />
            Reports
          </Link>
        </div>
      </div>

      {/* ── 2. Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Mumineen"
          value={stats.totalMumineen}
          subtitle="Registered members"
          icon={<UsersIcon />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Active Mumineen"
          value={stats.activeMumineen}
          subtitle={`${stats.totalMumineen > 0 ? Math.round((stats.activeMumineen / stats.totalMumineen) * 100) : 0}% of total`}
          icon={<UserCheckIcon />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Sectors"
          value={stats.totalSectors}
          subtitle={`${stats.totalSubsectors} subsectors`}
          icon={<MapPinIcon />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
        <StatCard
          title="Login Accounts"
          value={stats.totalUsers}
          subtitle="Mumineen with login"
          icon={<UserCheckIcon />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* ── 2b. Building, Flat & Family Stat Cards ──────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          subtitle="Registered buildings"
          icon={<Building2Icon />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Flats"
          value={stats.totalFlats}
          subtitle="By PACI no."
          icon={<Building2Icon />}
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

      {/* ── 3. Quick Actions Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/import"
          className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <UploadIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Import Data</p>
            <p className="text-xs text-muted-foreground">Upload CSV files</p>
          </div>
          <span className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
            <ArrowRightIcon />
          </span>
        </Link>

        <Link
          href="/admin/users"
          className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-md bg-[#0F172A]/10 flex items-center justify-center flex-shrink-0 text-[#0F172A]">
            <SettingsIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Manage Users</p>
            <p className="text-xs text-muted-foreground">Roles &amp; permissions</p>
          </div>
          <span className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
            <ArrowRightIcon />
          </span>
        </Link>

        <Link
          href="/reports"
          className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
            <BarChartIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Export / Reports</p>
            <p className="text-xs text-muted-foreground">Download &amp; analytics</p>
          </div>
          <span className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
            <ArrowRightIcon />
          </span>
        </Link>
      </div>

      {/* ── 4. Sector Overview — Table ──────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Sector Overview</h2>
        {stats.sectors.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
            No sectors found.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sector
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Members
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    Subsectors
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Buildings
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Flats
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell w-40">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.sectors.map((sector, idx) => {
                  const pct =
                    stats.totalMumineen > 0
                      ? Math.min(100, Math.round((sector.mumin_count / stats.totalMumineen) * 100))
                      : 0
                  return (
                    <tr
                      key={sector.sector_id}
                      className={`hover:bg-muted/30 transition-colors ${idx !== stats.sectors.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {sector.sector_name}
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                        {sector.mumin_count.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                        {sector.subsector_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground hidden md:table-cell tabular-nums">
                        {sector.building_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground hidden md:table-cell tabular-nums">
                        {sector.flat_count}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4b. Sector Chart ────────────────────────────────────────────── */}
      <SectorMuminChart sectors={stats.sectors} />

      {/* ── 5. Buildings Overview ───────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Buildings Overview</h2>
        {stats.sectors.every(s => s.building_count === 0) ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
            No buildings found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.sectors.filter(s => s.building_count > 0).map(sector => (
              <div
                key={sector.sector_id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {sector.sector_name}
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{sector.building_count}</p>
                    <p className="text-xs text-muted-foreground">building{sector.building_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary tabular-nums">{sector.flat_count}</p>
                    <p className="text-xs text-muted-foreground">flat{sector.flat_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Recent Activity Feed ─────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Activity</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {stats.recentActivity.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <ActivityIcon />
              </div>
              <p className="text-muted-foreground text-sm">No recent activity found.</p>
            </div>
          ) : (
            stats.recentActivity.map((item) => (
              <div
                key={item.id}
                className="px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 flex items-center gap-4 transition-colors"
              >
                {/* Left: action icon */}
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  <ActivityIcon />
                </div>

                {/* Middle: action + actor */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {formatAction(item.action)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by ITS {item.performed_by_its}
                  </p>
                </div>

                {/* Right: entity badge + time */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600">
                    {item.entity_type}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
