import Link from 'next/link'
import { Users } from 'lucide-react'
import type { MemberListItem, Role } from '@/lib/types/app'

interface MemberTableProps {
  members: MemberListItem[]
  role: Role
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border border-green-200',
    deceased: 'bg-gray-100 text-gray-500 border border-gray-200',
    relocated: 'bg-blue-100 text-blue-700 border border-blue-200',
    left_community: 'bg-red-100 text-red-700 border border-red-200',
    inactive: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  }
  const labels: Record<string, string> = {
    active: 'Active',
    deceased: 'Deceased',
    relocated: 'Relocated',
    left_community: 'Left Community',
    inactive: 'Inactive',
  }
  const cls = styles[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}

function BaligBadge({ status }: { status: string }) {
  if (status === 'Balig') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        Balig
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
      Ghair Balig
    </span>
  )
}

function GenderPill({ gender }: { gender: 'M' | 'F' }) {
  if (gender === 'M') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
        {/* Mars icon */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="14" r="5" />
          <line x1="19" y1="5" x2="14.14" y2="9.86" />
          <polyline points="15 5 19 5 19 9" />
        </svg>
        Male
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-pink-600 font-medium">
      {/* Venus icon */}
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="5" />
        <line x1="12" y1="14" x2="12" y2="22" />
        <line x1="9" y1="19" x2="15" y2="19" />
      </svg>
      Female
    </span>
  )
}

export function MemberTable({ members, role }: MemberTableProps) {
  const isMumin = role === 'Mumin'
  const isSuperAdmin = role === 'SuperAdmin'
  const isStaff = role !== 'Mumin'

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No members found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Count header */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-medium">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                ITS No
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                Gender
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                Balig
              </th>
              {!isMumin && (
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  Phone
                </th>
              )}
              {isSuperAdmin && (
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  Sector
                </th>
              )}
              {!isMumin && (
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  Subsector
                </th>
              )}
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.its_no}
                className="hover:bg-muted/30 transition-colors border-b border-border last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{member.its_no}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{member.name}</span>
                </td>
                <td className="px-4 py-3">
                  <GenderPill gender={member.gender} />
                </td>
                <td className="px-4 py-3">
                  <BaligBadge status={member.balig_status} />
                </td>
                {!isMumin && (
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{member.phone ?? '—'}</span>
                  </td>
                )}
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{member.sector_name}</span>
                  </td>
                )}
                {!isMumin && (
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{member.subsector_name}</span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={member.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/members/${member.its_no}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-border">
        {members.map((member) => (
          <div key={member.its_no} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{member.name}</p>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">{member.its_no}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <StatusBadge status={member.status} />
                  <BaligBadge status={member.balig_status} />
                  <GenderPill gender={member.gender} />
                </div>
                {isStaff && member.subsector_name && (
                  <p className="text-xs text-muted-foreground mt-1.5">{member.subsector_name}</p>
                )}
              </div>
              <Link
                href={`/members/${member.its_no}`}
                className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-0.5"
              >
                View →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
