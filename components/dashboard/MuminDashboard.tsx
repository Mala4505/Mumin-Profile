import Link from 'next/link'
import type { MuminStats } from '@/lib/dashboard/getStats'
import { MuminPortalTabs } from './MuminPortalTabs'
import {
  BaligPill,
  GenderPill,
  InfoField,
  INFO_GRID,
  MemberAvatar,
  MemberIdentity,
  MemberStatusBadge,
  SectionCard,
  SectionHeader,
} from '@/components/members/MemberPrimitives'
import { PAGE_SHELL } from '@/lib/members/display'
import { cn } from '@/lib/utils'

interface Props {
  stats: MuminStats
}

export default function MuminDashboard({ stats }: Props) {
  return (
    <div className={cn(PAGE_SHELL, 'space-y-5')}>
      {/* Hero Card — mirrors the canonical profile hero (MemberProfileView) */}
      <SectionCard className="p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <MemberAvatar name={stats.name} status={stats.status} size="lg" />

          <div className="min-w-0 flex-1">
            <MemberIdentity
              name={stats.name}
              itsNo={stats.its_no}
              sabeelNo={stats.sabeel_no}
              size="lg"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <MemberStatusBadge status={stats.status} size="md" withDot />
              <GenderPill gender={stats.gender} size="md" />
              <BaligPill status={stats.balig_status} size="md" />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Location Info */}
      <SectionCard className="p-5">
        <SectionHeader title="Location Info" className="mb-4" />
        <div className={INFO_GRID}>
          <InfoField label="Sector" value={stats.sectorName} />
          <InfoField label="Subsector" value={stats.subsectorName} />
          <InfoField label="Building" value={stats.buildingName} />
          <InfoField
            label="Status"
            value={<MemberStatusBadge status={stats.status} withDot />}
          />
          {stats.paciNo && (
            <InfoField
              label="PACI No"
              value={<span className="font-mono">{stats.paciNo}</span>}
            />
          )}
          {(stats.floorNo || stats.flatNo) && (
            <InfoField
              label="Floor / Flat"
              value={`${stats.floorNo ? `Floor ${stats.floorNo}` : '—'}${
                stats.flatNo ? ` / Flat ${stats.flatNo}` : ''
              }`}
            />
          )}
          {stats.landmarkName && (
            <InfoField label="Landmark" value={stats.landmarkName} />
          )}
          <InfoField
            label="Family Members"
            value={`${stats.totalFamilyMembers} member${stats.totalFamilyMembers !== 1 ? 's' : ''}`}
          />
        </div>
      </SectionCard>

      {/* My Profile & My Forms tabs */}
      <MuminPortalTabs itsNo={stats.its_no} />

      {/* View Full Profile Button */}
      <div className="flex justify-center">
        <Link
          href={`/members/${stats.its_no}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
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
