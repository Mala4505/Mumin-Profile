import Link from 'next/link'
import type { MusaidStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const MaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5" />
    <path d="m21 3-5.86 5.86" />
    <path d="M15 3h6v6" />
  </svg>
)

const FemaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13v9" />
    <path d="M9 19h6" />
  </svg>
)

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
  stats: MusaidStats
}

export default function MusaidDashboard({ stats }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Subsector: {stats.subsectorName}</h1>
        {stats.sectorName && (
          <p className="text-muted-foreground mt-1">Part of {stats.sectorName} Sector</p>
        )}
      </div>

      {/* Stat Cards — row 1: members */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={stats.muminCount}
          subtitle="In this subsector"
          icon={<UsersIcon />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Males"
          value={stats.maleCount}
          subtitle={`${stats.muminCount > 0 ? Math.round((stats.maleCount / stats.muminCount) * 100) : 0}% of total`}
          icon={<MaleIcon />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Females"
          value={stats.femaleCount}
          subtitle={`${stats.muminCount > 0 ? Math.round((stats.femaleCount / stats.muminCount) * 100) : 0}% of total`}
          icon={<FemaleIcon />}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
        />
        <StatCard
          title="Balig Members"
          value={stats.baligCount}
          subtitle={`${stats.ghairBaligCount} Ghair Balig`}
          icon={<StarIcon />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
      </div>

      {/* Stat Cards — row 2: buildings, flats & families */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          subtitle="In this subsector"
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

      {/* Balig Summary Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-5">Balig vs Ghair Balig</h2>
        <div className="flex items-stretch gap-4">
          <div className="flex-1 bg-secondary/10 rounded-xl p-5 text-center border border-secondary/30">
            <p className="text-4xl font-bold text-foreground">{stats.baligCount}</p>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">Balig</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.muminCount > 0 ? Math.round((stats.baligCount / stats.muminCount) * 100) : 0}%
            </p>
          </div>
          <div className="flex items-center text-muted-foreground font-bold text-xl">vs</div>
          <div className="flex-1 bg-muted rounded-xl p-5 text-center border border-border">
            <p className="text-4xl font-bold text-foreground">{stats.ghairBaligCount}</p>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">Ghair Balig</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.muminCount > 0 ? Math.round((stats.ghairBaligCount / stats.muminCount) * 100) : 0}%
            </p>
          </div>
        </div>
        {/* Combined bar */}
        {stats.muminCount > 0 && (
          <div className="mt-5 h-2.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-secondary rounded-l-full transition-all duration-500"
              style={{ width: `${Math.round((stats.baligCount / stats.muminCount) * 100)}%` }}
            />
            <div
              className="h-full bg-border rounded-r-full transition-all duration-500"
              style={{ width: `${Math.round((stats.ghairBaligCount / stats.muminCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Buildings */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Buildings</h2>
        {stats.buildings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No buildings found in this subsector.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.buildings.map((b) => {
              const pct = stats.totalFlats > 0
                ? Math.round((b.flat_count / stats.totalFlats) * 100)
                : 0
              return (
                <div
                  key={b.building_id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{b.building_name}</h3>
                    <span className="text-sm font-bold text-primary tabular-nums">{b.flat_count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {b.flat_count} flat{b.flat_count !== 1 ? 's' : ''} · {pct}% of subsector
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

      {/* Quick Link */}
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          View All Members
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
