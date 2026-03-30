import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  iconBg?: string
  iconColor?: string
  trend?: { value: number; label: string }
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border border-l-4 border-l-primary rounded-lg p-5 shadow-sm flex flex-col gap-1 relative">
      {/* Icon — top-right square */}
      <div className={`absolute top-4 right-4 w-8 h-8 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <span className={`${iconColor} w-4 h-4 flex items-center justify-center`}>{icon}</span>
      </div>

      {/* Title */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pr-10">
        {title}
      </p>

      {/* Value */}
      <p className="text-3xl font-bold text-foreground leading-tight">{value}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}

      {/* Trend */}
      {trend && (
        <p className="text-xs mt-1">
          <span className={trend.value >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%
          </span>{' '}
          <span className="text-muted-foreground">{trend.label}</span>
        </p>
      )}
    </div>
  )
}
