import Link from 'next/link'
import type { MuminStats } from '@/lib/dashboard/getStats'
import { MuminPortalTabs } from './MuminPortalTabs'

interface Props {
  stats: MuminStats
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function MuminDashboard({ stats }: Props) {
  const initials = getInitials(stats.name)

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      {/* Hero Card */}
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        {/* Avatar with status ring */}
        <div className="relative inline-block mx-auto mb-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {initials}
          </div>
          <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card ${stats.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{stats.name}</h1>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>ITS: {stats.its_no}</span>
          <span className="text-border">·</span>
          <span>Sabeel: {stats.sabeel_no}</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <StatusBadge status={stats.status} />
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {stats.gender === 'M' ? 'Male' : 'Female'}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary-foreground">
            {stats.balig_status}
          </span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-muted/40">
          <h2 className="text-sm font-semibold text-foreground">Location Info</h2>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border">
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Sector</p>
            <p className="text-sm font-medium text-foreground">{stats.sectorName}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Subsector</p>
            <p className="text-sm font-medium text-foreground">{stats.subsectorName}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Building</p>
            <p className="text-sm font-medium text-foreground">{stats.buildingName}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Status</p>
            <StatusBadge status={stats.status} />
          </div>
          {stats.paciNo && (
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-0.5">PACI No</p>
              <p className="text-sm font-medium font-mono text-foreground">{stats.paciNo}</p>
            </div>
          )}
          {(stats.floorNo || stats.flatNo) && (
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-0.5">Floor / Flat</p>
              <p className="text-sm font-medium text-foreground">
                {stats.floorNo ? `Floor ${stats.floorNo}` : '—'}
                {stats.flatNo ? ` / Flat ${stats.flatNo}` : ''}
              </p>
            </div>
          )}
          {stats.landmarkName && (
            <div className="p-4 col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Landmark</p>
              <p className="text-sm font-medium text-foreground">{stats.landmarkName}</p>
            </div>
          )}
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Family Members</p>
            <p className="text-sm font-medium text-foreground">{stats.totalFamilyMembers} member{stats.totalFamilyMembers !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* My Profile & My Forms tabs */}
      <MuminPortalTabs itsNo={stats.its_no} />

      {/* View Full Profile Button */}
      <div className="flex justify-center">
        <Link
          href={`/members/${stats.its_no}`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          View Full Profile
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
