'use client'
import Link from 'next/link'
import type { UmoorCoordinatorStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Users, BookOpen, FileText, ArrowRight, ClipboardList } from 'lucide-react'

interface Props {
  stats: UmoorCoordinatorStats
}

export default function UmoorCoordinatorDashboard({ stats }: Props) {
  const umoorLabel = stats.umoors.map(u => u.name).join(', ') || 'Unassigned'
  const totalForms = stats.umoors.reduce((sum, u) => sum + u.form_count, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {stats.umoors.length > 1 ? 'My Umoors' : 'My Umoor'}: {umoorLabel}
        </h1>
        <p className="text-muted-foreground mt-1">Umoor overview and data coverage</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Mumineen"
          value={stats.totalMumineen}
          subtitle="Across the community"
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Assigned Umoors"
          value={stats.umoors.length}
          subtitle="Categories you manage"
          icon={<BookOpen className="w-5 h-5 text-teal-600" />}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Forms"
          value={totalForms}
          subtitle="In your umoors"
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* Per-umoor Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Umoor Breakdown</h2>
        {stats.umoors.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No umoor categories assigned to you yet. Ask a SuperAdmin to assign
            umoors to your account (changes take effect on next login).
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.umoors.map(u => {
              const maxFillable = u.field_count * stats.totalMumineen
              const pct = maxFillable > 0
                ? Math.min(100, Math.round((u.filled_value_count / maxFillable) * 100))
                : 0
              return (
                <Card key={u.category_id} className="hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{u.name}</span>
                      <span className="text-sm font-bold text-primary">{u.filled_value_count}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {u.field_count} profile field{u.field_count !== 1 ? 's' : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      {u.filled_value_count} filled value{u.filled_value_count !== 1 ? 's' : ''}
                      {maxFillable > 0 ? ` · ${pct}% coverage` : ''}
                    </p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>
                        {u.form_count} form{u.form_count !== 1 ? 's' : ''}
                        {u.form_count > 0 ? ` (${u.published_form_count} published)` : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/members"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          View All Members
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/forms"
          className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-muted/40 transition-colors"
        >
          Manage Forms
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
